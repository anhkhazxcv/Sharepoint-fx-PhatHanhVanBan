const mockCreateItem = jest.fn();
const mockFetchItems = jest.fn();
const mockToastWarning = jest.fn();
const mockResolveHistoryRetryDelayMs = jest.fn();
const mockWaitHistoryRetry = jest.fn();

jest.mock('../repositories/PhvbMag.repository', () => ({
  phvbRepository: {
    createItem: mockCreateItem,
    fetchItems: mockFetchItems
  }
}));

jest.mock('../utils/ToastService', () => ({
  ToastService: {
    warning: mockToastWarning
  }
}));

jest.mock('../utils/PhvbMagHistoryRetry.utils', () => ({
  HISTORY_QUEUE_KEY_PREFIX: 'phvb_history_queue_',
  HISTORY_WRITE_WARNING_MESSAGE: 'Thao tác đã lưu nhưng chưa ghi được lịch sử, hệ thống đang thử lại.',
  resolveHistoryRetryDelayMs: mockResolveHistoryRetryDelayMs,
  waitHistoryRetry: mockWaitHistoryRetry
}));

import {
  appendHistory,
  drainHistoryQueue
} from './PhvbMagExecutionHistory.service';
import { TRANG_THAI_THUC_HIEN } from '../config/PhvbMag.configuration';
import type { IPhvbDocumentContext } from '../models/PhvbMag.models';

describe('PhvbMagExecutionHistory.service', () => {
  const context: IPhvbDocumentContext = {
    currentWebUrl: 'https://contoso.sharepoint.com/sites/phvb',
    siteCollectionUrl: 'https://contoso.sharepoint.com',
    sourceSiteUrl: 'https://contoso.sharepoint.com/sites/phvb',
    spHttpClient: {} as IPhvbDocumentContext['spHttpClient'],
    httpClient: {} as IPhvbDocumentContext['httpClient'],
    userDisplayName: 'Nguyen Van A',
    userEmail: 'a@x.vn'
  };

  beforeEach(() => {
    mockCreateItem.mockReset();
    mockFetchItems.mockReset();
    mockToastWarning.mockReset();
    mockResolveHistoryRetryDelayMs.mockReset();
    mockWaitHistoryRetry.mockReset();
    mockFetchItems.mockResolvedValue([]);
    mockResolveHistoryRetryDelayMs.mockImplementation((_error: unknown, attemptIndex: number) =>
      attemptIndex < 3 ? 0 : undefined
    );
    mockWaitHistoryRetry.mockResolvedValue(undefined);
    window.sessionStorage.clear();
  });

  it('throws when status is empty', async () => {
    await expect(appendHistory(context, {
      idYeuCau: 'REQ-1',
      trangThaiThucHien: '' as typeof TRANG_THAI_THUC_HIEN.TAO_YEU_CAU,
      noiDung: 'Title'
    })).rejects.toThrow('TrangThai_ThucHien');
  });

  it('retries failed writes, queues the item, and warns the user', async () => {
    mockCreateItem.mockRejectedValue(new Error('SharePoint unavailable'));

    const result = await appendHistory(context, {
      idYeuCau: 'REQ-2',
      trangThaiThucHien: TRANG_THAI_THUC_HIEN.TAO_YEU_CAU,
      noiDung: 'Tiêu đề'
    });

    expect(result.status).toBe('queued');
    expect(mockCreateItem).toHaveBeenCalledTimes(4);
    expect(mockWaitHistoryRetry).toHaveBeenCalledTimes(3);
    expect(mockToastWarning).toHaveBeenCalledWith('Thao tác đã lưu nhưng chưa ghi được lịch sử, hệ thống đang thử lại.');
    expect(window.sessionStorage.getItem('phvb_history_queue_REQ-2')).toContain(TRANG_THAI_THUC_HIEN.TAO_YEU_CAU);
  });

  it('skips queued item when a recent duplicate already exists', async () => {
    window.sessionStorage.setItem('phvb_history_queue_REQ-3', JSON.stringify([
      {
        idYeuCau: 'REQ-3',
        trangThaiThucHien: TRANG_THAI_THUC_HIEN.BINH_LUAN,
        noiDung: 'Bình luận',
        department: '',
        isComment: true,
        userDisplayName: 'Nguyen Van A',
        userEmail: 'a@x.vn',
        queuedAt: new Date().toISOString()
      }
    ]));
    mockFetchItems.mockResolvedValue([{ Id: 1 }]);

    await drainHistoryQueue(context, 'REQ-3');

    expect(mockFetchItems).toHaveBeenCalledTimes(1);
    expect(mockCreateItem).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem('phvb_history_queue_REQ-3')).toBeNull();
  });

  it('deduplicates identical in-flight writes', async () => {
    let resolveCreate: (id: number) => void = () => undefined;
    mockCreateItem.mockImplementation(() => new Promise<number>(resolve => {
      resolveCreate = resolve;
    }));

    const first = appendHistory(context, {
      idYeuCau: 'REQ-4',
      trangThaiThucHien: TRANG_THAI_THUC_HIEN.BAN_HANH,
      noiDung: ''
    });
    const second = appendHistory(context, {
      idYeuCau: 'REQ-4',
      trangThaiThucHien: TRANG_THAI_THUC_HIEN.BAN_HANH,
      noiDung: ''
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(mockCreateItem).toHaveBeenCalledTimes(1);

    resolveCreate(99);

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: 'created', id: 99 },
      { status: 'created', id: 99 }
    ]);
  });
});
