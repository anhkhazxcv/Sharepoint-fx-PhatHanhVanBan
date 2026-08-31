import { hasSharePointSiteContext, REQUEST_STATUS, resolveListTitle, TRANG_THAI_THUC_HIEN, TAB_COUNTS_CACHE_STALE_MS, DMVL_DEFAULT_SO_VAN_BAN } from '../config/PhvbMag.configuration';
import { SITE_CONTEXT_ERROR_MESSAGE, toRuntimeMessage } from './PhvbMag.error';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { phvbAttachmentService } from './PhvbMagAttachment.service';
import { appendHistory } from './PhvbMagExecutionHistory.service';
import { phvbWorkflowWriteService } from './PhvbMagWorkflowWrite.service';
import { generateRequestReferenceId } from '../utils/PhvbMagRequestId.utils';
import { buildDateOnlyCorrectionFormValues, sharePointRestNull, toSharePointDateOnlyIso } from '../utils/PhvbMagDateTime.utils';
import { joinWithLimit, resolveAttachmentDisplayNames } from '../utils/PhvbMagHistoryText.utils';
import { sanitizeRequestInputForSave, getRequestTypeFormRules } from '../utils/PhvbMagRequestForm.utils';
import {
  IWorkflowStageParticipants,
  resolveDocumentStatusAfterSkippingEmptyStages,
  resolveStatusForWorkflowStage
} from '../utils/PhvbMagWorkflowState.utils';
import type { IAllUserWorkflowItem, ICreateRequestInput, IPhvbDirectoryUser, IPhvbDocumentContext, IPhvbLogContext, IPhvbSiteContext, ITabCounts, IVanBanItem, RequestSubmissionFlow, SaveRequestMode, TabType } from '../models/PhvbMag.models';
import { DEFAULT_TAB_COUNTS } from '../models/PhvbMag.models';

const DOCUMENT_SELECT_FIELDS: ReadonlyArray<string> = [
  'Id',
  'Title',
  'Tenvanban',
  'NgayPhatHanh',
  'HieuLucTu',
  'HieuLucDen',
  'NoiLuuBanCung',
  'TomTatNoiDung',
  'NguoiTao',
  'EmailNguoiTao',
  'KhoaPhongNguoiTao',
  'IdYeuCau',
  'PheDuyet',
  'LienHe',
  'StatusApproved',
  'LoaiYeuCau',
  'Created',
  'ThamDinh',
  'NguoiGopY',
  'SoVanBan',
  'TenVanBan_ENG',
  'DC_CapSo_Name',
  'DC_CapSo_Email',
  'Loai_SLA',
  'Date_GopY',
  'Date_ThamDinh',
  'Date_PheDuyet',
  'ThuMucBanHanh',
  'IDFolderOld',
  'IdVanBanChinh',
  'GhiChuChoThamDinh',
  'IsSendMailNotify',
  'EmailNhanBanHanh',
  'SubjectBanHanh',
  'BodyEmail'
];

export const RELEASE_SELECT_FIELDS = DOCUMENT_SELECT_FIELDS;

const TAB_COUNT_SELECT_FIELDS: ReadonlyArray<string> = [
  'Id',
  'StatusApproved',
  'EmailNguoiTao',
  'PheDuyet',
  'NguoiGopY',
  'ThamDinh'
];

const TAB_COUNT_FETCH_TOP = 5000;

interface ILoadTabItemsOptions extends IPhvbSiteContext {
  userEmail: string;
  tab: TabType;
}

interface ICreateRequestOptions extends IPhvbDocumentContext {
  input: ICreateRequestInput;
  saveMode: SaveRequestMode;
  submissionFlow?: RequestSubmissionFlow;
  directoryUsers?: ReadonlyArray<IPhvbDirectoryUser>;
  logContext?: IPhvbLogContext;
}

interface IUpdateRequestOptions extends ICreateRequestOptions {
  itemId: number;
  existingIdYeuCau: string;
}

