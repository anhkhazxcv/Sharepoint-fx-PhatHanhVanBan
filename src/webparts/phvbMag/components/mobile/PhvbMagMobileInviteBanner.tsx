import * as React from 'react';
import type { IVanBanItem } from '../../models/PhvbMag.models';
import type { WorkflowDocumentStage } from '../../utils/PhvbMagWorkflowState.utils';
import { resolveWorkflowStageFromStatus } from '../../utils/PhvbMagWorkflowState.utils';
import styles from '../PhvbMag.module.scss';
import { MobileCommentIcon } from '../PhvbMagIcons';

/** Nhãn hành động người dùng được mời làm, theo giai đoạn đang mở. */
const STAGE_INVITE_LABEL: Partial<Record<WorkflowDocumentStage, string>> = {
  gopy: 'góp ý',
  thamdinh: 'thẩm định',
  pheduyet: 'phê duyệt'
};

interface IPhvbMagMobileInviteBannerProps {
  release: IVanBanItem;
  /** Chỉ hiện banner khi người dùng thật sự có hành động chờ ở giai đoạn này. */
  isInvited: boolean;
}

export function PhvbMagMobileInviteBanner(
  props: IPhvbMagMobileInviteBannerProps
): React.ReactElement {
  const { release, isInvited } = props;

  if (!isInvited) {
    return <></>;
  }

  const stage = resolveWorkflowStageFromStatus(release.StatusApproved);
  const actionLabel = STAGE_INVITE_LABEL[stage];

  if (!actionLabel) {
    return <></>;
  }

  const requester = (release.NguoiTao || '').trim();

  return (
    <div className={styles.mobileInviteBanner} role="status">
      <MobileCommentIcon />
      <span>
        <strong>Bạn được mời {actionLabel} văn bản này</strong>
        {requester ? <span>{`${requester} yêu cầu`}</span> : null}
      </span>
    </div>
  );
}
