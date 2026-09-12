import { getSiteOrigin, normalizeSiteUrl } from './SharePointSite.utils';

function normalizeSharePointUniqueId(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.charAt(0) === '{') {
    return trimmed;
  }

  return `{${trimmed}}`;
}

const OFFICE_ONLINE_EXTENSIONS: ReadonlySet<string> = new Set([
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx'
]);

/** Extensions SharePoint can render in an iframe. Anything else goes to the fallback panel. */
const PREVIEWABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'svg',
  'txt'
]);

function getFileExtension(fileName: string): string {
  const trimmed = (fileName || '').trim();
  const lastDot = trimmed.lastIndexOf('.');

  if (lastDot < 0 || lastDot === trimmed.length - 1) {
    return '';
  }

  return trimmed.substring(lastDot + 1).toLowerCase();
}

function isOfficeOnlineFile(fileName: string, fileRef: string): boolean {
  const fromName = getFileExtension(fileName);
  if (fromName && OFFICE_ONLINE_EXTENSIONS.has(fromName)) {
    return true;
  }

  const fromRef = getFileExtension(fileRef.split('/').pop() || '');
  return Boolean(fromRef && OFFICE_ONLINE_EXTENSIONS.has(fromRef));
}

/**
 * embed.aspx render được Word/PowerPoint/PDF/ảnh nhưng KHÔNG phục vụ workbook
 * Excel — Excel phải đi đường Excel Online (Doc.aspx?action=embedview).
 */
const EXCEL_EXTENSIONS: ReadonlySet<string> = new Set(['xls', 'xlsx']);

export function isExcelFile(fileName: string, fileRef: string): boolean {
  const fromName = getFileExtension(fileName);
  if (fromName && EXCEL_EXTENSIONS.has(fromName)) {
    return true;
  }

  const fromRef = getFileExtension(fileRef.split('/').pop() || '');
  return Boolean(fromRef && EXCEL_EXTENSIONS.has(fromRef));
}

function appendWebViewQuery(fileUrl: string): string {
  if (!fileUrl) {
    return '';
  }

  try {
    const url = new URL(fileUrl);

    if (!url.searchParams.has('web')) {
      url.searchParams.set('web', '1');
    }

    return url.toString();
  } catch {
    const separator = fileUrl.indexOf('?') > -1 ? '&' : '?';
    return `${fileUrl}${separator}web=1`;
  }
}

export function buildSharePointFileOpenUrl(
  siteUrl: string,
  options: {
    uniqueId?: string;
    fileRef?: string;
    fileName?: string;
  }
): string {
  const fileRef = options.fileRef || '';
  const fileName = options.fileName || '';
  const origin = getSiteOrigin(siteUrl);
  const directUrl = fileRef ? `${origin}${fileRef}` : '';
  const uniqueId = options.uniqueId ? normalizeSharePointUniqueId(options.uniqueId) : '';

  if (uniqueId && isOfficeOnlineFile(fileName, fileRef)) {
    const webUrl = normalizeSiteUrl(siteUrl);
    const sourcedoc = encodeURIComponent(uniqueId);
    const fileQuery = fileName ? `&file=${encodeURIComponent(fileName)}` : '';
    return `${webUrl}/_layouts/15/Doc.aspx?sourcedoc=${sourcedoc}${fileQuery}&action=default`;
  }

  return appendWebViewQuery(directUrl);
}

/**
 * Embed URL for rendering a library file inside an in-app iframe.
 *
 * Differs from buildSharePointFileOpenUrl: that one targets a new browser tab
 * (`action=default`, full Office chrome), this one targets an iframe.
 */
export function buildSharePointFilePreviewUrl(
  siteUrl: string,
  options: {
    uniqueId?: string;
    fileRef?: string;
    fileName?: string;
  }
): string {
  const fileRef = options.fileRef || '';
  const webUrl = normalizeSiteUrl(siteUrl);
  const uniqueId = options.uniqueId ? normalizeSharePointUniqueId(options.uniqueId) : '';

  if (uniqueId) {
    return `${webUrl}/_layouts/15/embed.aspx?UniqueId=${encodeURIComponent(uniqueId)}`;
  }

  // No UniqueId (e.g. search-sourced items): fall back to the direct file URL.
  const directUrl = fileRef ? `${getSiteOrigin(siteUrl)}${fileRef}` : '';

  return appendWebViewQuery(directUrl);
}

/**
 * Office Online embed variant, kept separate so the spike can swap strategies
 * per extension without touching callers.
 */