interface ICreateSharePointPayload {
  [fieldName: string]: string | boolean | number | undefined;
  Title: string;
  Tenvanban: string;
  SoVanBan: string;
  LoaiYeuCau: string;
  KhoaPhongNguoiTao: string;
  PheDuyet: string;
  NgayPhatHanh: string;
  HieuLucTu: string;
  HieuLucDen?: string;
  TomTatNoiDung: string;
  NguoiTao: string;
  EmailNguoiTao: string;
  LienHe: string;
  StatusApproved: string;
  ThuMucBanHanh: string;
  NoiLuuBanCung: string;

  // Redesigned form columns:
  TenVanBan_ENG: string;
  Loai_SLA: string;
  NguoiGopY: string;
  Date_GopY?: string;
  ThamDinh: string;
  Date_ThamDinh?: string;
  Date_PheDuyet?: string;
  IsSendMailNotify: boolean;
  GhiChuChoThamDinh: string;
  IdYeuCau: string;
}

const OPTIONAL_DATETIME_FIELDS: ReadonlyArray<'HieuLucDen' | 'Date_GopY' | 'Date_ThamDinh' | 'Date_PheDuyet'> = [
  'HieuLucDen',
  'Date_GopY',
  'Date_ThamDinh',
  'Date_PheDuyet'
];

const DATE_ONLY_CORRECTION_FIELDS: ReadonlyArray<string> = [
  'NgayPhatHanh',
  'HieuLucTu',
  'HieuLucDen',
  'Date_GopY',
  'Date_ThamDinh',
  'Date_PheDuyet'
];

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

function getUserScopedFilter(tab: TabType, userEmail: string): string | undefined {
  const normalizedEmail = userEmail ? escapeODataValue(userEmail) : '';

  switch (tab) {
    case 'YeuCauCuaToi':
      return normalizedEmail ? `EmailNguoiTao eq '${normalizedEmail}'` : 'Id eq 0';
    case 'CapSo':
      return `StatusApproved eq '${escapeODataValue(REQUEST_STATUS.CHO_CAP_SO)}'`;
    default:
      return undefined;
  }
}

function isTodoTab(tab: TabType): boolean {
  return tab === 'ViecCanLam';
}

function matchesUserInField(value: string | undefined, userEmail: string): boolean {
  return Boolean(userEmail && value && value.toLowerCase().indexOf(userEmail.toLowerCase()) > -1);
}

function isTodoItemForUser(item: IVanBanItem, userEmail: string): boolean {
  const status = (item.StatusApproved || '').trim();

  if (status === REQUEST_STATUS.BAN_HANH || status === 'Approved') {
    return false;
  }

  return (
    matchesUserInField(item.PheDuyet, userEmail) ||
    matchesUserInField(item.NguoiGopY, userEmail) ||
    matchesUserInField(item.ThamDinh, userEmail)
  );
}

function normalizeUserEmail(email?: string): string {
  return (email || '').trim().toLowerCase();
}

function isCreatorEmailMatch(item: IVanBanItem, userEmail: string): boolean {
  const normalizedUserEmail = normalizeUserEmail(userEmail);

  if (!normalizedUserEmail) {
    return false;
  }

  return normalizeUserEmail(item.EmailNguoiTao) === normalizedUserEmail;
}

function isItemInTabForCount(item: IVanBanItem, tab: TabType, userEmail: string): boolean {
  const status = (item.StatusApproved || '').trim();

  switch (tab) {
    case 'ViecCanLam':
      return isTodoItemForUser(item, userEmail);
    case 'YeuCauCuaToi':
      return isCreatorEmailMatch(item, userEmail);
    case 'CapSo':
      return status === REQUEST_STATUS.CHO_CAP_SO;
    default:
      return false;
  }
}

function countItemsByTab(items: IVanBanItem[], userEmail: string): ITabCounts {
  const counts: ITabCounts = {
    viecCanLam: 0,
    yeuCauCuaToi: 0,
    capSo: 0,
    qlVanBan: items.length,
    admin: items.length
  };

  items.forEach(item => {
    if (isItemInTabForCount(item, 'ViecCanLam', userEmail)) {
      counts.viecCanLam += 1;
    }

    if (isItemInTabForCount(item, 'YeuCauCuaToi', userEmail)) {
      counts.yeuCauCuaToi += 1;
    }

    if (isItemInTabForCount(item, 'CapSo', userEmail)) {
      counts.capSo += 1;
    }
  });

  return counts;
}

