import * as React from 'react';
import styles from './PhvbMag.module.scss';

export type BanHanhDialogAction = 'prepare' | 'publish';

interface IPhvbMagBanHanhDialogProps {
  isOpen: boolean;
  action?: BanHanhDialogAction;
  isProcessing?: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function getDialogTitle(action?: BanHanhDialogAction): string {
  return action === 'publish' ? 'Ban hành văn bản' : 'Chuẩn bị ban hành';
}

function getDialogMessage(action?: BanHanhDialogAction): string {
  if (action === 'publish') {
    return 'Bạn có chắc chắn muốn ban hành văn bản này? Trạng thái sẽ chuyển sang Ban hành.';
  }

  return 'Bạn có chắc chắn muốn chuyển yêu cầu sang trạng thái Chờ ban hành?';
}

function getConfirmLabel(action?: BanHanhDialogAction): string {
  return action === 'publish' ? 'Ban hành văn bản' : 'Ban hành';
}

export function PhvbMagBanHanhDialog(props: IPhvbMagBanHanhDialogProps): React.ReactElement {
  const {
    isOpen,
    action,
    isProcessing = false,
    errorMessage,
    onCancel,
    onConfirm
  } = props;

  if (!isOpen || !action) {
    return <></>;
  }

  return (
    <div className={styles.confirmDialogOverlay}>
      <div className={styles.confirmDialogContent}>
        <h4>{getDialogTitle(action)}</h4>
        <p>{getDialogMessage(action)}</p>

        {errorMessage ? (
          <p className={styles.workflowActionDialogError} role="alert">{errorMessage}</p>
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
            className={styles.detailActionApprove}
            disabled={isProcessing}
            onClick={onConfirm}
          >
            {isProcessing ? 'Đang xử lý...' : getConfirmLabel(action)}
          </button>
        </div>
      </div>
    </div>
  );
}
