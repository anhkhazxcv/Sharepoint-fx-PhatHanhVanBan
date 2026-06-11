import { hasSharePointSiteContext, REQUEST_STATUS, resolveListTitle } from '../config/PhvbMag.configuration';
import { SITE_CONTEXT_ERROR_MESSAGE, toRuntimeMessage } from './PhvbMag.error';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { phvbAttachmentService } from './PhvbMagAttachment.service';
import { generateRequestReferenceId } from '../utils/PhvbMagRequestId.utils';
import type { ICreateRequestInput, IPhvbDocumentContext, IPhvbSiteContext, ITabCounts, IVanBanItem, SaveRequestMode, TabType } from '../models/PhvbMag.models';
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
  'GhiChuChoThamDinh'
];

interface ILoadTabItemsOptions extends IPhvbSiteContext {
  userEmail: string;
  tab: TabType;
}

interface ICreateRequestOptions extends IPhvbDocumentContext {
  input: ICreateRequestInput;
  saveMode: SaveRequestMode;
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
  return tab === 'ViecCanLam';
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

function mapCreateRequestPayload(options: ICreateRequestOptions, requestReferenceId: string): ICreateSharePointPayload {
  const today = formatCurrentDate();
  const requestType = options.input.requestType || options.input.type;
  const statusApproved = options.saveMode === 'draft' ? REQUEST_STATUS.BAN_NHAP : REQUEST_STATUS.DANG_GOP_Y;
  const payload: ICreateSharePointPayload = {
    IdYeuCau: requestReferenceId,
    Title: options.input.title,
    Tenvanban: options.input.title,
    SoVanBan: options.input.code || '',
    LoaiYeuCau: requestType, // Map LoaiYeuCau to 'Viết mới' / 'Điều chỉnh' / 'Thu hồi'
    KhoaPhongNguoiTao: options.input.department || '',
    PheDuyet: options.input.approvalUsers.join('; '),
    NgayPhatHanh: today,
    NgayTaoYeuCau: today,
    HieuLucTu: options.input.hieuLucTu || today,
    HieuLucDen: options.input.hieuLucDen || 'Vô thời hạn',
    TomTatNoiDung: options.input.summary,
    NguoiTao: options.userDisplayName || '',
    EmailNguoiTao: options.userEmail || '',
    LienHe: options.input.contact || '',
    StatusApproved: statusApproved,
    ThuMucBanHanh: options.input.folderLuuTru || options.input.folder, // Map to new storage folder
    NoiLuuBanCung: options.input.noiLuu || '',

    // Redesigned form columns mapping:
    TenVanBan_ENG: options.input.titleEn || '',
    Loai_SLA: options.input.loaiSla || '',
    NguoiGopY: options.input.nguoiGopY ? options.input.nguoiGopY.join('; ') : '',
    Date_GopY: options.input.deadlineGopY || '',
    ThamDinh: options.input.nguoiThamDinh ? options.input.nguoiThamDinh.join('; ') : '',
    Date_ThamDinh: options.input.deadlineThamDinh || '',
    Date_PheDuyet: options.input.deadlinePheDuyet || '',
    IsSendMailNotify: options.input.isSendMailNotify,
    GhiChuChoThamDinh: options.input.ghiChuThamDinh || ''
  };

  if (shouldIncludeFolderOldId(requestType) && options.input.idFolderOld) {
    payload.IDFolderOld = options.input.idFolderOld;
  }

  return payload;
}

export class PhvbDocumentsService {
  public async loadTabCounts(options: IPhvbDocumentContext): Promise<ITabCounts> {
    if (!hasSharePointSiteContext(options)) {
      return DEFAULT_TAB_COUNTS;
    }

    const [todoItems, myRequestItems, adminItems, capSoItems] = await Promise.all([
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
      viecCanLam: filterItemsForTab(todoItems, 'ViecCanLam', options.userEmail).length,
      yeuCauCuaToi: myRequestItems.length,
      admin: adminItems.length,
      capSo: capSoItems.length
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

    const hasFilesToUpload = options.input.taiLieuFiles.length > 0 || options.input.bieuMauFiles.length > 0;
    if (hasFilesToUpload) {
      await phvbAttachmentService.uploadRequestFiles({
        ...options,
        requestReferenceId,
        input: options.input
      });
    }

    return requestReferenceId;
  }

  public getRuntimeErrorMessage(error: unknown, listTitle?: string): string {
    return toRuntimeMessage(error, resolveListTitle(listTitle));
  }
}

export const phvbDocumentsService = new PhvbDocumentsService();