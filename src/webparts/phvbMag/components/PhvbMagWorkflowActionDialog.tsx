import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { DRAFT_DOCUMENT_ACCEPT } from '../config/PhvbMag.configuration';
import { appendCommentAttachmentFiles } from '../utils/PhvbMagCommentAttachment.utils';
import type { CommentConfirmActionKey } from '../utils/PhvbMagWorkflowActionDialog.utils';
import {
  getWorkflowActionCommentPlaceholder,
  getWorkflowActionDialogConfirmButtonClassName,
  getWorkflowActionDialogConfirmLabel,
  getWorkflowActionDialogMessage,
  getWorkflowActionDialogTitle,
  isWorkflowActionCommentRequired,
  validateWorkflowActionComment
} from '../utils/PhvbMagWorkflowActionDialog.utils';
import { DeleteFileIcon, UploadDocumentIcon } from './PhvbMagIcons';
import styles from './PhvbMag.module.scss';
import { PhvbMagButton } from './primitives/PhvbMagButton';
import { PhvbMagDialog } from './primitives/PhvbMagDialog';

interface IPhvbMagWorkflowActionDialogProps {
  isOpen: boolean;
  action?: CommentConfirmActionKey;
  approveLabel?: string;
  isProcessing?: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: (comment: string, files: File[]) => void;
}

const FILE_ATTACHMENT_ACTIONS: ReadonlyArray<CommentConfirmActionKey> = ['approve', 'reject'];

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCommentDraft('');
      setSelectedFiles([]);
      setValidationError(undefined);
    }
  }, [isOpen, action]);

  if (!isOpen || !action) {
    return <></>;
  }

  const isCommentRequired = isWorkflowActionCommentRequired(action);
  const commentPlaceholder = getWorkflowActionCommentPlaceholder(action);
  const confirmLabel = getWorkflowActionDialogConfirmLabel(action, approveLabel);
  const confirmButtonVariant = getWorkflowActionDialogConfirmButtonClassName(action);
  const confirmButtonClassName = confirmButtonVariant === 'reject'
    ? styles.detailActionReject
    : confirmButtonVariant === 'edit'
      ? styles.detailActionEdit
      : styles.detailActionApprove;
  const displayedError = validationError || errorMessage;
  const canAttachFiles = FILE_ATTACHMENT_ACTIONS.indexOf(action) > -1;

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files && event.target.files.length > 0) {
      const result = appendCommentAttachmentFiles(selectedFiles, event.target.files);

      if (result.error) {
        setValidationError(result.error);
      } else {
        setValidationError(undefined);
      }

      setSelectedFiles(result.files);
    }

    event.target.value = '';
  };

  const handleRemoveFile = (fileIndex: number): void => {
    setSelectedFiles(previous => previous.filter((_file, index) => index !== fileIndex));
  };

  const handleConfirm = (): void => {
    const normalizedComment = commentDraft.trim();
    const commentValidationError = validateWorkflowActionComment(action, normalizedComment);

    if (commentValidationError) {
      setValidationError(commentValidationError);
      return;
    }

    setValidationError(undefined);
    onConfirm(normalizedComment, canAttachFiles ? selectedFiles : []);
  };

  return (
    <PhvbMagDialog
      isOpen={isOpen}
      title={getWorkflowActionDialogTitle(action)}
      titleId="phvb-workflow-action-title"
      variant="confirm"
      onDismiss={onCancel}
      footer={(
        <>
          <PhvbMagButton variant="secondary" disabled={isProcessing} onClick={onCancel}>
            Hủy
          </PhvbMagButton>
          <button
            type="button"
            className={confirmButtonClassName}
            disabled={isProcessing}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </>
      )}
    >
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

      {canAttachFiles ? (
        <div className={styles.workflowActionDialogAttachments}>
          <div className={styles.detailCommentFilePicker}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={DRAFT_DOCUMENT_ACCEPT}
              className={styles.detailCommentFileInput}
              disabled={isProcessing}
              onChange={handleFileInputChange}
            />
            <button
              type="button"
              className={styles.detailCommentAttachBtn}
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadDocumentIcon style={{ width: 18, height: 18 }} />
              Đính kèm file
            </button>
          </div>

          {selectedFiles.length > 0 ? (
            <ul className={styles.detailCommentFileList}>
              {selectedFiles.map((file, fileIndex) => (
                <li key={`${file.name}-${fileIndex}`} className={styles.detailCommentFileChip}>
                  <span className={styles.detailCommentFileName}>{file.name}</span>
                  <button
                    type="button"
                    className={styles.detailCommentFileRemoveBtn}
                    disabled={isProcessing}
                    aria-label={`Xóa file ${file.name}`}
                    onClick={() => handleRemoveFile(fileIndex)}
                  >
                    <DeleteFileIcon />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {displayedError ? (
        <p className={styles.workflowActionDialogError} role="alert">{displayedError}</p>
      ) : null}
    </PhvbMagDialog>
  );
}
