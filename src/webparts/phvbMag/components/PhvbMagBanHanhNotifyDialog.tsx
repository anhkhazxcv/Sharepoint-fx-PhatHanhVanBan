import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { IBanHanhNotifyDraft, IAttachmentLibraryItem } from '../models/PhvbMag.models';
import { parseStoredMainDocumentId } from '../services/PhvbMagIssuancePublish.service';
import { validateBanHanhNotifyDraft } from '../utils/PhvbMagBanHanhNotify.utils';
import { CloseIcon } from './PhvbMagIcons';
import styles from './PhvbMag.module.scss';

export type BanHanhNotifyMode = 'prepare' | 'publish' | 'edit';

export interface IBanHanhNotifyConfirmOptions {
  mainDocumentId?: number;
}

interface IPhvbMagBanHanhNotifyDialogProps {
  isOpen: boolean;
  mode?: BanHanhNotifyMode;
  requireMainDocument?: boolean;
  mainDocumentReadOnly?: boolean;
  mainDocumentCandidates?: ReadonlyArray<IAttachmentLibraryItem>;
  storedMainDocumentId?: number;
  isLoading?: boolean;
  isProcessing?: boolean;
  errorMessage?: string;
  draft?: IBanHanhNotifyDraft;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (draft: IBanHanhNotifyDraft, options?: IBanHanhNotifyConfirmOptions) => void;
  onReturnToAdmin?: () => void;
}

function getDialogTitle(mode: BanHanhNotifyMode): string {
  if (mode === 'publish') {
    return 'Xác nhận ban hành văn bản';
  }

  if (mode === 'edit') {
    return 'Chỉnh sửa nội dung thông báo ban hành';
  }

  return 'Nội dung thông báo ban hành';
}

function getConfirmLabel(mode: BanHanhNotifyMode, confirmLabel?: string): string {
  if (confirmLabel) {
    return confirmLabel;
  }

  if (mode === 'publish') {
    return 'Ban hành';
  }

  if (mode === 'edit') {
    return 'Lưu';
  }

  return 'Gửi';
}

function resolveInitialMainDocumentId(
  candidates: ReadonlyArray<IAttachmentLibraryItem>,
  storedMainDocumentId?: number
): number | undefined {
  const stored = parseStoredMainDocumentId(storedMainDocumentId);

  if (!stored) {
    return undefined;
  }

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (candidate.id === stored && !candidate.isFormAttachment) {
      return stored;
    }
  }

  return undefined;
}