function filterItemsForTab(items: IVanBanItem[], tab: TabType, userEmail: string): IVanBanItem[] {
  if (!isTodoTab(tab)) {
    return items;
  }

  return items.filter(item => isTodoItemForUser(item, userEmail));
}

interface ITabCountsCacheEntry {
  counts: ITabCounts;
  fetchedAt: number;
}

const tabCountsCacheByKey = new Map<string, ITabCountsCacheEntry>();
const tabCountsPromiseByKey = new Map<string, Promise<ITabCounts>>();

function resolveTabCountsCacheKey(options: IPhvbDocumentContext): string {
  return [
    options.sourceSiteUrl || '',
    options.currentWebUrl || '',
    options.siteCollectionUrl || '',
    resolveListTitle(options.listTitle),
    options.userEmail || ''
  ].join('|');
}

function isTabCountsCacheFresh(entry: ITabCountsCacheEntry | undefined): boolean {
  if (!entry) {
    return false;
  }

  return Date.now() - entry.fetchedAt < TAB_COUNTS_CACHE_STALE_MS;
}

export function invalidateTabCountsCache(cacheKey?: string): void {
  if (cacheKey) {
    tabCountsCacheByKey.delete(cacheKey);
    tabCountsPromiseByKey.delete(cacheKey);
    return;
  }

  tabCountsCacheByKey.clear();
  tabCountsPromiseByKey.clear();
}

async function fetchTabCountsUncached(options: IPhvbDocumentContext): Promise<ITabCounts> {
  const items = await phvbRepository.fetchItems({
    ...options,
    selectFields: TAB_COUNT_SELECT_FIELDS,
    top: TAB_COUNT_FETCH_TOP,
    orderBy: 'Id desc'
  });

  return countItemsByTab(items, options.userEmail);
}

function shouldIncludeFolderOldId(requestType: ICreateRequestInput['requestType']): boolean {
  return requestType === 'Điều chỉnh' || requestType === 'Thu hồi';
}

function buildWorkflowParticipantSnapshot(input: ICreateRequestInput): IWorkflowStageParticipants {
  const rules = getRequestTypeFormRules(input.requestType);
  const toPlaceholder = (email: string): IAllUserWorkflowItem => ({
    Id: 0,
    Email_ThucHien: email
  });

  return {
    gopY: rules.includeGopYThamDinhWorkflow ? input.nguoiGopY.map(toPlaceholder) : [],
    thamDinh: rules.includeGopYThamDinhWorkflow ? input.nguoiThamDinh.map(toPlaceholder) : [],
    pheDuyet: input.approvalUsers.map(toPlaceholder)
  };
}

function resolveInitialSubmitStatus(input: ICreateRequestInput): string {
  const rules = getRequestTypeFormRules(input.requestType);

  if (!rules.includeGopYThamDinhWorkflow) {
    return resolveStatusForWorkflowStage('pheduyet');
  }

  const skippedStatus = resolveDocumentStatusAfterSkippingEmptyStages(
    REQUEST_STATUS.DANG_GOP_Y,
    buildWorkflowParticipantSnapshot(input),
    input.requestType
  );

  return skippedStatus || REQUEST_STATUS.DANG_GOP_Y;
}

function omitUndefinedPayloadFields(payload: ICreateSharePointPayload): Record<string, string | boolean | number> {
  const nextPayload: Record<string, string | boolean | number> = {};
  const keys = Object.keys(payload);

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const value = payload[key];
    if (value !== undefined) {
      nextPayload[key] = value;
    }
  }

  return nextPayload;
}

