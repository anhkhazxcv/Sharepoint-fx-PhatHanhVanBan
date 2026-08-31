import type { IAttachmentLibraryItem, ICreateRequestInput } from '../models/PhvbMag.models';
import { findDuplicateAttachmentGroupFileName, shouldSkipGopYStage, type IRequestTypeFormRules } from './PhvbMagRequestForm.utils';
import { validateWorkflowDeadlines } from './PhvbMagSla.utils';

export type CreateRequestFieldKey =
  | 'folderLuuTru'
  | 'title'
  | 'hieuLucTu'
  | 'summary'
  | 'taiLieuFiles'
  | 'bieuMauFiles'
  | 'loaiSla'
  | 'ghiChuThamDinh'
  | 'nguoiGopY'
  | 'deadlineGopY'
  | 'nguoiThamDinh'
  | 'deadlineThamDinh'
  | 'approvalUsers'
  | 'deadlinePheDuyet';

export type CreateRequestValidationMode = 'submit' | 'draft';

export interface ICreateRequestFieldError {
  field: CreateRequestFieldKey;
  label: string;
  message: string;
}

export interface IValidateCreateRequestFormOptions {
  rules: IRequestTypeFormRules;
  existingTaiLieu: ReadonlyArray<IAttachmentLibraryItem>;
  existingBieuMau: ReadonlyArray<IAttachmentLibraryItem>;
  mode: CreateRequestValidationMode;
  isDmvl?: boolean;
}

export const CREATE_REQUEST_FIELD_IDS: Record<CreateRequestFieldKey, string> = {
  folderLuuTru: 'phvb-create-folderLuuTru',
  title: 'phvb-create-title',
  hieuLucTu: 'phvb-create-hieuLucTu',
  summary: 'phvb-create-summary',
  taiLieuFiles: 'phvb-create-taiLieuFiles',
  bieuMauFiles: 'phvb-create-bieuMauFiles',
  loaiSla: 'phvb-create-loaiSla',
  ghiChuThamDinh: 'phvb-create-ghiChuThamDinh',
  nguoiGopY: 'phvb-create-nguoiGopY',
  deadlineGopY: 'phvb-create-deadlineGopY',
  nguoiThamDinh: 'phvb-create-nguoiThamDinh',
  deadlineThamDinh: 'phvb-create-deadlineThamDinh',
  approvalUsers: 'phvb-create-approvalUsers',
  deadlinePheDuyet: 'phvb-create-deadlinePheDuyet'
};

export const CREATE_REQUEST_FIELD_LABELS: Record<CreateRequestFieldKey, string> = {
  folderLuuTru: 'Thư mục ban hành',
  title: 'Tên văn bản (tiếng Việt)',
  hieuLucTu: 'Ngày hiệu lực',
  summary: 'Lý do ban hành / tóm tắt nội dung',
  taiLieuFiles: 'Tài liệu soạn thảo',
  bieuMauFiles: 'Biểu mẫu cần ban hành',
  loaiSla: 'Loại SLA',
  ghiChuThamDinh: 'Ghi chú cho cấp thẩm định / phê duyệt',
  nguoiGopY: 'Người góp ý',
  deadlineGopY: 'Deadline người góp ý',
  nguoiThamDinh: 'Người thẩm định',
  deadlineThamDinh: 'Deadline người thẩm định',
  approvalUsers: 'Người phê duyệt',
  deadlinePheDuyet: 'Deadline người phê duyệt'
};

function pushError(
  errors: ICreateRequestFieldError[],
  field: CreateRequestFieldKey,
  message: string
): void {
  errors.push({
    field,
    label: CREATE_REQUEST_FIELD_LABELS[field],
    message
  });
}

function hasTaiLieuAttachments(
  input: ICreateRequestInput,
  existingTaiLieu: ReadonlyArray<IAttachmentLibraryItem>
): boolean {
  return input.taiLieuFiles.length > 0 || existingTaiLieu.length > 0;
}

function validateDraftForm(input: ICreateRequestInput): ICreateRequestFieldError[] {
  const errors: ICreateRequestFieldError[] = [];

  if (input.requestType === 'Điều chỉnh') {
    if (!(input.folderLuuTru || '').trim()) {
      pushError(errors, 'folderLuuTru', 'Vui lòng chọn thư mục ban hành.');
    }

    return errors;
  }

  if (!(input.title || '').trim()) {
    pushError(errors, 'title', 'Vui lòng nhập tên văn bản.');
  }

  return errors;
}

