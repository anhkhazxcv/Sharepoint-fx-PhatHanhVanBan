import { hasSharePointSiteContext, resolveListTitle } from './PhvbMag.configuration';
import { SITE_CONTEXT_ERROR_MESSAGE, toRuntimeMessage } from './PhvbMag.error';
import { phvbRepository } from './PhvbMag.repository';
import type { ICreateRequestInput, IPhvbDocumentContext, IPhvbSiteContext, ITabCounts, IVanBanItem, TabType } from './PhvbMag.models';
import { DEFAULT_TAB_COUNTS } from './PhvbMag.models';

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
  'LinkToFolderOld'
];

interface ILoadTabItemsOptions extends IPhvbSiteContext {
  userEmail: string;
  tab: TabType;
}

interface ICreateRequestOptions extends IPhvbDocumentContext {
  input: ICreateRequestInput;
}

interface ICreateSharePointPayload {
  [fieldName: string]: string;
  Title: string;
  Tenvanban: string;
  SoVanBan: string;
  LoaiYeuCau: string;
  KhoaPhongNguoiTao: string;
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
}

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

function getUserScopedFilter(tab: TabType, userEmail: string): string | undefined {
  const normalizedEmail = userEmail ? escapeODataValue(userEmail) : '';

  switch (tab) {
    case 'YeuCauCuaToi':
      return normalizedEmail ? `EmailNguoiTao eq '${normalizedEmail}'` : 'Id eq 0';
    case 'CapSo':
      return "StatusApproved eq 'Approved' and (SoVanBan eq null or SoVanBan eq '')";
    default:
      return undefined;
  }
}

function isTodoTab(tab: TabType): boolean {
  return tab === 'ViecCanLam';
}

function matchesApproverField(value: string | undefined, userEmail: string): boolean {
  return Boolean(userEmail && value && value.toLowerCase().indexOf(userEmail.toLowerCase()) > -1);
}

function filterItemsForTab(items: IVanBanItem[], tab: TabType, userEmail: string): IVanBanItem[] {
  if (!isTodoTab(tab)) {
    return items;
  }

  return items.filter(item => matchesApproverField(item.PheDuyet, userEmail));
}

function formatCurrentDate(): string {
  return new Date().toLocaleDateString('vi-VN');
}

function mapCreateRequestPayload(options: ICreateRequestOptions): ICreateSharePointPayload {
  const today = formatCurrentDate();

  return {
    Title: options.input.title,
    Tenvanban: options.input.title,
    SoVanBan: options.input.code,
    LoaiYeuCau: options.input.type,
    KhoaPhongNguoiTao: options.input.department,
    NgayPhatHanh: today,
    HieuLucTu: options.input.hieuLucTu || today,
    HieuLucDen: options.input.hieuLucDen || 'Vô thời hạn',
    TomTatNoiDung: options.input.summary,
    NguoiTao: options.userDisplayName || '',
    EmailNguoiTao: options.userEmail || '',
    LienHe: options.input.contact,
    StatusApproved: 'Pending',
    ThuMucBanHanh: options.input.folder,
    NoiLuuBanCung: options.input.noiLuu
  };
}

export class PhvbDocumentsService {
  public async loadTabCounts(options: IPhvbDocumentContext): Promise<ITabCounts> {
    if (!hasSharePointSiteContext(options)) {
      return DEFAULT_TAB_COUNTS;
    }

    const [todoItems, myRequestItems, adminItems, capSoItems] = await Promise.all([
      phvbRepository.fetchItems({
        ...options,
        selectFields: ['Id', 'PheDuyet'],
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

  public async createRequest(options: ICreateRequestOptions): Promise<void> {
    if (!hasSharePointSiteContext(options)) {
      throw new Error(SITE_CONTEXT_ERROR_MESSAGE);
    }

    await phvbRepository.createItem({
      ...options,
      payload: mapCreateRequestPayload(options)
    });
  }

  public getRuntimeErrorMessage(error: unknown, listTitle?: string): string {
    return toRuntimeMessage(error, resolveListTitle(listTitle));
  }
}

export const phvbDocumentsService = new PhvbDocumentsService();