export function buildOfficeOnlineEmbedUrl(
  siteUrl: string,
  options: {
    uniqueId?: string;
    fileRef?: string;
    fileName?: string;
  }
): string {
  const fileName = options.fileName || '';
  const fileRef = options.fileRef || '';
  const uniqueId = options.uniqueId ? normalizeSharePointUniqueId(options.uniqueId) : '';

  if (!uniqueId || !isOfficeOnlineFile(fileName, fileRef)) {
    return '';
  }

  const webUrl = normalizeSiteUrl(siteUrl);
  const sourcedoc = encodeURIComponent(uniqueId);
  const fileQuery = fileName ? `&file=${encodeURIComponent(fileName)}` : '';

  return `${webUrl}/_layouts/15/Doc.aspx?sourcedoc=${sourcedoc}${fileQuery}&action=embedview`;
}

/** True when the extension has no known in-browser renderer — go straight to fallback UI. */
export function isPreviewableFile(fileName: string, fileRef: string): boolean {
  const extension = getFileExtension(fileName) || getFileExtension(fileRef.split('/').pop() || '');

  if (!extension) {
    return false;
  }

  return PREVIEWABLE_EXTENSIONS.has(extension);
}

/**
 * Reconstructs the web URL an item lives on, from data every item carries.
 *
 * Needed because preview URLs are normally precomputed in the library mapper
 * (the only place that knows which candidate site actually answered). Items
 * that skip that mapper — restored from a persisted cache written by older
 * code, built by hand, or produced by the search fallback — have no preview
 * URL, and guessing the site from the web part context would be wrong.
 *
 * `fileRef` is server-relative (`/sites/x/<library>/...`), so cutting it just
 * before the library segment yields the web path; the origin comes from
 * `fileUrl`, which every item has.
 */
function resolveWebUrlFromItem(fileUrl: string, fileRef: string, libraryTitle: string): string {
  const origin = getSiteOrigin(fileUrl);
  const marker = `/${libraryTitle}/`;
  const markerIndex = fileRef.toLowerCase().indexOf(marker.toLowerCase());

  if (!origin || markerIndex < 0) {
    return '';
  }

  return `${origin}${fileRef.substring(0, markerIndex)}`;
}

/** Fallback embed URL for items whose previewUrl was never computed. */
export function resolvePreviewUrlFromItem(
  item: { fileUrl: string; fileRef: string; name: string; uniqueId?: string },
  libraryTitle: string
): string {
  if (!isPreviewableFile(item.name, item.fileRef)) {
    return '';
  }

  const webUrl = resolveWebUrlFromItem(item.fileUrl, item.fileRef, libraryTitle);

  if (!webUrl) {
    return '';
  }

  return buildSharePointFilePreviewUrl(webUrl, {
    uniqueId: item.uniqueId,
    fileRef: item.fileRef,
    fileName: item.name
  });
}

/** Fallback Office Online embed URL, same reasoning as resolvePreviewUrlFromItem. */
export function resolveOfficeEmbedUrlFromItem(
  item: { fileUrl: string; fileRef: string; name: string; uniqueId?: string },
  libraryTitle: string
): string {
  const webUrl = resolveWebUrlFromItem(item.fileUrl, item.fileRef, libraryTitle);

  if (!webUrl) {
    return '';
  }

  return buildOfficeOnlineEmbedUrl(webUrl, {
    uniqueId: item.uniqueId,
    fileRef: item.fileRef,
    fileName: item.name
  });
}

/**
 * Force-download URL for library files.
 * Prefer UniqueId (stable); fall back to SourceUrl with absolute path.
 */
export function buildSharePointFileDownloadUrl(
  siteUrl: string,
  options: {
    uniqueId?: string;
    fileRef?: string;
  }
): string {
  const webUrl = normalizeSiteUrl(siteUrl);
  const uniqueId = (options.uniqueId || '').replace(/[{}]/g, '').trim();

  if (uniqueId) {
    return `${webUrl}/_layouts/15/download.aspx?UniqueId=${encodeURIComponent(uniqueId)}`;
  }

  const fileRef = (options.fileRef || '').trim();

  if (!fileRef) {
    return '';
  }

  const absoluteUrl = /^https?:\/\//i.test(fileRef)
    ? fileRef
    : `${getSiteOrigin(siteUrl)}${fileRef.charAt(0) === '/' ? fileRef : `/${fileRef}`}`;

  return `${webUrl}/_layouts/15/download.aspx?SourceUrl=${encodeURIComponent(absoluteUrl)}`;
}

export function openExternalUrl(url: string): void {
  const normalized = (url || '').trim();

  if (!normalized) {
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = normalized;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.setAttribute('data-interception', 'off');
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
