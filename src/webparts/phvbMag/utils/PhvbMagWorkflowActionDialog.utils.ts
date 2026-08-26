import type { WorkflowActionKey } from './PhvbMagWorkflowPermission.utils';

export type CommentConfirmActionKey = WorkflowActionKey | 'returnBanHanhToAdmin' | 'advanceStage';

export const REJECT_COMMENT_REQUIRED_MESSAGE = 'Vui lòng nhập ghi chú khi từ chối.';
export const RETURN_BAN_HANH_TO_ADMIN_COMMENT_REQUIRED_MESSAGE = 'Vui lòng nhập ghi chú khi trả về Admin.';

export function isWorkflowActionCommentRequired(action: CommentConfirmActionKey): boolean {
  return action === 'reject' || action === 'returnBanHanhToAdmin';
}

export function getWorkflowActionCommentRequiredMessage(action: CommentConfirmActionKey): string {
  if (action === 'returnBanHanhToAdmin') {
    return RETURN_BAN_HANH_TO_ADMIN_COMMENT_REQUIRED_MESSAGE;
  }

  return REJECT_COMMENT_REQUIRED_MESSAGE;
}

export function getWorkflowActionDialogTitle(action: CommentConfirmActionKey): string {
  switch (action) {
    case 'approve':
      return 'Xác nhận phê duyệt';
    case 'reject':
      return 'Xác nhận từ chối';
    case 'returnBanHanhToAdmin':
      return 'Trả về Admin';
    case 'advanceStage':
      return 'Xác nhận chuyển giai đoạn';
    default:
      return 'Xác nhận thao tác';
  }
}

export function getWorkflowActionDialogMessage(action: CommentConfirmActionKey): string {
  switch (action) {
    case 'approve':
      return 'Bạn có chắc chắn muốn xác nhận yêu cầu này?';
    case 'reject':
      return 'Bạn có chắc chắn muốn từ chối yêu cầu này? Vui lòng nhập ghi chú bên dưới.';
    case 'returnBanHanhToAdmin':
      return 'Bạn có chắc muốn trả yêu cầu về Admin? Vui lòng nhập ghi chú bên dưới.';
    case 'advanceStage':
      return 'Bạn có chắc chắn muốn chuyển giai đoạn của yêu cầu này?';
    default:
      return 'Bạn có chắc chắn muốn tiếp tục?';
  }
}

export function getWorkflowActionDialogConfirmLabel(
  action: CommentConfirmActionKey,
  dynamicLabel?: string
): string {
  switch (action) {
    case 'approve':
      return dynamicLabel || 'Phê duyệt';
    case 'reject':
      return dynamicLabel || 'Từ chối';
    case 'returnBanHanhToAdmin':
      return 'Trả về admin';
    case 'advanceStage':
      return dynamicLabel || 'Chuyển giai đoạn';
    default:
      return 'Xác nhận';
  }
}

export function getWorkflowActionDialogConfirmButtonClassName(
  action: CommentConfirmActionKey
): 'approve' | 'edit' | 'reject' {
  switch (action) {
    case 'reject':
      return 'reject';
    case 'returnBanHanhToAdmin':
      return 'edit';
    default:
      return 'approve';
  }
}

export function getWorkflowActionCommentPlaceholder(action: CommentConfirmActionKey): string {
  if (!isWorkflowActionCommentRequired(action)) {
    return 'Nhập ghi chú (tuỳ chọn)...';
  }

  if (action === 'returnBanHanhToAdmin') {
    return 'Nhập lý do trả về Admin...';
  }

  return 'Nhập lý do từ chối...';
}

export function validateWorkflowActionComment(
  action: CommentConfirmActionKey,
  comment: string
): string | undefined {
  if (isWorkflowActionCommentRequired(action) && !comment.trim()) {
    return getWorkflowActionCommentRequiredMessage(action);
  }

  return undefined;
}
