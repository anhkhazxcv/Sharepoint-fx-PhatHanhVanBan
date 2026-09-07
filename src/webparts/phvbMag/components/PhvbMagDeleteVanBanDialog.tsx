import * as React from 'react';
import { REQUEST_STATUS } from '../config/PhvbMag.configuration';
import type { IVanBanItem } from '../models/PhvbMag.models';
import { PhvbMagButton } from './primitives/PhvbMagButton';
import { PhvbMagDialog } from './primitives/PhvbMagDialog';

interface IPhvbMagDeleteVanBanDialogProps {
  isOpen: boolean;
  item?: IVanBanItem;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PhvbMagDeleteVanBanDialog(props: IPhvbMagDeleteVanBanDialogProps): React.ReactElement {
  const { isOpen, item, isDeleting, onCancel, onConfirm } = props;

  if (!isOpen || !item) {
    return <></>;
  }

  return (
    <PhvbMagDialog
      isOpen={isOpen}
      title="Xác nhận xóa văn bản"
      titleId="phvb-delete-van-ban-title"
      variant="confirm"
      onDismiss={isDeleting ? undefined : onCancel}
      footer={(
        <>
          <PhvbMagButton variant="secondary" onClick={onCancel} disabled={isDeleting}>
            Hủy
          </PhvbMagButton>
          <PhvbMagButton variant="submit" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
          </PhvbMagButton>
        </>
      )}
    >
      <p>
        Bạn có chắc chắn muốn xóa văn bản &quot;{item.Tenvanban || item.IdYeuCau || 'này'}&quot;?
      </p>
      <p>
        Toàn bộ dữ liệu liên quan sẽ bị xóa: người góp ý/thẩm định/phê duyệt, lịch sử thực hiện, bình luận và tài liệu đính kèm. Hành động này không thể hoàn tác.
      </p>
      {item.StatusApproved === REQUEST_STATUS.BAN_HANH ? (
        <p>
          Văn bản này đã Ban hành — file trong thư viện phát hành chính thức sẽ được giữ nguyên, chỉ yêu cầu và dữ liệu liên quan ở trên bị xóa.
        </p>
      ) : null}
    </PhvbMagDialog>
  );
}
