import { HISTORY_LIST_TITLE } from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { formatCurrentExecutionDateTime } from '../utils/PhvbMagDateTime.utils';
import type { IPhvbLogContext, IPhvbSiteContext } from '../models/PhvbMag.models';

export interface ICreateExecutionHistoryInput {
  idYeuCau: string;
  historyStatus: string;
  noiDung?: string;
  department?: string;
  isComment?: boolean;
  userDisplayName?: string;
  userEmail?: string;
}

interface IExecutionHistoryContext extends IPhvbSiteContext {
  logContext?: IPhvbLogContext;
  userDisplayName?: string;
  userEmail?: string;
}

async function createHistoryItemWithoutIsComment(
  context: IExecutionHistoryContext,
  payload: Record<string, string | boolean | number>
): Promise<void> {
  const payloadWithoutIsComment: Record<string, string | boolean | number> = { ...payload };
  delete payloadWithoutIsComment.IsComment;

  await phvbRepository.createItem({
    ...context,
    logContext: context.logContext,
    listTitle: HISTORY_LIST_TITLE,
    payload: payloadWithoutIsComment
  });
}

export async function createExecutionHistoryRecord(
  context: IExecutionHistoryContext,
  input: ICreateExecutionHistoryInput
): Promise<void> {
  const performedAt = formatCurrentExecutionDateTime();
  const historyStatus = input.historyStatus.trim();
  const idYeuCau = input.idYeuCau.trim();

  if (!idYeuCau || !historyStatus) {
    return;
  }

  const payload: Record<string, string | boolean | number> = {
    Title: historyStatus,
    IDYeuCau: idYeuCau,
    User_ThucHien: (input.userDisplayName || context.userDisplayName || '').trim(),
    Email_ThucHien: (input.userEmail || context.userEmail || '').trim(),
    PhongBan_ThucHien: (input.department || '').trim(),
    Ngay_ThucHien: performedAt,
    TrangThai_ThucHien: historyStatus,
    NoiDung: (input.noiDung || '').trim(),
    IsComment: input.isComment === true
  };

  try {
    await phvbRepository.createItem({
      ...context,
      logContext: context.logContext,
      listTitle: HISTORY_LIST_TITLE,
      payload
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : '';
    if (/IsComment/i.test(details)) {
      await createHistoryItemWithoutIsComment(context, payload);
      return;
    }

    throw error;
  }
}
