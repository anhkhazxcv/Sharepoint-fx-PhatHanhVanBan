import * as React from 'react';
import type { ISelectedBanHanhFolder } from '../models/PhvbMag.models';
import { PhvbMagButton } from './primitives/PhvbMagButton';
import { PhvbMagDialog } from './primitives/PhvbMagDialog';

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
    <PhvbMagDialog
      isOpen={isOpen}
      title="Xác nhận lựa chọn"
      titleId="phvb-folder-confirm-title"
      variant="confirm"
      onDismiss={onCancel}
      footer={(
        <>
          <PhvbMagButton variant="secondary" onClick={onCancel}>
            Hủy
          </PhvbMagButton>
          <PhvbMagButton variant="submit" onClick={onConfirm}>
            Xác nhận
          </PhvbMagButton>
        </>
      )}
    >
      <p>{buildConfirmMessage(requestType, selectedFolder.name)}</p>
    </PhvbMagDialog>
  );
}