function validateSubmitForm(
  input: ICreateRequestInput,
  options: IValidateCreateRequestFormOptions
): ICreateRequestFieldError[] {
  const errors: ICreateRequestFieldError[] = [];
  const { rules, existingTaiLieu, existingBieuMau, isDmvl } = options;

  if (!(input.folderLuuTru || input.folder || '').trim()) {
    pushError(errors, 'folderLuuTru', 'Vui lòng chọn thư mục ban hành.');
  }

  if (!(input.title || '').trim()) {
    pushError(errors, 'title', 'Vui lòng nhập tên văn bản.');
  }

  if (!(input.hieuLucTu || '').trim()) {
    pushError(errors, 'hieuLucTu', 'Vui lòng chọn ngày hiệu lực.');
  }

  if (!(input.summary || '').trim()) {
    pushError(errors, 'summary', 'Vui lòng nhập lý do ban hành / tóm tắt nội dung.');
  }

  if (rules.requireTaiLieuSoanThao && !hasTaiLieuAttachments(input, existingTaiLieu)) {
    pushError(
      errors,
      'taiLieuFiles',
      isDmvl
        ? 'Vui lòng đính kèm ít nhất một tài liệu soạn thảo trước khi ban hành.'
        : 'Vui lòng đính kèm ít nhất một tài liệu soạn thảo trước khi gửi yêu cầu.'
    );
  }

  const taiLieuNames = [
    ...input.taiLieuFiles.map(file => file.name),
    ...existingTaiLieu.map(item => item.name)
  ];
  const bieuMauNames = [
    ...input.bieuMauFiles.map(file => file.name),
    ...existingBieuMau.map(item => item.name)
  ];
  const duplicateFileName = findDuplicateAttachmentGroupFileName(taiLieuNames, bieuMauNames);

  if (duplicateFileName) {
    pushError(
      errors,
      'taiLieuFiles',
      `Tên file "${duplicateFileName}" bị trùng giữa Tài liệu soạn thảo và Biểu mẫu cần ban hành. Vui lòng đổi tên hoặc xóa bớt.`
    );
  }

  if (!rules.includeGopYThamDinhWorkflow) {
    return errors;
  }

  if (!(input.loaiSla || '').trim()) {
    pushError(errors, 'loaiSla', 'Vui lòng chọn loại SLA.');
  }

  if (rules.requireGhiChuThamDinh && !(input.ghiChuThamDinh || '').trim()) {
    pushError(errors, 'ghiChuThamDinh', 'Vui lòng nhập ghi chú cho cấp thẩm định / phê duyệt.');
  }

  if (rules.requireNguoiGopY && input.nguoiGopY.length === 0) {
    pushError(errors, 'nguoiGopY', 'Vui lòng chọn ít nhất một người góp ý.');
  }

  if (rules.requireNguoiThamDinh && input.nguoiThamDinh.length === 0) {
    pushError(errors, 'nguoiThamDinh', 'Vui lòng chọn ít nhất một người thẩm định.');
  }

  if (input.approvalUsers.length === 0) {
    pushError(errors, 'approvalUsers', 'Vui lòng chọn ít nhất một người phê duyệt.');
  }

  const deadlineResult = validateWorkflowDeadlines({
    deadlineGopY: input.deadlineGopY,
    deadlineThamDinh: input.deadlineThamDinh,
    deadlinePheDuyet: input.deadlinePheDuyet,
    loaiSla: input.loaiSla,
    skipGopY: shouldSkipGopYStage(input),
    skipThamDinh: !rules.includeGopYThamDinhWorkflow
  });

  if (deadlineResult.deadlineGopY) {
    pushError(errors, 'deadlineGopY', deadlineResult.deadlineGopY);
  }

  if (deadlineResult.deadlineThamDinh) {
    pushError(errors, 'deadlineThamDinh', deadlineResult.deadlineThamDinh);
  }

  if (deadlineResult.deadlinePheDuyet) {
    pushError(errors, 'deadlinePheDuyet', deadlineResult.deadlinePheDuyet);
  }

  return errors;
}

export function validateCreateRequestForm(
  input: ICreateRequestInput,
  options: IValidateCreateRequestFormOptions
): ICreateRequestFieldError[] {
  if (options.mode === 'draft') {
    return validateDraftForm(input);
  }

  return validateSubmitForm(input, options);
}

export function getVisibleFieldErrors(
  allErrors: ReadonlyArray<ICreateRequestFieldError>,
  options: {
    touched: ReadonlySet<CreateRequestFieldKey>;
    hasAttemptedSubmit: boolean;
  }
): ICreateRequestFieldError[] {
  if (options.hasAttemptedSubmit) {
    return allErrors.slice();
  }

  return allErrors.filter(error => options.touched.has(error.field));
}

export function getFieldErrorMessage(
  errors: ReadonlyArray<ICreateRequestFieldError>,
  field: CreateRequestFieldKey
): string | undefined {
  for (let index = 0; index < errors.length; index += 1) {
    if (errors[index].field === field) {
      return errors[index].message;
    }
  }

  return undefined;
}

export function focusCreateRequestField(field: CreateRequestFieldKey): void {
  const element = document.getElementById(CREATE_REQUEST_FIELD_IDS[field]);

  if (!element) {
    return;
  }

  element.scrollIntoView({ block: 'center', inline: 'nearest' });

  if (typeof (element as HTMLElement).focus === 'function') {
    (element as HTMLElement).focus();
  }
}
