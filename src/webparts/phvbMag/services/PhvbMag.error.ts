export class SharePointRequestError extends Error {
  public readonly status: number;
  public readonly requestUrl: string;
  public readonly details: string;

  public constructor(message: string, status: number, requestUrl: string, details: string) {
    super(message);
    this.name = 'SharePointRequestError';
    this.status = status;
    this.requestUrl = requestUrl;
    this.details = details;
  }
}

export const SITE_CONTEXT_ERROR_MESSAGE = 'Chưa có site context SharePoint nên ứng dụng không thể tải dữ liệu thật.';

export function toRuntimeMessage(error: unknown, listTitle: string): string {
  if (error && typeof error === 'object') {
    const status = 'status' in error ? Number((error as { status?: number }).status) : 0;
    const requestUrl = 'requestUrl' in error ? String((error as { requestUrl?: string }).requestUrl || '') : '';
    const details = 'details' in error ? String((error as { details?: string }).details || '') : '';

    if (status === 403) {
      return `Bạn chưa có quyền đọc list ${listTitle} hoặc site nguồn. Kiểm tra quyền trên ${requestUrl || 'SharePoint source site'}.`;
    }

    if (status === 404) {
      return `Không tìm thấy list ${listTitle} ở site đang cấu hình. Kiểm tra lại site URL hoặc tên list.`;
    }

    if (status > 0) {
      return `Không tải được dữ liệu SharePoint (HTTP ${status}). ${details || 'Kiểm tra site URL, tên list và quyền truy cập.'}`;
    }
  }

  return `Không thể tải dữ liệu từ SharePoint. Kiểm tra list ${listTitle}, site URL và quyền truy cập.`;
}