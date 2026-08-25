import { DEFAULT_LIST_TITLE, EXECUTION_HISTORY_STATUS } from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { createExecutionHistoryRecord } from './PhvbMagExecutionHistory.service';
import { toRuntimeMessage } from './PhvbMag.error';
import type { IRequestInfoFieldsInput } from '../utils/PhvbMagDetailInfoEdit.utils';
import type { IPhvbDocumentContext, IPhvbLogContext, IVanBanItem } from '../models/PhvbMag.models';

export class PhvbDetailInfoEditService {
  public async updateRequestInfoFields(
    context: IPhvbDocumentContext,
    release: IVanBanItem,
    input: IRequestInfoFieldsInput,
    logContext?: IPhvbLogContext
  ): Promise<void> {
    const idYeuCau = (release.IdYeuCau || '').trim();

    if (!idYeuCau) {
      throw new Error('Yêu cầu chưa có mã IdYeuCau.');
    }

    await phvbRepository.updateItem({
      ...context,
      logContext,
      listTitle: DEFAULT_LIST_TITLE,
      itemId: release.Id,
      payload: {
        Tenvanban: input.tenVanBan.trim(),
        Title: input.tenVanBan.trim(),
        TenVanBan_ENG: input.tenVanBanEng.trim(),
        ThuMucBanHanh: input.folderLuuTru.trim(),
        HieuLucTu: input.hieuLucTu,
        HieuLucDen: input.hieuLucDen,
        IsSendMailNotify: input.isSendMailNotify,
        TomTatNoiDung: input.summary.trim(),
        GhiChuChoThamDinh: input.ghiChuThamDinh.trim()
      }
    });

    await createExecutionHistoryRecord(
      { ...context, logContext },
      {
        idYeuCau,
        historyStatus: EXECUTION_HISTORY_STATUS.CAP_NHAT_YEU_CAU,
        department: release.KhoaPhongNguoiTao
      }
    );
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, DEFAULT_LIST_TITLE);
  }
}

export const phvbDetailInfoEditService = new PhvbDetailInfoEditService();