function applyDateTimeClears(payload: Record<string, string | boolean | number>): Record<string, string | boolean | number> {
  const nextPayload: Record<string, string | boolean | number> = { ...payload };

  OPTIONAL_DATETIME_FIELDS.forEach(field => {
    if (nextPayload[field] === undefined) {
      nextPayload[field] = sharePointRestNull();
    }
  });

  return nextPayload;
}

function mapCreateRequestPayload(options: ICreateRequestOptions, requestReferenceId: string): ICreateSharePointPayload {
  const input = sanitizeRequestInputForSave(options.input);
  const todayIso = toSharePointDateOnlyIso(new Date()) || '1970-01-01T00:00:00';
  const requestType = input.requestType || input.type;
  const isDmvlFlow = options.submissionFlow === 'dmvl';
  const statusApproved = options.saveMode === 'draft'
    ? REQUEST_STATUS.BAN_NHAP
    : isDmvlFlow
      ? REQUEST_STATUS.CHO_BAN_HANH
      : resolveInitialSubmitStatus(input);
  const payload: ICreateSharePointPayload = {
    IdYeuCau: requestReferenceId,
    Title: input.title,
    Tenvanban: input.title,
    SoVanBan: isDmvlFlow ? DMVL_DEFAULT_SO_VAN_BAN : (input.code || ''),
    LoaiYeuCau: isDmvlFlow ? 'Tạo mới' : requestType,
    KhoaPhongNguoiTao: input.department || '',
    PheDuyet: isDmvlFlow ? '' : input.approvalUsers.join('; '),
    NgayPhatHanh: todayIso,
    HieuLucTu: toSharePointDateOnlyIso(input.hieuLucTu) || todayIso,
    HieuLucDen: toSharePointDateOnlyIso(input.hieuLucDen),
    TomTatNoiDung: input.summary,
    NguoiTao: options.userDisplayName || '',
    EmailNguoiTao: options.userEmail || '',
    LienHe: (input.contact || '').trim() || options.userDisplayName || options.userEmail || '',
    StatusApproved: statusApproved,
    ThuMucBanHanh: input.folderLuuTru || input.folder,
    NoiLuuBanCung: input.noiLuu || '',

    TenVanBan_ENG: input.titleEn || '',
    Loai_SLA: isDmvlFlow ? '' : (input.loaiSla || ''),
    NguoiGopY: isDmvlFlow ? '' : (input.nguoiGopY ? input.nguoiGopY.join('; ') : ''),
    Date_GopY: isDmvlFlow ? undefined : toSharePointDateOnlyIso(input.deadlineGopY),
    ThamDinh: isDmvlFlow ? '' : (input.nguoiThamDinh ? input.nguoiThamDinh.join('; ') : ''),
    Date_ThamDinh: isDmvlFlow ? undefined : toSharePointDateOnlyIso(input.deadlineThamDinh),
    Date_PheDuyet: isDmvlFlow ? undefined : toSharePointDateOnlyIso(input.deadlinePheDuyet),
    IsSendMailNotify: isDmvlFlow ? true : input.isSendMailNotify,
    GhiChuChoThamDinh: isDmvlFlow ? '' : (input.ghiChuThamDinh || '')
  };

  if (shouldIncludeFolderOldId(requestType) && input.idFolderOld) {
    payload.IDFolderOld = input.idFolderOld;
  }

  return payload;
}

export class PhvbDocumentsService {
  public async loadTabCounts(options: IPhvbDocumentContext, bypassCache: boolean = false): Promise<ITabCounts> {
    if (!hasSharePointSiteContext(options)) {
      return DEFAULT_TAB_COUNTS;
    }

    const cacheKey = resolveTabCountsCacheKey(options);

    if (!bypassCache) {
      const cachedEntry = tabCountsCacheByKey.get(cacheKey);

      if (isTabCountsCacheFresh(cachedEntry)) {
        return { ...cachedEntry!.counts };
      }

      const pendingPromise = tabCountsPromiseByKey.get(cacheKey);

      if (pendingPromise) {
        const counts = await pendingPromise;
        return { ...counts };
      }
    }

    const requestPromise = fetchTabCountsUncached(options).then(counts => {
      tabCountsCacheByKey.set(cacheKey, {
        counts,
        fetchedAt: Date.now()
      });
      return counts;
    });

    tabCountsPromiseByKey.set(cacheKey, requestPromise);

    try {
      const counts = await requestPromise;
      return { ...counts };
    } finally {
      if (tabCountsPromiseByKey.get(cacheKey) === requestPromise) {
        tabCountsPromiseByKey.delete(cacheKey);
      }
    }
  }

