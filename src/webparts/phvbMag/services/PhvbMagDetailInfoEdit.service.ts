import { DEFAULT_LIST_TITLE, TRANG_THAI_THUC_HIEN } from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { appendHistory } from './PhvbMagExecutionHistory.service';
import { toRuntimeMessage } from './PhvbMag.error';
import { buildDateOnlyCorrectionFormValues, sharePointRestNull, toSharePointDateOnlyIso } from '../utils/PhvbMagDateTime.utils';
import { joinWithLimit } from '../utils/PhvbMagHistoryText.utils';
import {
  buildRequestInfoChangedFieldLabels,
  buildRequestInfoFieldsFromRelease
} from '../utils/PhvbMagDetailInfoEdit.utils';
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

    const changedFieldLabels = buildRequestInfoChangedFieldLabels(
      buildRequestInfoFieldsFromRelease(release),
      input
    );

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
        HieuLucTu: toSharePointDateOnlyIso(input.hieuLucTu) || sharePointRestNull(),
        HieuLucDen: toSharePointDateOnlyIso(input.hieuLucDen) || sharePointRestNull(),
        IsSendMailNotify: input.isSendMailNotify,
        TomTatNoiDung: input.summary.trim(),
        GhiChuChoThamDinh: input.ghiChuThamDinh.trim(),
        LienHe: input.lienHe.trim()
      }
    });

    const dateCorrections = buildDateOnlyCorrectionFormValues(
      {
        HieuLucTu: toSharePointDateOnlyIso(input.hieuLucTu),
        HieuLucDen: toSharePointDateOnlyIso(input.hieuLucDen)
      },
      ['HieuLucTu', 'HieuLucDen']
    );

    if (dateCorrections.length > 0) {
      await phvbRepository.updateItemFieldValues({
        ...context,
        logContext,
        listTitle: DEFAULT_LIST_TITLE,
        itemId: release.Id,
        formValues: dateCorrections
      });
    }

    if (changedFieldLabels.length === 0) {
      return;
    }

    await appendHistory(
      { ...context, logContext },
      {
        idYeuCau,
        trangThaiThucHien: TRANG_THAI_THUC_HIEN.SUA_THONG_TIN,
        noiDung: joinWithLimit(changedFieldLabels, { moreLabel: 'trường khác' }),
        department: release.KhoaPhongNguoiTao
      }
    );
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, DEFAULT_LIST_TITLE);
  }
}

export const phvbDetailInfoEditService = new PhvbDetailInfoEditService();
