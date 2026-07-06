import { hasSharePointSiteContext, REQUEST_STATUS, resolveListTitle } from '../config/PhvbMag.configuration';
import { SITE_CONTEXT_ERROR_MESSAGE, toRuntimeMessage } from './PhvbMag.error';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { phvbAttachmentService } from './PhvbMagAttachment.service';
import { phvbWorkflowWriteService } from './PhvbMagWorkflowWrite.service';
import { generateRequestReferenceId } from '../utils/PhvbMagRequestId.utils';
import { sanitizeRequestInputForSave, getRequestTypeFormRules } from '../utils/PhvbMagRequestForm.utils';
import {
  IWorkflowStageParticipants,
  resolveDocumentStatusAfterSkippingEmptyStages,
  resolveStatusForWorkflowStage
} from '../utils/PhvbMagWorkflowState.utils';
import type { IAllUserWorkflowItem, ICreateRequestInput, IPhvbDirectoryUser, IPhvbDocumentContext, IPhvbSiteContext, ITabCounts, IVanBanItem, SaveRequestMode, TabType } from '../models/PhvbMag.models';
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
  'NgayTaoYeuCau',
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
  'IsCreateFolderExpire',
  'ThuMucBanHanh',
  'LinkToFolderOld',
  'GhiChuChoThamDinh',
  'IsSendMailNotify'
];

export const RELEASE_SELECT_FIELDS = DOCUMENT_SELECT_FIELDS;

interface ILoadTabItemsOptions extends IPhvbSiteContext {
  userEmail: string;
  tab: TabType;
}

interface ICreateRequestOptions extends IPhvbDocumentContext {
  input: ICreateRequestInput;
  saveMode: SaveRequestMode;
  directoryUsers?: ReadonlyArray<IPhvbDirectoryUser>;
}

interface IUpdateRequestOptions extends ICreateRequestOptions {
  itemId: number;
  existingIdYeuCau: string;
}

interface ICreateSharePointPayload {
  [fieldName: string]: string | boolean | number;
  Title: string;
  Tenvanban: string;
  SoVanBan: string;
  LoaiYeuCau: string;
  KhoaPhongNguoiTao: string;
  PheDuyet: string;
  NgayPhatHanh: string;
  HieuLucTu: string;
  HieuLucDen: string;
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
  Date_GopY: string;
  ThamDinh: string;
  Date_ThamDinh: string;
  Date_PheDuyet: string;
  IsSendMailNotify: boolean;
  GhiChuChoThamDinh: string;
  NgayTaoYeuCau: string;
  IdYeuCau: string;
}

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

function getUserScopedFilter(tab: TabType, userEmail: string): string | undefined {
  const normalizedEmail = userEmail ? escapeODataValue(userEmail) : '';

  switch (tab) {
    case 'YeuCauCuaToi':
      return normalizedEmail
        ? `EmailNguoiTao eq '${normalizedEmail}' and StatusApproved ne '${escapeODataValue(REQUEST_STATUS.BAN_NHAP)}'`
        : 'Id eq 0';
    case 'BanNhap':
      return normalizedEmail
        ? `StatusApproved eq '${escapeODataValue(REQUEST_STATUS.BAN_NHAP)}' and EmailNguoiTao eq '${normalizedEmail}'`
        : 'Id eq 0';
    case 'CapSo':
      return `StatusApproved eq '${escapeODataValue(REQUEST_STATUS.DA_CAP_SO)}' and (SoVanBan eq null or SoVanBan eq '')`;
    default:
      return undefined;
  }
}

function isTodoTab(tab: TabType): boolean {
  return tab === 'TrangChu';
}

function matchesUserInField(value: string | undefined, userEmail: string): boolean {
  return Boolean(userEmail && value && value.toLowerCase().indexOf(userEmail.toLowerCase()) > -1);
}

function isTodoItemForUser(item: IVanBanItem, userEmail: string): boolean {
  return (
    matchesUserInField(item.PheDuyet, userEmail) ||
    matchesUserInField(item.NguoiGopY, userEmail) ||
    matchesUserInField(item.ThamDinh, userEmail)
  );
}

function filterItemsForTab(items: IVanBanItem[], tab: TabType, userEmail: string): IVanBanItem[] {
  if (!isTodoTab(tab)) {
    return items;
  }

  return items.filter(item => isTodoItemForUser(item, userEmail));
}

