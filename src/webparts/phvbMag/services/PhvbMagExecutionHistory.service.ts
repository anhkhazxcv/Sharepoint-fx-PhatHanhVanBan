import { HISTORY_LIST_TITLE } from '../config/PhvbMag.configuration';
import type { TrangThaiThucHien } from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { escapeODataValue } from '../infrastructure/SharePointSite.utils';
import { validateHistoryNoiDung } from '../utils/PhvbMagHistoryPolicy.utils';
import {
  HISTORY_QUEUE_KEY_PREFIX,
  HISTORY_WRITE_WARNING_MESSAGE,
  resolveHistoryRetryDelayMs,
  waitHistoryRetry
} from '../utils/PhvbMagHistoryRetry.utils';
import { ToastService } from '../utils/ToastService';
import { toRuntimeMessage } from './PhvbMag.error';
import type { IPhvbLogContext, IPhvbSiteContext } from '../models/PhvbMag.models';

export interface IAppendHistoryInput {
  idYeuCau: string;
  trangThaiThucHien: TrangThaiThucHien;
  noiDung?: string;
  department?: string;
  isComment?: boolean;
}

export interface IAppendHistoryContext extends IPhvbSiteContext {
  logContext?: IPhvbLogContext;
  userDisplayName?: string;
  userEmail?: string;
}

export type AppendHistoryResult = { status: 'created'; id: number } | { status: 'queued' };

interface IQueuedHistoryItem {
  idYeuCau: string;
  trangThaiThucHien: TrangThaiThucHien;
  noiDung: string;
  department: string;
  isComment: boolean;
  userDisplayName: string;
  userEmail: string;
  queuedAt: string;
}

const inFlightHistoryWrites = new Map<string, Promise<AppendHistoryResult>>();

export function getExecutionHistoryRuntimeErrorMessage(error: unknown): string {
  return toRuntimeMessage(error, HISTORY_LIST_TITLE);
}

function getQueueKey(idYeuCau: string): string {
  return `${HISTORY_QUEUE_KEY_PREFIX}${idYeuCau}`;
}

function resolveQueueIdFromKey(key: string): string | undefined {
  if (key.indexOf(HISTORY_QUEUE_KEY_PREFIX) !== 0) {
    return undefined;
  }

  return key.substring(HISTORY_QUEUE_KEY_PREFIX.length);
}

function getInFlightKey(item: IQueuedHistoryItem): string {
  return [
    item.idYeuCau,
    item.trangThaiThucHien,
    item.userEmail,
    item.noiDung,
    String(item.isComment)
  ].join('|');
}

