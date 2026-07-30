import type { WorkflowActionKey } from './PhvbMagWorkflowPermission.utils';

export type CommentConfirmActionKey = WorkflowActionKey | 'returnBanHanhToAdmin';

export const REJECT_COMMENT_REQUIRED_MESSAGE = 'Vui lòng nhập ghi chú khi từ chối.';
export const REQUEST_REVISION_COMMENT_REQUIRED_MESSAGE = 'Vui lòng nhập ghi chú khi yêu cầu chỉnh sửa.';
export const RETURN_BAN_HANH_TO_ADMIN_COMMENT_REQUIRED_MESSAGE = 'Vui lòng nhập ghi chú khi trả về Admin.';

export function isWorkflowActionCommentRequired(action: CommentConfirmActionKey): boolean {
  return action === 'reject' || action === 'requestRevision' || action === 'returnBanHanhToAdmin';
}

export function getWorkflowActionCommentRequiredMessage(action: CommentConfirmActionKey): string {
  if (action === 'requestRevision') {
    return REQUEST_REVISION_COMMENT_REQUIRED_MESSAGE;
  }

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
    case 'requestRevision':
      return 'Yêu cầu chỉnh sửa';
    case 'returnBanHanhToAdmin':
      return 'Trả về Admin';
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
    case 'requestRevision':
      return 'Gửi ghi chú yêu cầu chỉnh sửa. Vui lòng nhập ghi chú bên dưới. Trạng thái yêu cầu sẽ không thay đổi.';
    case 'returnBanHanhToAdmin':
      return 'Bạn có chắc muốn trả yêu cầu về Admin? Vui lòng nhập ghi chú bên dưới.';
    default:
      return 'Bạn có chắc chắn muốn tiếp tục?';
  }
}

export function getWorkflowActionDialogConfirmLabel(
  action: CommentConfirmActionKey,
  approveLabel?: string
): string {
  switch (action) {
    case 'approve':
      return approveLabel || 'Phê duyệt';
    case 'reject':
      return 'Từ chối';
    case 'requestRevision':
      return 'Yêu cầu chỉnh sửa';
    case 'returnBanHanhToAdmin':
      return 'Trả về admin';
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
    case 'requestRevision':
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

  if (action === 'requestRevision') {
    return 'Nhập lý do yêu cầu chỉnh sửa...';
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