function formatCurrentDate(): string {
  return new Date().toLocaleDateString('vi-VN');
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

function mapCreateRequestPayload(options: ICreateRequestOptions, requestReferenceId: string): ICreateSharePointPayload {
  const input = sanitizeRequestInputForSave(options.input);
  const today = formatCurrentDate();
  const requestType = input.requestType || input.type;
  const statusApproved = options.saveMode === 'draft'
    ? REQUEST_STATUS.BAN_NHAP
    : resolveInitialSubmitStatus(input);
  const payload: ICreateSharePointPayload = {
    IdYeuCau: requestReferenceId,
    Title: input.title,
    Tenvanban: input.title,
    SoVanBan: input.code || '',
    LoaiYeuCau: requestType, // Map LoaiYeuCau to 'Viết mới' / 'Điều chỉnh' / 'Thu hồi'
    KhoaPhongNguoiTao: input.department || '',
    PheDuyet: input.approvalUsers.join('; '),
    NgayPhatHanh: today,
    NgayTaoYeuCau: today,
    HieuLucTu: input.hieuLucTu || today,
    HieuLucDen: input.hieuLucDen || 'Vô thời hạn',
    TomTatNoiDung: input.summary,
    NguoiTao: options.userDisplayName || '',
    EmailNguoiTao: options.userEmail || '',
    LienHe: input.contact || '',
    StatusApproved: statusApproved,
    ThuMucBanHanh: input.folderLuuTru || input.folder, // Map to new storage folder
    NoiLuuBanCung: input.noiLuu || '',

    // Redesigned form columns mapping:
    TenVanBan_ENG: input.titleEn || '',
    Loai_SLA: input.loaiSla || '',
    NguoiGopY: input.nguoiGopY ? input.nguoiGopY.join('; ') : '',
    Date_GopY: input.deadlineGopY || '',
    ThamDinh: input.nguoiThamDinh ? input.nguoiThamDinh.join('; ') : '',
    Date_ThamDinh: input.deadlineThamDinh || '',
    Date_PheDuyet: input.deadlinePheDuyet || '',
    IsSendMailNotify: input.isSendMailNotify,
    GhiChuChoThamDinh: input.ghiChuThamDinh || ''
  };

  if (shouldIncludeFolderOldId(requestType) && input.idFolderOld) {
    payload.IDFolderOld = input.idFolderOld;
  }

  return payload;
}

export class PhvbDocumentsService {
  public async loadTabCounts(options: IPhvbDocumentContext): Promise<ITabCounts> {
    if (!hasSharePointSiteContext(options)) {
      return DEFAULT_TAB_COUNTS;
    }

    const [todoItems, myRequestItems, banNhapItems, qlVanBanItems, capSoItems] = await Promise.all([
      phvbRepository.fetchItems({
        ...options,
        selectFields: ['Id', 'PheDuyet', 'NguoiGopY', 'ThamDinh'],
        top: 5000
      }),
      phvbRepository.fetchItems({
        ...options,
        selectFields: ['Id'],
        filter: getUserScopedFilter('YeuCauCuaToi', options.userEmail),
        top: 5000
      }),
      phvbRepository.fetchItems({
        ...options,
        selectFields: ['Id'],
        filter: getUserScopedFilter('BanNhap', options.userEmail),
        top: 5000
      }),
      phvbRepository.fetchItems({
        ...options,
        selectFields: ['Id'],
        top: 5000
      }),
      phvbRepository.fetchItems({
        ...options,
        selectFields: ['Id'],
        filter: getUserScopedFilter('CapSo', options.userEmail),
        top: 5000
      })
    ]);

    return {
      trangChu: filterItemsForTab(todoItems, 'TrangChu', options.userEmail).length,
      yeuCauCuaToi: myRequestItems.length,
      banNhap: banNhapItems.length,
      capSo: capSoItems.length,
      qlVanBan: qlVanBanItems.length,
      admin: qlVanBanItems.length
    };
  }

  public async loadTabItems(options: ILoadTabItemsOptions): Promise<IVanBanItem[]> {
    if (!hasSharePointSiteContext(options)) {
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

  public async createRequest(options: ICreateRequestOptions): Promise<string> {
    if (!hasSharePointSiteContext(options)) {
      throw new Error(SITE_CONTEXT_ERROR_MESSAGE);
    }

    const requestReferenceId = generateRequestReferenceId();

    await phvbRepository.createItem({
      ...options,
      payload: mapCreateRequestPayload(options, requestReferenceId)
    });

    await this.writeWorkflowAndAttachments(options, requestReferenceId);

    return requestReferenceId;
  }

  public async updateRequest(options: IUpdateRequestOptions): Promise<string> {
    if (!hasSharePointSiteContext(options)) {
      throw new Error(SITE_CONTEXT_ERROR_MESSAGE);
    }

    const fullPayload = mapCreateRequestPayload(options, options.existingIdYeuCau);
    const updatePayload: Record<string, string | boolean | number> = { ...fullPayload };
    delete updatePayload.NgayTaoYeuCau;
    delete updatePayload.NgayPhatHanh;
    delete updatePayload.NguoiTao;
    delete updatePayload.EmailNguoiTao;

    await phvbRepository.updateItem({
      ...options,
      itemId: options.itemId,
      payload: updatePayload
    });

    await this.writeWorkflowAndAttachments(options, options.existingIdYeuCau);

    return options.existingIdYeuCau;
  }

  private async syncAttachments(
    options: ICreateRequestOptions,
    requestReferenceId: string
  ): Promise<void> {
    const input = sanitizeRequestInputForSave(options.input);
    const removedIds = input.removedAttachmentIds || [];

    if (removedIds.length > 0) {
      await phvbAttachmentService.deleteRequestFiles(options, removedIds);
    }

    const hasNewFiles = input.taiLieuFiles.length > 0 || input.bieuMauFiles.length > 0;
    if (hasNewFiles) {
      await phvbAttachmentService.uploadRequestFiles({
        ...options,
        requestReferenceId,
        input
      });
    }
  }

  private async writeWorkflowAndAttachments(
    options: ICreateRequestOptions,
    requestReferenceId: string
  ): Promise<void> {
    const input = sanitizeRequestInputForSave(options.input);
    const normalizedOptions = { ...options, input };

    await phvbWorkflowWriteService.createWorkflowRecords({
      ...normalizedOptions,
      requestReferenceId,
      creatorDisplayName: options.userDisplayName,
      creatorEmail: options.userEmail,
      directoryUsers: options.directoryUsers || [],
      saveMode: options.saveMode
    });

    const hasAttachmentChanges =
      (input.removedAttachmentIds || []).length > 0 ||
      input.taiLieuFiles.length > 0 ||
      input.bieuMauFiles.length > 0;

    if (hasAttachmentChanges) {
      await this.syncAttachments(normalizedOptions, requestReferenceId);
    }
  }

  public getRuntimeErrorMessage(error: unknown, listTitle?: string): string {
    return toRuntimeMessage(error, resolveListTitle(listTitle));
  }
}

export const phvbDocumentsService = new PhvbDocumentsService();