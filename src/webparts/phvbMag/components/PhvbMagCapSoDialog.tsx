import * as React from 'react';
import { useEffect, useState } from 'react';
import styles from './PhvbMag.module.scss';

interface IPhvbMagCapSoDialogProps {
  isOpen: boolean;
  isProcessing?: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: (soVanBan: string) => void;
}

export function PhvbMagCapSoDialog(props: IPhvbMagCapSoDialogProps): React.ReactElement {
  const {
    isOpen,
    isProcessing = false,
    errorMessage,
    onCancel,
    onConfirm
  } = props;
  const [documentNumberDraft, setDocumentNumberDraft] = useState<string>('');
  const [validationError, setValidationError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setDocumentNumberDraft('');
      setValidationError(undefined);
    }
  }, [isOpen]);

  if (!isOpen) {
    return <></>;
  }

  const displayedError = validationError || errorMessage;

  const handleConfirm = (): void => {
    const normalizedNumber = documentNumberDraft.trim();

    if (!normalizedNumber) {
      setValidationError('Vui lòng nhập số văn bản.');
      return;
    }

    setValidationError(undefined);
    onConfirm(normalizedNumber);
  };

  return (
    <div className={styles.confirmDialogOverlay}>
      <div className={styles.confirmDialogContent}>
        <h4>Cấp số</h4>
        <p>Nhập số văn bản chính thức cho yêu cầu này.</p>

        <div className={styles.workflowActionDialogComment}>
          <label htmlFor="phvb-cap-so-number">
            Số văn bản<span className={styles.workflowActionDialogRequired}> *</span>
          </label>
          <input
            id="phvb-cap-so-number"
            type="text"
            className={styles.formInput}
            value={documentNumberDraft}
            placeholder="Nhập số văn bản..."
            disabled={isProcessing}
            onChange={event => {
              setDocumentNumberDraft(event.target.value);
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
            className={styles.detailActionCapSo}
            disabled={isProcessing}
            onClick={handleConfirm}
          >
            {isProcessing ? 'Đang cấp số...' : 'Cấp số'}
          </button>
        </div>
      </div>
    </div>
  );
}
