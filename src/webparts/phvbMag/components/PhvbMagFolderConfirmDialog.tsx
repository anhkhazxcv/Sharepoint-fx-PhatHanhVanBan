import * as React from 'react';
import type { ISelectedBanHanhFolder } from '../models/PhvbMag.models';
import styles from './PhvbMag.module.scss';

interface IPhvbMagFolderConfirmDialogProps {
  isOpen: boolean;
  requestType: 'Viết mới' | 'Điều chỉnh' | 'Thu hồi';
  selectedFolder?: ISelectedBanHanhFolder;
  onCancel: () => void;
  onConfirm: () => void;
}

function buildConfirmMessage(requestType: IPhvbMagFolderConfirmDialogProps['requestType'], folderName: string): string {
  switch (requestType) {
    case 'Viết mới':
      return `Bạn sẽ ban hành văn bản vào thư mục "${folderName}". Bạn có chắc chắn?`;
    case 'Điều chỉnh':
      return `Bạn sẽ điều chỉnh văn bản "${folderName}". Bạn có chắc chắn?`;
    case 'Thu hồi':
      return `Bạn sẽ thu hồi văn bản "${folderName}". Bạn có chắc chắn?`;
    default:
      return `Bạn có chắc chắn muốn chọn thư mục "${folderName}"?`;
  }
}

export function PhvbMagFolderConfirmDialog(props: IPhvbMagFolderConfirmDialogProps): React.ReactElement {
  const { isOpen, requestType, selectedFolder, onCancel, onConfirm } = props;

  if (!isOpen || !selectedFolder) {
    return <></>;
  }

  return (
    <div className={styles.confirmDialogOverlay}>
      <div className={styles.confirmDialogContent}>
        <h4>Xác nhận lựa chọn</h4>
        <p>{buildConfirmMessage(requestType, selectedFolder.name)}</p>
        <div className={styles.confirmDialogActions}>
          <button type="button" className={styles.btnSecondary} onClick={onCancel}>
            Hủy
          </button>
          <button type="button" className={styles.btnSubmit} onClick={onConfirm}>
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
