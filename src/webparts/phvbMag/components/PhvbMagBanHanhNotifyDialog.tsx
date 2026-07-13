import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { IBanHanhNotifyDraft } from '../models/PhvbMag.models';
import { validateBanHanhNotifyDraft } from '../utils/PhvbMagBanHanhNotify.utils';
import styles from './PhvbMag.module.scss';

interface IPhvbMagBanHanhNotifyDialogProps {
  isOpen: boolean;
  isLoading?: boolean;
  isProcessing?: boolean;
  errorMessage?: string;
  draft?: IBanHanhNotifyDraft;
  onCancel: () => void;
  onConfirm: (draft: IBanHanhNotifyDraft) => void;
}

export function PhvbMagBanHanhNotifyDialog(props: IPhvbMagBanHanhNotifyDialogProps): React.ReactElement {
  const {
    isOpen,
    isLoading = false,
    isProcessing = false,
    errorMessage,
    draft,
    onCancel,
    onConfirm
  } = props;
  const [recipient, setRecipient] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const bodyEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !draft) {
      return;
    }

    const nextBody = draft.body || '';

    setRecipient(draft.recipient || '');
    setSubject(draft.subject || '');
    setBody(nextBody);
    setValidationError(undefined);

    if (bodyEditorRef.current) {
      bodyEditorRef.current.innerHTML = nextBody;
    }
  }, [isOpen, isLoading, draft]);

  if (!isOpen) {
    return <></>;
  }

  const displayedError = validationError || errorMessage;
  const isAwaitingDraft = isLoading || !draft;
  const isBusy = isAwaitingDraft || isProcessing;

  const handleBodyInput = (): void => {
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
    const nextValidationError = validateBanHanhNotifyDraft(nextDraft);

    if (nextValidationError) {
      setValidationError(nextValidationError);
      return;
    }

    setValidationError(undefined);
    onConfirm(nextDraft);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.banHanhNotifyModal} role="dialog" aria-modal="true" aria-labelledby="phvb-ban-hanh-notify-title">
        <div className={styles.banHanhNotifyHeader}>
          <h4 id="phvb-ban-hanh-notify-title">Nội dung thông báo ban hành</h4>
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
                  disabled={isBusy}
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
                  contentEditable={!isBusy}
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Nội dung email"
                  suppressContentEditableWarning={true}
                  onInput={handleBodyInput}
                />
              </div>
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
          <button
            type="button"
            className={styles.banHanhNotifySendBtn}
            disabled={isBusy || isAwaitingDraft}
            onClick={handleConfirm}
          >
            {isProcessing ? 'Đang gửi...' : 'Gửi'}
          </button>
        </div>
      </div>
    </div>
  );
}
