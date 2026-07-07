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

  if (uniqueId) {
    const webUrl = normalizeSiteUrl(siteUrl);
    const sourcedoc = encodeURIComponent(uniqueId);
    const fileQuery = fileName ? `&file=${encodeURIComponent(fileName)}` : '';
    return `${webUrl}/_layouts/15/Doc.aspx?sourcedoc=${sourcedoc}${fileQuery}&action=default`;
  }

  return appendWebViewQuery(directUrl);
}