  public invalidateTabCountsCache(cacheKey?: string): void {
    invalidateTabCountsCache(cacheKey);
  }

  public async loadTabItems(options: ILoadTabItemsOptions): Promise<IVanBanItem[]> {
    if (!hasSharePointSiteContext(options)) {
      return [];
    }

    if (options.tab === 'ThuVienTaiLieu' || options.tab === 'MoiBanHanh' || options.tab === 'HuongDan') {
      return [];
    }

    const items = await phvbRepository.fetchItems({
      ...options,
      selectFields: DOCUMENT_SELECT_FIELDS,
      filter: getUserScopedFilter(options.tab, options.userEmail),
      top: 5000,
      orderBy: 'Id desc'
    });

    return filterItemsForTab(items, options.tab, options.userEmail);
  }

  public async createRequest(options: ICreateRequestOptions, duplicateFromIdYeuCau?: string): Promise<string> {
    if (!hasSharePointSiteContext(options)) {
      throw new Error(SITE_CONTEXT_ERROR_MESSAGE);
    }

    const requestReferenceId = generateRequestReferenceId();
    const payload = omitUndefinedPayloadFields(mapCreateRequestPayload(options, requestReferenceId));

    const createdId = await phvbRepository.createItem({
      ...options,
      logContext: options.logContext,
      payload
    });

    const dateCorrections = buildDateOnlyCorrectionFormValues(payload, DATE_ONLY_CORRECTION_FIELDS);

    if (dateCorrections.length > 0) {
      await phvbRepository.updateItemFieldValues({
        ...options,
        logContext: options.logContext,
        itemId: createdId,
        formValues: dateCorrections
      });
    }

    if (duplicateFromIdYeuCau) {
      await this.copyDuplicatedAttachments(options, requestReferenceId);
    }

    await this.writeWorkflowAndAttachments(options, requestReferenceId, false, Boolean(duplicateFromIdYeuCau));

    return requestReferenceId;
  }

  private async copyDuplicatedAttachments(
    options: ICreateRequestOptions,
    targetRequestReferenceId: string
  ): Promise<void> {
    const rawInput = options.input;
    const rules = getRequestTypeFormRules(rawInput.requestType);

    if (!rules.includeAttachmentsOnSave) {
      return;
    }

    const removedIds = rawInput.removedAttachmentIds || [];
    const keptTaiLieu = (rawInput.existingTaiLieuAttachments || []).filter(item => removedIds.indexOf(item.id) === -1);
    const keptBieuMau = (rawInput.existingBieuMauAttachments || []).filter(item => removedIds.indexOf(item.id) === -1);

    if (keptTaiLieu.length === 0 && keptBieuMau.length === 0) {
      return;
    }

    await phvbAttachmentService.copyRequestFiles(options, {
      targetRequestReferenceId,
      taiLieu: keptTaiLieu,
      bieuMau: keptBieuMau
    });
  }

  public async updateRequest(options: IUpdateRequestOptions): Promise<string> {
    if (!hasSharePointSiteContext(options)) {
      throw new Error(SITE_CONTEXT_ERROR_MESSAGE);
    }

    const fullPayload = mapCreateRequestPayload(options, options.existingIdYeuCau);
    const updatePayload = applyDateTimeClears(omitUndefinedPayloadFields(fullPayload));
    delete updatePayload.NgayPhatHanh;
    delete updatePayload.NguoiTao;
    delete updatePayload.EmailNguoiTao;

    await phvbRepository.updateItem({
      ...options,
      logContext: options.logContext,
      itemId: options.itemId,
      payload: updatePayload
    });

    const dateCorrections = buildDateOnlyCorrectionFormValues(updatePayload, DATE_ONLY_CORRECTION_FIELDS);

    if (dateCorrections.length > 0) {
      await phvbRepository.updateItemFieldValues({
        ...options,
        logContext: options.logContext,
        itemId: options.itemId,
        formValues: dateCorrections
      });
    }

    await this.writeWorkflowAndAttachments(options, options.existingIdYeuCau, true);

    return options.existingIdYeuCau;
  }

