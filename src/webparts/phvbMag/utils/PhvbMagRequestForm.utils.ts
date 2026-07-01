import type { IAttachmentLibraryItem, ICreateRequestInput } from '../models/PhvbMag.models';

export type RequestTypeValue = ICreateRequestInput['requestType'];

export interface IRequestTypeFormRules {
  showNguoiGopY: boolean;
  showNguoiThamDinh: boolean;
  showTaiLieuSoanThao: boolean;
  showBieuMauDinhKem: boolean;
  showGhiChuThamDinh: boolean;
  requireTaiLieuSoanThao: boolean;
  requireNguoiGopY: boolean;
  requireNguoiThamDinh: boolean;
  includeGopYThamDinhWorkflow: boolean;
  includeAttachmentsOnSave: boolean;
}

const STANDARD_FORM_RULES: IRequestTypeFormRules = {
  showNguoiGopY: true,
  showNguoiThamDinh: true,
  showTaiLieuSoanThao: true,
  showBieuMauDinhKem: true,
  showGhiChuThamDinh: true,
  requireTaiLieuSoanThao: true,
  requireNguoiGopY: true,
  requireNguoiThamDinh: true,
  includeGopYThamDinhWorkflow: true,
  includeAttachmentsOnSave: true
};

const ADJUST_FORM_RULES: IRequestTypeFormRules = {
  ...STANDARD_FORM_RULES,
  requireTaiLieuSoanThao: false
};

const REVOKE_FORM_RULES: IRequestTypeFormRules = {
  showNguoiGopY: false,
  showNguoiThamDinh: false,
  showTaiLieuSoanThao: false,
  showBieuMauDinhKem: false,
  showGhiChuThamDinh: false,
  requireTaiLieuSoanThao: false,
  requireNguoiGopY: false,
  requireNguoiThamDinh: false,
  includeGopYThamDinhWorkflow: false,
  includeAttachmentsOnSave: false
};

export function getRequestTypeFormRules(requestType: RequestTypeValue): IRequestTypeFormRules {
  if (requestType === 'Thu hồi') {
    return REVOKE_FORM_RULES;
  }

  if (requestType === 'Điều chỉnh') {
    return ADJUST_FORM_RULES;
  }

  return STANDARD_FORM_RULES;
}

export function isRevokeRequestType(requestType: RequestTypeValue): boolean {
  return requestType === 'Thu hồi';
}

export function getRevokeExcludedFormFields(): Pick<
  ICreateRequestInput,
  'nguoiGopY' | 'nguoiThamDinh' | 'deadlineGopY' | 'deadlineThamDinh' | 'ghiChuThamDinh' | 'taiLieuFiles' | 'bieuMauFiles'
> {
  return {
    nguoiGopY: [],
    nguoiThamDinh: [],
    deadlineGopY: '',
    deadlineThamDinh: '',
    ghiChuThamDinh: '',
    taiLieuFiles: [],
    bieuMauFiles: []
  };
}

export function collectAttachmentRemovalIds(
  existingTaiLieu: IAttachmentLibraryItem[],
  existingBieuMau: IAttachmentLibraryItem[],
  currentRemovedIds: number[]
): number[] {
  const mergedIds = currentRemovedIds.slice();

  existingTaiLieu.forEach(item => {
    if (mergedIds.indexOf(item.id) === -1) {
      mergedIds.push(item.id);
    }
  });

  existingBieuMau.forEach(item => {
    if (mergedIds.indexOf(item.id) === -1) {
      mergedIds.push(item.id);
    }
  });

  return mergedIds;
}

export function sanitizeRequestInputForSave(input: ICreateRequestInput): ICreateRequestInput {
  const rules = getRequestTypeFormRules(input.requestType);

  if (rules.includeAttachmentsOnSave) {
    return input;
  }

  return {
    ...input,
    ...getRevokeExcludedFormFields(),
    existingTaiLieuAttachments: [],
    existingBieuMauAttachments: [],
    removedAttachmentIds: collectAttachmentRemovalIds(
      input.existingTaiLieuAttachments || [],
      input.existingBieuMauAttachments || [],
      input.removedAttachmentIds || []
    )
  };
}
