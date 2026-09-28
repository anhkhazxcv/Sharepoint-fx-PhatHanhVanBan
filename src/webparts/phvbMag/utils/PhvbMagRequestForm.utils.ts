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
  requireGhiChuThamDinh: boolean;
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
  requireGhiChuThamDinh: true,
  includeGopYThamDinhWorkflow: true,
  includeAttachmentsOnSave: true
};

const ADJUST_FORM_RULES: IRequestTypeFormRules = {
  ...STANDARD_FORM_RULES,
  requireTaiLieuSoanThao: true
};

const DMVL_FORM_RULES: IRequestTypeFormRules = {
  showNguoiGopY: false,
  showNguoiThamDinh: false,
  showTaiLieuSoanThao: true,
  showBieuMauDinhKem: true,
  showGhiChuThamDinh: false,
  requireTaiLieuSoanThao: true,
  requireNguoiGopY: false,
  requireNguoiThamDinh: false,
  requireGhiChuThamDinh: false,
  includeGopYThamDinhWorkflow: false,
  includeAttachmentsOnSave: true
};

export function getDmvlFormRules(): IRequestTypeFormRules {
  return DMVL_FORM_RULES;
}

export function getRequestTypeFormRules(requestType: RequestTypeValue): IRequestTypeFormRules {
  if (requestType === 'Điều chỉnh') {
    return ADJUST_FORM_RULES;
  }

  return STANDARD_FORM_RULES;
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

export function findDuplicateAttachmentGroupFileName(
  otherGroupNames: ReadonlyArray<string>,
  candidateNames: ReadonlyArray<string>
): string | undefined {
  const normalizedOtherNames = new Set(
    otherGroupNames.map(name => name.trim().toLowerCase())
  );

  for (let index = 0; index < candidateNames.length; index += 1) {
    const normalized = candidateNames[index].trim().toLowerCase();

    if (normalizedOtherNames.has(normalized)) {
      return candidateNames[index];
    }
  }

  return undefined;
}

export function sanitizeRequestInputForSave(input: ICreateRequestInput): ICreateRequestInput {
  return input;
}
