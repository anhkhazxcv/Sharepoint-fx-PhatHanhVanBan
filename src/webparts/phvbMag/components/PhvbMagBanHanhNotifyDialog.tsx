import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { IBanHanhNotifyDraft, IAttachmentLibraryItem } from '../models/PhvbMag.models';
import { validateBanHanhNotifyDraft } from '../utils/PhvbMagBanHanhNotify.utils';
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
  isLoading?: boolean;
  isProcessing?: boolean;
  errorMessage?: string;
  draft?: IBanHanhNotifyDraft;
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

function getConfirmLabel(mode: BanHanhNotifyMode, isProcessing: boolean): string {
  if (mode === 'publish') {
    return isProcessing ? 'Đang xử lý...' : 'Ban hành';
  }

  if (mode === 'edit') {
    return isProcessing ? 'Đang lưu...' : 'Lưu';
  }

  return isProcessing ? 'Đang gửi...' : 'Gửi';
}

function resolveInitialMainDocumentId(
  candidates: ReadonlyArray<IAttachmentLibraryItem>
): number | undefined {
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if ((candidate.loaiVanBan || '').trim().toLowerCase() === 'chinh') {
      return candidate.id;
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
    isLoading = false,
    isProcessing = false,
    errorMessage,
    draft,
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
    setSelectedMainDocumentId(resolveInitialMainDocumentId(mainDocumentCandidates));

    if (bodyEditorRef.current) {
      bodyEditorRef.current.innerHTML = nextBody;
    }
  }, [isOpen, isLoading, draft, mainDocumentCandidates]);

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
        <div className={styles.banHanhNotifyHeader}>
          <h4 id="phvb-ban-hanh-notify-title">{getDialogTitle(mode)}</h4>
        </div>

        <div className={styles.banHanhNotifyBody}>
          {isAwaitingDraft ? (
            <p className={styles.banHanhNotifyLoading}>Đang tải nội dung thông báo...</p>
          ) : (
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
                    <p className={styles.banHanhNotifyLoading}>Không có tài liệu dự thảo để chọn.</p>
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
          )}

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
              {isProcessing ? 'Đang xử lý...' : 'Trả về admin'}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.banHanhNotifySendBtn}
            disabled={isBusy || isAwaitingDraft}
            onClick={handleConfirm}
          >
            {getConfirmLabel(mode, isProcessing)}
          </button>
        </div>
      </div>
    </div>
  );
}
