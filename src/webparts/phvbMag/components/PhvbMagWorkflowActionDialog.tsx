import * as React from 'react';
import { useEffect, useState } from 'react';
import type { WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
import {
  getWorkflowActionDialogConfirmButtonClassName,
  getWorkflowActionDialogConfirmLabel,
  getWorkflowActionDialogMessage,
  getWorkflowActionDialogTitle,
  isWorkflowActionCommentRequired,
  validateWorkflowActionComment
} from '../utils/PhvbMagWorkflowActionDialog.utils';
import styles from './PhvbMag.module.scss';

interface IPhvbMagWorkflowActionDialogProps {
  isOpen: boolean;
  action?: WorkflowActionKey;
  approveLabel?: string;
  isProcessing?: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: (comment: string) => void;
}

export function PhvbMagWorkflowActionDialog(props: IPhvbMagWorkflowActionDialogProps): React.ReactElement {
  const {
    isOpen,
    action,
    approveLabel,
    isProcessing = false,
    errorMessage,
    onCancel,
    onConfirm
  } = props;
  const [commentDraft, setCommentDraft] = useState<string>('');
  const [validationError, setValidationError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setCommentDraft('');
      setValidationError(undefined);
    }
  }, [isOpen, action]);

  if (!isOpen || !action) {
    return <></>;
  }

  const isCommentRequired = isWorkflowActionCommentRequired(action);
  const commentPlaceholder = !isCommentRequired
    ? 'Nhập ghi chú (tuỳ chọn)...'
    : action === 'requestRevision'
      ? 'Nhập lý do yêu cầu chỉnh sửa...'
      : 'Nhập lý do từ chối...';
  const confirmLabel = getWorkflowActionDialogConfirmLabel(action, approveLabel);
  const confirmButtonVariant = getWorkflowActionDialogConfirmButtonClassName(action);
  const confirmButtonClassName = confirmButtonVariant === 'reject'
    ? styles.detailActionReject
    : confirmButtonVariant === 'edit'
      ? styles.detailActionEdit
      : styles.detailActionApprove;
  const displayedError = validationError || errorMessage;

  const handleConfirm = (): void => {
    const normalizedComment = commentDraft.trim();
    const commentValidationError = validateWorkflowActionComment(action, normalizedComment);

    if (commentValidationError) {
      setValidationError(commentValidationError);
      return;
    }

    setValidationError(undefined);
    onConfirm(normalizedComment);
  };

  return (
    <div className={styles.confirmDialogOverlay}>
      <div className={styles.confirmDialogContent}>
        <h4>{getWorkflowActionDialogTitle(action)}</h4>
        <p>{getWorkflowActionDialogMessage(action)}</p>

        <div className={styles.workflowActionDialogComment}>
          <label htmlFor="phvb-workflow-action-comment">
            Ghi chú
            {isCommentRequired ? <span className={styles.workflowActionDialogRequired}> *</span> : null}
          </label>
          <textarea
            id="phvb-workflow-action-comment"
            className={styles.workflowActionDialogTextarea}
            value={commentDraft}
            placeholder={commentPlaceholder}
            rows={4}
            disabled={isProcessing}
            onChange={event => {
              setCommentDraft(event.target.value);
              if (validationError) {
                setValidationError(undefined);
              }
            }}
          />
        </div>

        {displayedError ? (
          <p className={styles.workflowActionDialogError} role="alert">{displayedError}</p>
        ) : null}

        <div className={styles.confirmDialogActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            disabled={isProcessing}
            onClick={onCancel}
          >
            Hủy
          </button>
          <button
            type="button"
            className={confirmButtonClassName}
            disabled={isProcessing}
            onClick={handleConfirm}
          >
            {isProcessing ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