  private resolveRemovedAttachmentNames(input: ICreateRequestInput): string[] {
    const removedIds = input.removedAttachmentIds || [];
    const allExisting = (input.existingTaiLieuAttachments || []).concat(input.existingBieuMauAttachments || []);
    const matched = removedIds.map(id => allExisting.filter(item => item.id === id)[0] || { id, name: '' });

    return resolveAttachmentDisplayNames(matched);
  }

  private resolveUploadedAttachmentNames(input: ICreateRequestInput): string[] {
    return resolveAttachmentDisplayNames(input.taiLieuFiles.concat(input.bieuMauFiles));
  }

  private async syncAttachments(
    options: ICreateRequestOptions,
    requestReferenceId: string,
    skipRemoval: boolean = false
  ): Promise<void> {
    const input = sanitizeRequestInputForSave(options.input);
    const removedIds = skipRemoval ? [] : (input.removedAttachmentIds || []);

    if (removedIds.length > 0) {
      const removedNames = this.resolveRemovedAttachmentNames(input);
      await phvbAttachmentService.deleteRequestFiles(options, removedIds);
      await appendHistory(
        { ...options, logContext: options.logContext },
        {
          idYeuCau: requestReferenceId,
          trangThaiThucHien: TRANG_THAI_THUC_HIEN.XOA_TAI_LIEU,
          noiDung: joinWithLimit(removedNames, { moreLabel: 'tệp khác' }),
          department: input.department || '',
          isComment: false
        }
      );
    }

    const hasNewFiles = input.taiLieuFiles.length > 0 || input.bieuMauFiles.length > 0;
    if (hasNewFiles) {
      const uploadedNames = this.resolveUploadedAttachmentNames(input);
      await phvbAttachmentService.uploadRequestFiles({
        ...options,
        requestReferenceId,
        input
      });
      await appendHistory(
        { ...options, logContext: options.logContext },
        {
          idYeuCau: requestReferenceId,
          trangThaiThucHien: TRANG_THAI_THUC_HIEN.THEM_TAI_LIEU,
          noiDung: joinWithLimit(uploadedNames, { moreLabel: 'tệp khác' }),
          department: input.department || '',
          isComment: false
        }
      );
    }
  }

  private async writeWorkflowAndAttachments(
    options: ICreateRequestOptions,
    requestReferenceId: string,
    isUpdate: boolean = false,
    skipAttachmentRemoval: boolean = false
  ): Promise<void> {
    const input = sanitizeRequestInputForSave(options.input);
    const normalizedOptions = { ...options, input };

    await phvbWorkflowWriteService.createWorkflowRecords({
      ...normalizedOptions,
      requestReferenceId,
      creatorDisplayName: options.userDisplayName,
      creatorEmail: options.userEmail,
      directoryUsers: options.directoryUsers || [],
      saveMode: options.saveMode,
      submissionFlow: options.submissionFlow,
      isUpdate
    });

    const hasAttachmentChanges =
      (!skipAttachmentRemoval && (input.removedAttachmentIds || []).length > 0) ||
      input.taiLieuFiles.length > 0 ||
      input.bieuMauFiles.length > 0;

    if (hasAttachmentChanges) {
      await this.syncAttachments(normalizedOptions, requestReferenceId, skipAttachmentRemoval);
    }
  }

  public getRuntimeErrorMessage(error: unknown, listTitle?: string): string {
    return toRuntimeMessage(error, resolveListTitle(listTitle));
  }
}

export const phvbDocumentsService = new PhvbDocumentsService();