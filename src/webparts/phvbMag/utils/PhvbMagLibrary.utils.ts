import type { LibraryBrowseMode } from '../models/PhvbMag.models';
import { getSiteOrigin } from '../infrastructure/SharePointSite.utils';

export interface ILibraryRouteState {
  mode: LibraryBrowseMode;
  folderId?: number;
  query?: string;
  page: number;
}

const LIBRARY_TAB_PREFIX = '/tab/ThuVienTaiLieu';

export function parseLibraryRoute(pathname: string, search: string): ILibraryRouteState | undefined {
  if (pathname.indexOf(LIBRARY_TAB_PREFIX) !== 0) {
    return undefined;
  }

  const remainder = pathname.substring(LIBRARY_TAB_PREFIX.length);
  const params = new URLSearchParams(search);
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);

  if (!remainder || remainder === '/') {
    return { mode: 'all', page };
  }

  if (remainder.indexOf('/all') === 0) {
    return { mode: 'all', page };
  }

  const folderMatch = remainder.match(/^\/folder\/(\d+)/);
  if (folderMatch) {
    return {
      mode: 'folder',
      folderId: parseInt(folderMatch[1], 10),
      page
    };
  }

  const searchMatch = remainder.match(/^\/search/);
  if (searchMatch) {
    const query = (params.get('q') || '').trim();
    return {
      mode: 'search',
      query,
      page
    };
  }

  return { mode: 'all', page };
}

export function buildLibraryAllPath(page: number): string {
  const pageQuery = page > 1 ? `?page=${page}` : '';
  return `${LIBRARY_TAB_PREFIX}/all${pageQuery}`;
}

export function buildLibraryFolderPath(folderId: number, page: number): string {
  const pageQuery = page > 1 ? `?page=${page}` : '';
  return `${LIBRARY_TAB_PREFIX}/folder/${folderId}${pageQuery}`;
}

export function buildLibrarySearchPath(query: string, page: number): string {
  const params = new URLSearchParams();
  params.set('q', query);
  if (page > 1) {
    params.set('page', `${page}`);
  }
  return `${LIBRARY_TAB_PREFIX}/search?${params.toString()}`;
}

export function escapeKqlText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .trim();
}

/**
 * Path managed property stores absolute URL (DAV:href). Build absolute library path for KQL.
 * @see https://learn.microsoft.com/en-us/sharepoint/technical-reference/crawled-and-managed-properties-overview
 */
export function buildLibrarySearchAbsolutePath(siteUrl: string, libraryRootPath: string): string {
  const normalizedRoot = libraryRootPath.replace(/\/$/, '').trim();

  if (!normalizedRoot) {
    return '';
  }

  if (/^https?:\/\//i.test(normalizedRoot)) {
    return normalizedRoot;
  }

  const origin = getSiteOrigin(siteUrl);
  const path = normalizedRoot.indexOf('/') === 0 ? normalizedRoot : `/${normalizedRoot}`;
  return `${origin}${path}`;
}

/**
 * KQL uses only MS Queryable properties: Path, Filename, Title + free-text.
 * Does not use Contents: (Queryable=No) or contents:/Content: (not in schema).
 * Omits IsDocument so folders (IsDocument=0) are included like SharePoint site search.
 */
export function buildLibrarySearchKql(
  siteUrl: string,
  libraryRootPath: string,
  query?: string
): string {
  const absolutePath = buildLibrarySearchAbsolutePath(siteUrl, libraryRootPath);
  const pathClause = absolutePath
    ? `Path:"${escapeKqlText(absolutePath)}/*"`
    : '';
  const trimmedQuery = (query || '').trim();

  if (!trimmedQuery) {
    return pathClause || '*';
  }

  const escaped = escapeKqlText(trimmedQuery);
  const token = escaped.indexOf(' ') >= 0 ? `"${escaped}"` : escaped;
  const textClause = `(Filename:${token}* OR Title:${token}* OR ${token})`;

  return pathClause
    ? `${pathClause} AND ${textClause}`
    : textClause;
}

export function formatViewCount(value?: number): string | undefined {
  if (value === undefined || value === null || isNaN(value)) {
    return undefined;
  }

  return `${value} lượt xem`;
}

export type LibraryFileTypeIconName = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'file';

export interface ILibraryFileTypeVisual {
  extension: string;
  iconName: LibraryFileTypeIconName;
  color: string;
}

const LIBRARY_FILE_TYPE_VISUALS: Record<string, ILibraryFileTypeVisual> = {
  pdf: { extension: 'pdf', iconName: 'pdf', color: '#e63946' },
  doc: { extension: 'doc', iconName: 'word', color: '#1e90ff' },
  docx: { extension: 'docx', iconName: 'word', color: '#1e90ff' },
  xls: { extension: 'xls', iconName: 'excel', color: '#2ecc71' },
  xlsx: { extension: 'xlsx', iconName: 'excel', color: '#2ecc71' },
  ppt: { extension: 'ppt', iconName: 'powerpoint', color: '#f4a261' },
  pptx: { extension: 'pptx', iconName: 'powerpoint', color: '#f4a261' }
};

const DEFAULT_LIBRARY_FILE_TYPE_VISUAL: ILibraryFileTypeVisual = {
  extension: '',
  iconName: 'file',
  color: '#6c757d'
};

export function resolveLibraryFileTypeVisual(fileName: string): ILibraryFileTypeVisual {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return LIBRARY_FILE_TYPE_VISUALS[extension] || {
    ...DEFAULT_LIBRARY_FILE_TYPE_VISUAL,
    extension
  };
}

export const LIBRARY_DEFAULT_CONTACT = 'PHVB - Internal Document Team';

export function resolveLibraryContactPerson(lienHe?: string): string {
  return (lienHe || '').trim() || LIBRARY_DEFAULT_CONTACT;
}

export type LibraryDocumentEffectiveStatus = 'effective' | 'expired';

/**
 * Parse date-only to local midnight without timezone day-shift.
 * Supports yyyy-MM-dd, dd/MM/yyyy, and ISO datetimes (uses calendar date prefix).
 */
export function parseDateOnlyToLocalMidnight(value?: string): Date | undefined {
  const trimmed = (value || '').trim();
  if (!trimmed || trimmed === 'Vô thời hạn') {
    return undefined;
  }

  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]);
    const day = Number(isoDateMatch[3]);
    return new Date(year, month - 1, day);
  }

  const viMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (viMatch) {
    const day = Number(viMatch[1]);
    const month = Number(viMatch[2]);
    const year = Number(viMatch[3]);
    return new Date(year, month - 1, day);
  }

  const parsedDate = new Date(trimmed);
  if (isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
}

function getTodayLocalMidnight(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

export function resolveLibraryDocumentEffectiveStatus(
  hieuLucTu?: string,
  hieuLucDen?: string
): LibraryDocumentEffectiveStatus {
  const today = getTodayLocalMidnight();
  const endDate = parseDateOnlyToLocalMidnight(hieuLucDen);

  if (endDate && today.getTime() > endDate.getTime()) {
    return 'expired';
  }

  return 'effective';
}

export function getFileExtensionLabel(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  if (extension === 'doc' || extension === 'docx') {
    return 'W';
  }

  if (extension === 'xls' || extension === 'xlsx') {
    return 'X';
  }

  if (extension === 'pdf') {
    return 'PDF';
  }

  if (extension === 'ppt' || extension === 'pptx') {
    return 'P';
  }

  return 'DOC';
}
