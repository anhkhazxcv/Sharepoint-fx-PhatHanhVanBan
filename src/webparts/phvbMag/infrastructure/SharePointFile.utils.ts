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
