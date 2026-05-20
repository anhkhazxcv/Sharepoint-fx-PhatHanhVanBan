import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import type { ICreateRequestInput, ITabCounts, IVanBanItem, TabType } from './PhvbMag.types';
import { DEFAULT_TAB_COUNTS } from './PhvbMag.types';

const DEFAULT_LIST_TITLE = 'InDoc_Release';
const SELECT_FIELDS = [
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

export class SharePointRequestError extends Error {
  public readonly status: number;
  public readonly requestUrl: string;
  public readonly details: string;

  public constructor(message: string, status: number, requestUrl: string, details: string) {
    super(message);
    this.status = status;
    this.requestUrl = requestUrl;
    this.details = details;
  }
}

interface IBaseRequestOptions {
  currentWebUrl: string;
  siteCollectionUrl: string;
  sourceSiteUrl?: string;
  listTitle?: string;
  spHttpClient: SPHttpClient;
}

interface IFetchCountsOptions extends IBaseRequestOptions {
  userEmail: string;
}

interface IFetchItemsOptions extends IBaseRequestOptions {
  userEmail: string;
  tab: TabType;
}

interface ICreateItemOptions extends IBaseRequestOptions {
  userDisplayName: string;
  userEmail: string;
  input: ICreateRequestInput;
}

function normalizeSiteUrl(value: string): string {
  return value.replace(/\/$/, '');
}

function getResolvedListTitle(listTitle?: string): string {
  return listTitle && listTitle.trim() ? listTitle.trim() : DEFAULT_LIST_TITLE;
}

function getItemsEndpoint(siteUrl: string, listTitle?: string): string {
  return `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(getResolvedListTitle(listTitle))}')/items`;
}

function getCandidateSiteUrls(options: IBaseRequestOptions): string[] {
  const candidates = [options.sourceSiteUrl, options.currentWebUrl, options.siteCollectionUrl]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map(normalizeSiteUrl);

  const unique: string[] = [];
  candidates.forEach(candidate => {
    if (unique.indexOf(candidate) === -1) {
      unique.push(candidate);
    }
  });

  return unique;
}

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

function getUserScopedFilter(tab: TabType, userEmail: string): string {
  const normalizedEmail = userEmail ? escapeODataValue(userEmail) : '';

  switch (tab) {
    case 'YeuCauCuaToi':
      return normalizedEmail ? `$filter=EmailNguoiTao eq '${normalizedEmail}'` : '$filter=Id eq 0';
    case 'CapSo':
      return `$filter=StatusApproved eq 'Approved' and (SoVanBan eq null or SoVanBan eq '')`;
    default:
      return '';
  }
}

function isTodoTab(tab: TabType): boolean {
  return tab === 'ViecCanLam';
}

function matchesApproverField(value: string | undefined, userEmail: string): boolean {
  return Boolean(userEmail && value && value.toLowerCase().indexOf(userEmail.toLowerCase()) > -1);
}

function filterItemsForTab(items: IVanBanItem[], tab: TabType, userEmail: string): IVanBanItem[] {
  if (isTodoTab(tab)) {
    return items.filter(item => matchesApproverField(item.PheDuyet, userEmail));
  }

  return items;
}

function buildSelectQuery(fields: string[]): string {
  return fields.join(',');
}

function extractMissingFieldName(error: unknown): string | undefined {
  if (!(error instanceof SharePointRequestError) || !error.details) {
    return undefined;
  }

  const match = /field or property '([^']+)' does not exist/i.exec(error.details);
  return match ? match[1] : undefined;
}

async function readJson<T>(response: SPHttpClientResponse): Promise<T> {
  return response.json() as Promise<T>;
}

async function ensureOk(response: SPHttpClientResponse, requestUrl: string): Promise<SPHttpClientResponse> {
  if (!response.ok) {
    const details = await response.text();
    throw new SharePointRequestError(
      `SharePoint request failed with status ${response.status}`,
      response.status,
      requestUrl,
      details
    );
  }

  return response;
}

async function runGetRequest(siteUrl: string, listTitle: string, spHttpClient: SPHttpClient, queryString: string): Promise<SPHttpClientResponse> {
  const requestUrl = `${getItemsEndpoint(siteUrl, listTitle)}?${queryString}`;
  const response = await spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
  return ensureOk(response, requestUrl);
}

async function runPostRequest(
  siteUrl: string,
  listTitle: string,
  spHttpClient: SPHttpClient,
  body: string
): Promise<SPHttpClientResponse> {
  const requestUrl = getItemsEndpoint(siteUrl, listTitle);
  const response = await spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
    body,
    headers: {
      accept: 'application/json;odata=nometadata',
      'content-type': 'application/json;odata=nometadata',
      'odata-version': ''
    }
  });

  return ensureOk(response, requestUrl);
}

