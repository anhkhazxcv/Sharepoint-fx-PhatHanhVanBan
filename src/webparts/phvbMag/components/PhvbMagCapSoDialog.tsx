import * as React from 'react';
import { useEffect, useState } from 'react';
import { DMVL_DEFAULT_SO_VAN_BAN } from '../config/PhvbMag.configuration';
import styles from './PhvbMag.module.scss';
import { PhvbMagButton } from './primitives/PhvbMagButton';
import { PhvbMagDialog } from './primitives/PhvbMagDialog';

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
  const [isNoNumberNeeded, setIsNoNumberNeeded] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setDocumentNumberDraft('');
      setIsNoNumberNeeded(false);
      setValidationError(undefined);
    }
  }, [isOpen]);

  if (!isOpen) {
    return <></>;
  }

  const displayedError = validationError || errorMessage;

  const handleConfirm = (): void => {
    if (isNoNumberNeeded) {
      setValidationError(undefined);
      onConfirm(DMVL_DEFAULT_SO_VAN_BAN);
      return;
    }

    const normalizedNumber = documentNumberDraft.trim();

    if (!normalizedNumber) {
      setValidationError('Vui lòng nhập số văn bản.');
      return;
    }

    setValidationError(undefined);
    onConfirm(normalizedNumber);
  };

  return (
    <PhvbMagDialog
      isOpen={isOpen}
      title="Cấp số"
      titleId="phvb-cap-so-title"
      variant="confirm"
      onDismiss={onCancel}
      footer={(
        <>
          <PhvbMagButton variant="secondary" disabled={isProcessing} onClick={onCancel}>
            Hủy
          </PhvbMagButton>
          <button
            type="button"
            className={styles.detailActionCapSo}
            disabled={isProcessing}
            onClick={handleConfirm}
          >
            Cấp số
          </button>
        </>
      )}
    >
      <p>Nhập số văn bản chính thức cho yêu cầu này.</p>

      <label className={styles.capSoSkipRow}>
        <input
          type="checkbox"
          checked={isNoNumberNeeded}
          disabled={isProcessing}
          onChange={event => {
            setIsNoNumberNeeded(event.target.checked);
            setValidationError(undefined);
          }}
        />
        <span>Văn bản không thuộc dạng yêu cầu cấp số → không cần cấp số</span>
      </label>

      <div className={styles.workflowActionDialogComment}>
        <label htmlFor="phvb-cap-so-number">
          Số văn bản{!isNoNumberNeeded ? <span className={styles.workflowActionDialogRequired}> *</span> : null}
        </label>
        <input
          id="phvb-cap-so-number"
          type="text"
          className={styles.formInput}
          value={documentNumberDraft}
          placeholder="Nhập số văn bản..."
          disabled={isProcessing || isNoNumberNeeded}
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
    </PhvbMagDialog>
  );
}
