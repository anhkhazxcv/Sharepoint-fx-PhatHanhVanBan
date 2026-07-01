import {
  ALL_USER_GOPY_LIST_TITLE,
  ALL_USER_PHEDUYET_LIST_TITLE,
  ALL_USER_THAMDINH_LIST_TITLE,
  DEFAULT_LIST_TITLE,
  hasSharePointSiteContext,
  REQUEST_STATUS
} from '../config/PhvbMag.configuration';
import { phvbAttachmentService } from './PhvbMagAttachment.service';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { RELEASE_SELECT_FIELDS } from './PhvbMag.service';
import { toRuntimeMessage } from './PhvbMag.error';
import { mapReleaseToCreateRequestInput } from '../utils/PhvbMagDraftEdit.utils';
import type { IAllUserWorkflowItem, IAttachmentLibraryItem, ICreateRequestInput, IPhvbDirectoryUser, IPhvbSiteContext, IVanBanItem } from '../models/PhvbMag.models';

export interface IDraftEditData {
  itemId: number;
  idYeuCau: string;
  form: ICreateRequestInput;
  existingTaiLieuAttachments: IAttachmentLibraryItem[];
  existingBieuMauAttachments: IAttachmentLibraryItem[];
}

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

async function fetchReleaseByIdYeuCau(context: IPhvbSiteContext, idYeuCau: string): Promise<IVanBanItem | undefined> {
  const items = await phvbRepository.fetchItems({
    ...context,
    listTitle: DEFAULT_LIST_TITLE,
    selectFields: RELEASE_SELECT_FIELDS,
    filter: `IdYeuCau eq '${escapeODataValue(idYeuCau)}'`,
    top: 1
  });

  return items.length > 0 ? items[0] : undefined;
}

async function fetchAllUserItems(context: IPhvbSiteContext, idYeuCau: string, listTitle: string): Promise<IAllUserWorkflowItem[]> {
  const selectFields = [
    'Id',
    'IDYeuCau',
    'User_ThucHien',
    'Email_ThucHien',
    'PhongBan_ThucHien',
    'Ngay_ThucHien',
    'TrangThai_ThucHien',
    'NoiDung'
  ];

  const items = await phvbRepository.fetchItems({
    ...context,
    listTitle,
    selectFields,
    filter: `IDYeuCau eq '${escapeODataValue(idYeuCau)}'`,
    top: 500
  });

  return items as unknown as IAllUserWorkflowItem[];
}

export class PhvbDraftEditService {
  public async loadDraftForEdit(
    context: IPhvbSiteContext,
    idYeuCau: string,
    directoryUsers?: ReadonlyArray<IPhvbDirectoryUser>
  ): Promise<IDraftEditData | undefined> {
    if (!hasSharePointSiteContext(context) || !idYeuCau.trim()) {
      return undefined;
    }

    const normalizedId = idYeuCau.trim();
    const [release, attachments, gopYUsers, thamDinhUsers, pheDuyetUsers] = await Promise.all([
      fetchReleaseByIdYeuCau(context, normalizedId),
      phvbAttachmentService.listRequestFiles(context, normalizedId).catch(() => []),
      fetchAllUserItems(context, normalizedId, ALL_USER_GOPY_LIST_TITLE).catch(() => []),
      fetchAllUserItems(context, normalizedId, ALL_USER_THAMDINH_LIST_TITLE).catch(() => []),
      fetchAllUserItems(context, normalizedId, ALL_USER_PHEDUYET_LIST_TITLE).catch(() => [])
    ]);

    if (!release || release.StatusApproved !== REQUEST_STATUS.BAN_NHAP) {
      return undefined;
    }

    return {
      itemId: release.Id,
      idYeuCau: release.IdYeuCau || normalizedId,
      form: mapReleaseToCreateRequestInput({
        release,
        gopYUsers,
        thamDinhUsers,
        pheDuyetUsers,
        directoryUsers
      }),
      existingTaiLieuAttachments: attachments.filter(item => !item.isFormAttachment),
      existingBieuMauAttachments: attachments.filter(item => item.isFormAttachment)
    };
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, DEFAULT_LIST_TITLE);
  }
}

export const phvbDraftEditService = new PhvbDraftEditService();