function readQueue(idYeuCau: string): IQueuedHistoryItem[] {
  try {
    const raw = window.sessionStorage.getItem(getQueueKey(idYeuCau));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as IQueuedHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(idYeuCau: string, items: IQueuedHistoryItem[]): void {
  try {
    if (items.length === 0) {
      window.sessionStorage.removeItem(getQueueKey(idYeuCau));
      return;
    }

    window.sessionStorage.setItem(getQueueKey(idYeuCau), JSON.stringify(items));
  } catch {
    // sessionStorage có thể bị chặn (private mode, quota...) — không chặn luồng chính.
  }
}

function buildPayload(
  context: IAppendHistoryContext,
  item: IQueuedHistoryItem
): Record<string, string | boolean | number> {
  return {
    Title: item.trangThaiThucHien,
    IDYeuCau: item.idYeuCau,
    User_ThucHien: item.userDisplayName || context.userDisplayName || '',
    Email_ThucHien: item.userEmail || context.userEmail || '',
    PhongBan_ThucHien: item.department,
    TrangThai_ThucHien: item.trangThaiThucHien,
    NoiDung: item.noiDung,
    IsComment: item.isComment
  };
}

async function existsRecentDuplicate(context: IAppendHistoryContext, item: IQueuedHistoryItem): Promise<boolean> {
  const email = (item.userEmail || context.userEmail || '').trim();

  if (!email) {
    return false;
  }

  const sinceIso = new Date(Date.now() - 60000).toISOString();
  const filter = [
    `IDYeuCau eq '${escapeODataValue(item.idYeuCau)}'`,
    `TrangThai_ThucHien eq '${escapeODataValue(item.trangThaiThucHien)}'`,
    `Email_ThucHien eq '${escapeODataValue(email)}'`,
    `Created ge datetime'${sinceIso}'`
  ].join(' and ');

  try {
    const items = await phvbRepository.fetchItems({
      ...context,
      listTitle: HISTORY_LIST_TITLE,
      selectFields: ['Id'],
      filter,
      top: 1
    });

    return items.length > 0;
  } catch {
    // Query lỗi thì cứ coi như không trùng — thà ghi trùng còn hơn mất record.
    return false;
  }
}

async function writeHistoryItem(context: IAppendHistoryContext, item: IQueuedHistoryItem): Promise<number> {
  return phvbRepository.createItem({
    ...context,
    logContext: context.logContext,
    listTitle: HISTORY_LIST_TITLE,
    payload: buildPayload(context, item)
  });
}

async function writeHistoryItemWithRetry(context: IAppendHistoryContext, item: IQueuedHistoryItem): Promise<number> {
  let lastError: unknown;

  try {
    return await writeHistoryItem(context, item);
  } catch (error) {
    lastError = error;
  }

  for (let attemptIndex = 0; attemptIndex < 3; attemptIndex += 1) {
    const retryDelayMs = resolveHistoryRetryDelayMs(lastError, attemptIndex);

    if (retryDelayMs === undefined) {
      break;
    }

    await waitHistoryRetry(retryDelayMs);

    try {
      return await writeHistoryItem(context, item);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Không ghi được lịch sử thực hiện.');
}

function queueHistoryItem(item: IQueuedHistoryItem): void {
  const queue = readQueue(item.idYeuCau);
  const inQueue = queue.some(queuedItem => getInFlightKey(queuedItem) === getInFlightKey(item));

  if (!inQueue) {
    queue.push(item);
  }

  writeQueue(item.idYeuCau, queue);
}

/**
 * Thử ghi lại các item còn tồn trong sessionStorage queue của idYeuCau này.
 * Best-effort — không throw; item còn lỗi tiếp tục nằm trong queue để thử lại lần sau
 * (lần gọi appendHistory tiếp theo, hoặc lần mount web part tiếp theo).
 */
export async function drainHistoryQueue(context: IAppendHistoryContext, idYeuCau: string): Promise<void> {
  const queue = readQueue(idYeuCau);

  if (queue.length === 0) {
    return;
  }

  const remaining: IQueuedHistoryItem[] = [];

  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];

    try {
      const isDuplicate = await existsRecentDuplicate(context, item);

      if (!isDuplicate) {
        await writeHistoryItemWithRetry(context, item);
      }
    } catch {
      remaining.push(item);
    }
  }

  writeQueue(idYeuCau, remaining);
}

export async function drainAllHistoryQueues(context: IAppendHistoryContext): Promise<void> {
  const idYeuCauList: string[] = [];

  try {
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      const idYeuCau = key ? resolveQueueIdFromKey(key) : undefined;

      if (idYeuCau) {
        idYeuCauList.push(idYeuCau);
      }
    }
  } catch {
    return;
  }

  for (let index = 0; index < idYeuCauList.length; index += 1) {
    await drainHistoryQueue(context, idYeuCauList[index]).catch(() => undefined);
  }
}

/**
 * Nơi DUY NHẤT được phép ghi vào list LichSuThucHien (chặn bằng ESLint rule
 * no-restricted-imports trên HISTORY_LIST_TITLE ở mọi file khác).
 *
 * Không throw khi ghi thất bại vì lỗi mạng/SharePoint — nghiệp vụ chính (đã
 * lưu trước đó) không được coi là thất bại chỉ vì history lỗi. Lỗi gốc đã tự
 * động được ghi vào list Log qua ensureSharePointResponseOk/phvbLogService;
 * item được đẩy vào sessionStorage để tự ghi lại ở lần gọi/mount kế tiếp.
 *
 * Chỉ throw cho lỗi hợp lệ hoá (idYeuCau rỗng, NoiDung vi phạm policy) — đây
 * là lỗi lập trình cần được phát hiện ngay, không phải lỗi mạng.
 */
export async function appendHistory(
  context: IAppendHistoryContext,
  input: IAppendHistoryInput
): Promise<AppendHistoryResult> {
  const idYeuCau = (input.idYeuCau || '').trim();
  const trangThaiThucHien = input.trangThaiThucHien;

  if (!idYeuCau) {
    throw new Error(`appendHistory: thiếu idYeuCau (trangThaiThucHien="${trangThaiThucHien || ''}").`);
  }

  if (!trangThaiThucHien) {
    throw new Error(`appendHistory: thiếu TrangThai_ThucHien (idYeuCau="${idYeuCau}").`);
  }

  const noiDung = validateHistoryNoiDung(trangThaiThucHien, input.noiDung || '');

  await drainHistoryQueue(context, idYeuCau).catch(() => undefined);

  const item: IQueuedHistoryItem = {
    idYeuCau,
    trangThaiThucHien,
    noiDung,
    department: (input.department || '').trim(),
    isComment: input.isComment === true,
    userDisplayName: (context.userDisplayName || '').trim(),
    userEmail: (context.userEmail || '').trim(),
    queuedAt: new Date().toISOString()
  };
  const inFlightKey = getInFlightKey(item);
  const existingWrite = inFlightHistoryWrites.get(inFlightKey);

  if (existingWrite) {
    return existingWrite;
  }

  const writePromise = (async (): Promise<AppendHistoryResult> => {
    try {
      const id = await writeHistoryItemWithRetry(context, item);
      return { status: 'created', id };
    } catch {
      queueHistoryItem(item);
      ToastService.warning(HISTORY_WRITE_WARNING_MESSAGE);
      return { status: 'queued' };
    }
  })();

  inFlightHistoryWrites.set(inFlightKey, writePromise);

  try {
    return await writePromise;
  } finally {
    if (inFlightHistoryWrites.get(inFlightKey) === writePromise) {
      inFlightHistoryWrites.delete(inFlightKey);
    }
  }
}

export async function deleteHistoryItems(
  context: IAppendHistoryContext,
  itemIds: ReadonlyArray<number>
): Promise<void> {
  const uniqueIds = itemIds.filter((id, index, array) => array.indexOf(id) === index && id > 0);

  await Promise.all(uniqueIds.map(itemId => phvbRepository.deleteItem({
    ...context,
    listTitle: HISTORY_LIST_TITLE,
    itemId
  })));
}