async function tryAcrossCandidateSites<T>(
  options: IBaseRequestOptions,
  runner: (siteUrl: string, listTitle: string) => Promise<T>
): Promise<T> {
  const candidates = getCandidateSiteUrls(options);
  const listTitle = getResolvedListTitle(options.listTitle);
  let lastError: unknown = null;

  if (candidates.length === 0) {
    throw new Error('Missing SharePoint site context.');
  }

  for (let index = 0; index < candidates.length; index += 1) {
    try {
      return await runner(candidates[index], listTitle);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to resolve SharePoint data source.');
}

export async function fetchTabCounts(
  options: IFetchCountsOptions
): Promise<ITabCounts> {
  const candidates = getCandidateSiteUrls(options);
  if (candidates.length === 0) {
    return DEFAULT_TAB_COUNTS;
  }

  return tryAcrossCandidateSites(options, async (siteUrl, listTitle) => {
    const countQueries = {
      viecCanLam: '$select=Id,PheDuyet&$top=5000',
      yeuCauCuaToi: `${getUserScopedFilter('YeuCauCuaToi', options.userEmail)}&$select=Id&$top=5000`,
      admin: '$select=Id&$top=5000',
      capSo: `${getUserScopedFilter('CapSo', options.userEmail)}&$select=Id&$top=5000`
    };

    const [todoResponse, myRequestResponse, adminResponse, capSoResponse] = await Promise.all([
      runGetRequest(siteUrl, listTitle, options.spHttpClient, countQueries.viecCanLam),
      runGetRequest(siteUrl, listTitle, options.spHttpClient, countQueries.yeuCauCuaToi),
      runGetRequest(siteUrl, listTitle, options.spHttpClient, countQueries.admin),
      runGetRequest(siteUrl, listTitle, options.spHttpClient, countQueries.capSo)
    ]);

    const [todoData, myRequestData, adminData, capSoData] = await Promise.all([
      readJson<{ value?: IVanBanItem[] }>(todoResponse),
      readJson<{ value?: IVanBanItem[] }>(myRequestResponse),
      readJson<{ value?: IVanBanItem[] }>(adminResponse),
      readJson<{ value?: IVanBanItem[] }>(capSoResponse)
    ]);

    return {
      viecCanLam: todoData.value ? todoData.value.filter(item => matchesApproverField(item.PheDuyet, options.userEmail)).length : 0,
      yeuCauCuaToi: myRequestData.value ? myRequestData.value.length : 0,
      admin: adminData.value ? adminData.value.length : 0,
      capSo: capSoData.value ? capSoData.value.length : 0
    };
  });
}

export async function fetchTabItems(
  options: IFetchItemsOptions
): Promise<IVanBanItem[]> {
  const candidates = getCandidateSiteUrls(options);
  if (candidates.length === 0) {
    return [];
  }

  const baseQueryParts: string[] = [];
  const filterQuery = getUserScopedFilter(options.tab, options.userEmail);

  if (filterQuery) {
    baseQueryParts.push(filterQuery);
  }

  baseQueryParts.push('$top=5000');
  baseQueryParts.push('$orderby=Id desc');

  return tryAcrossCandidateSites(options, async (siteUrl, listTitle) => {
    let selectFields = SELECT_FIELDS.slice();

    while (selectFields.length > 0) {
      const queryParts = baseQueryParts.slice();
      queryParts.splice(filterQuery ? 1 : 0, 0, `$select=${buildSelectQuery(selectFields)}`);

      try {
        const response = await runGetRequest(siteUrl, listTitle, options.spHttpClient, queryParts.join('&'));
        const data = await readJson<{ value?: IVanBanItem[] }>(response);
        return filterItemsForTab(data.value || [], options.tab, options.userEmail);
      } catch (error) {
        const missingFieldName = extractMissingFieldName(error);

        if (missingFieldName && selectFields.indexOf(missingFieldName) > -1) {
          selectFields = selectFields.filter(fieldName => fieldName !== missingFieldName);
          continue;
        }

        throw error;
      }
    }

    return [];
  });
}

export async function createRequestItem(
  options: ICreateItemOptions
): Promise<void> {
  const candidates = getCandidateSiteUrls(options);
  if (candidates.length === 0) {
    throw new Error('Missing SharePoint site context.');
  }

  const today = new Date().toLocaleDateString('vi-VN');
  const body = {
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

  await tryAcrossCandidateSites(options, async (siteUrl, listTitle) => {
    await runPostRequest(siteUrl, listTitle, options.spHttpClient, JSON.stringify(body));
    return undefined;
  });
}