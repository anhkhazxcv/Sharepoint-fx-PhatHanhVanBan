import type { WorkflowActionKey } from './PhvbMagWorkflowPermission.utils';

export const REJECT_COMMENT_REQUIRED_MESSAGE = 'Vui lòng nhập ghi chú khi từ chối.';

export function isWorkflowActionCommentRequired(action: WorkflowActionKey): boolean {
  return action === 'reject';
}

export function getWorkflowActionDialogTitle(action: WorkflowActionKey): string {
  switch (action) {
    case 'approve':
      return 'Xác nhận phê duyệt';
    case 'reject':
      return 'Xác nhận từ chối';
    case 'requestRevision':
      return 'Yêu cầu chỉnh sửa';
    default:
      return 'Xác nhận thao tác';
  }
}

export function getWorkflowActionDialogMessage(action: WorkflowActionKey): string {
  switch (action) {
    case 'approve':
      return 'Bạn có chắc chắn muốn xác nhận yêu cầu này?';
    case 'reject':
      return 'Bạn có chắc chắn muốn từ chối yêu cầu này? Vui lòng nhập ghi chú bên dưới.';
    case 'requestRevision':
      return 'Gửi ghi chú yêu cầu chỉnh sửa. Trạng thái yêu cầu sẽ không thay đổi.';
    default:
      return 'Bạn có chắc chắn muốn tiếp tục?';
  }
}

export function getWorkflowActionDialogConfirmLabel(
  action: WorkflowActionKey,
  approveLabel?: string
): string {
  switch (action) {
    case 'approve':
      return approveLabel || 'Phê duyệt';
    case 'reject':
      return 'Từ chối';
    case 'requestRevision':
      return 'Yêu cầu chỉnh sửa';
    default:
      return 'Xác nhận';
  }
}

export function getWorkflowActionDialogConfirmButtonClassName(
  action: WorkflowActionKey
): 'approve' | 'edit' | 'reject' {
  switch (action) {
    case 'reject':
      return 'reject';
    case 'requestRevision':
      return 'edit';
    default:
      return 'approve';
  }
}

export function validateWorkflowActionComment(action: WorkflowActionKey, comment: string): string | undefined {
  if (isWorkflowActionCommentRequired(action) && !comment.trim()) {
    return REJECT_COMMENT_REQUIRED_MESSAGE;
  }

  return undefined;
}