export function PhvbMagBanHanhNotifyDialog(props: IPhvbMagBanHanhNotifyDialogProps): React.ReactElement {
  const {
    isOpen,
    mode = 'prepare',
    requireMainDocument = false,
    mainDocumentReadOnly = false,
    mainDocumentCandidates = [],
    storedMainDocumentId,
    isLoading = false,
    isProcessing = false,
    errorMessage,
    draft,
    confirmLabel,
    onCancel,
    onConfirm,
    onReturnToAdmin
  } = props;
  const [recipient, setRecipient] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [selectedMainDocumentId, setSelectedMainDocumentId] = useState<number | undefined>(undefined);
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const bodyEditorRef = useRef<HTMLDivElement>(null);
  const isReadOnly = mode === 'publish';
  const showMainDocumentPicker = requireMainDocument || mainDocumentReadOnly;

  useEffect(() => {
    if (!isOpen || !draft) {
      return;
    }

    const nextBody = draft.body || '';

    setRecipient(draft.recipient || '');
    setSubject(draft.subject || '');
    setBody(nextBody);
    setValidationError(undefined);
    setSelectedMainDocumentId(resolveInitialMainDocumentId(mainDocumentCandidates, storedMainDocumentId));

    if (bodyEditorRef.current) {
      bodyEditorRef.current.innerHTML = nextBody;
    }
  }, [isOpen, isLoading, draft, mainDocumentCandidates, storedMainDocumentId]);

  if (!isOpen) {
    return <></>;
  }

  const displayedError = validationError || errorMessage;
  const isAwaitingDraft = isLoading || !draft;
  const isBusy = isAwaitingDraft || isProcessing;
  const isFieldDisabled = isBusy || isReadOnly;

  const handleBodyInput = (): void => {
    if (isReadOnly) {
      return;
    }

    const nextBody = bodyEditorRef.current?.innerHTML || '';
    setBody(nextBody);

    if (validationError) {
      setValidationError(undefined);
    }
  };

  const handleConfirm = (): void => {
    const nextBody = bodyEditorRef.current?.innerHTML || body;
    const nextDraft: IBanHanhNotifyDraft = {
      recipient: recipient.trim(),
      subject: subject.trim(),
      body: nextBody.trim()
    };

    if (!isReadOnly) {
      const nextValidationError = validateBanHanhNotifyDraft(nextDraft);

      if (nextValidationError) {
        setValidationError(nextValidationError);
        return;
      }
    }

    if (showMainDocumentPicker && (!selectedMainDocumentId || selectedMainDocumentId <= 0)) {
      setValidationError('Vui lòng chọn văn bản chính.');
      return;
    }

    setValidationError(undefined);
    onConfirm(
      nextDraft,
      showMainDocumentPicker ? { mainDocumentId: selectedMainDocumentId } : undefined
    );
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.banHanhNotifyModal} role="dialog" aria-modal="true" aria-labelledby="phvb-ban-hanh-notify-title">
        <div className={styles.dialogHeader}>
          <h4 id="phvb-ban-hanh-notify-title">{getDialogTitle(mode)}</h4>
          <button
            type="button"
            className={styles.dialogHeaderClose}
            onClick={onCancel}
            aria-label="Đóng"
            disabled={isBusy}
          >
            <CloseIcon />
          </button>
        </div>

        <div className={styles.banHanhNotifyBody}>
          {!isAwaitingDraft ? (
            <>
              <div className={styles.workflowActionDialogComment}>
                <label htmlFor="phvb-ban-hanh-recipient">Nơi nhận:</label>
                <input
                  id="phvb-ban-hanh-recipient"
                  type="text"
                  className={styles.formInput}
                  value={recipient}
                  disabled={true}
                  readOnly={true}
                  aria-readonly="true"
                />
              </div>

              <div className={styles.workflowActionDialogComment}>
                <label htmlFor="phvb-ban-hanh-subject">Tiêu đề:</label>
                <input
                  id="phvb-ban-hanh-subject"
                  type="text"
                  className={styles.formInput}
                  value={subject}
                  disabled={isFieldDisabled}
                  readOnly={isReadOnly}
                  placeholder="Nhập tiêu đề email..."
                  onChange={event => {
                    setSubject(event.target.value);
                    if (validationError) {
                      setValidationError(undefined);
                    }
                  }}
                />
              </div>

              <div className={styles.banHanhNotifyField}>
                <label htmlFor="phvb-ban-hanh-body">Nội dung:</label>
                <div
                  id="phvb-ban-hanh-body"
                  ref={bodyEditorRef}
                  className={styles.banHanhNotifyHtmlEditor}
                  contentEditable={!isFieldDisabled}
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Nội dung email"
                  aria-readonly={isReadOnly}
                  suppressContentEditableWarning={true}
                  onInput={handleBodyInput}
                />
              </div>

              {showMainDocumentPicker ? (
                <div className={styles.banHanhNotifyField}>
                  <span className={styles.banHanhNotifyMainDocLabel}>Văn bản chính:</span>
                  {mainDocumentCandidates.length === 0 ? (
                    <p className={styles.banHanhNotifyEmpty}>Không có tài liệu dự thảo để chọn.</p>
                  ) : (
                    <div className={styles.banHanhNotifyMainDocList} role="radiogroup" aria-label="Chọn văn bản chính">
                      {mainDocumentCandidates.map(candidate => (
                        <label key={candidate.id} className={styles.banHanhNotifyMainDocOption}>
                          <input
                            type="radio"
                            name="phvb-ban-hanh-main-document"
                            value={candidate.id}
                            checked={selectedMainDocumentId === candidate.id}
                            disabled={isBusy || mainDocumentReadOnly}
                            onChange={() => {
                              setSelectedMainDocumentId(candidate.id);
                              if (validationError) {
                                setValidationError(undefined);
                              }
                            }}
                          />
                          <span>{candidate.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </>
          ) : null}

          {displayedError ? (
            <p className={styles.workflowActionDialogError} role="alert">{displayedError}</p>
          ) : null}
        </div>

        <div className={styles.banHanhNotifyActions}>
          <button
            type="button"
            className={styles.banHanhNotifyCancelBtn}
            disabled={isBusy}
            onClick={onCancel}
          >
            Thoát
          </button>
          {mode === 'publish' && onReturnToAdmin ? (
            <button
              type="button"
              className={styles.banHanhNotifyReturnBtn}
              disabled={isBusy || isAwaitingDraft}
              onClick={onReturnToAdmin}
            >
              Trả về admin
            </button>
          ) : null}
          <button
            type="button"
            className={styles.banHanhNotifySendBtn}
            disabled={isBusy || isAwaitingDraft}
            onClick={handleConfirm}
          >
            {getConfirmLabel(mode, confirmLabel)}
          </button>
        </div>
      </div>
    </div>
  );
}
