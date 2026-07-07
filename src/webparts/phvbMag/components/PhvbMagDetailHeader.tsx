import * as React from 'react';
import { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type { TabType } from '../models/PhvbMag.models';
import type { IWorkflowActionAvailability, WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
import { PhvbMagBanHanhDialog, type BanHanhDialogAction } from './PhvbMagBanHanhDialog';
import { PhvbMagCapSoDialog } from './PhvbMagCapSoDialog';
import { PhvbMagWorkflowActionDialog } from './PhvbMagWorkflowActionDialog';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailHeaderProps {
  tabName: TabType;
  title: string;
  className?: string;
  approveLabel?: string;
  availableActions?: IWorkflowActionAvailability;
  isProcessing?: boolean;
  errorMessage?: string;
  onRunAction?: (action: WorkflowActionKey, comment?: string) => Promise<boolean>;
  canAssignDocumentNumber?: boolean;
  isCapSoSaving?: boolean;
  capSoErrorMessage?: string;
  onAssignDocumentNumber?: (soVanBan: string) => Promise<boolean>;
  canPrepareBanHanh?: boolean;
  canPublishBanHanh?: boolean;
  isBanHanhSaving?: boolean;
  banHanhErrorMessage?: string;
  onPrepareBanHanh?: () => Promise<boolean>;
  onPublishBanHanh?: () => Promise<boolean>;
}

export const PhvbMagDetailHeader = forwardRef<HTMLDivElement, IPhvbMagDetailHeaderProps>(
  function PhvbMagDetailHeader(props, ref): React.ReactElement {
    const {
      tabName,
      title,
      className,
      approveLabel = 'Phê duyệt',
      availableActions,
      isProcessing = false,
      errorMessage,
      onRunAction,
      canAssignDocumentNumber = false,
      isCapSoSaving = false,
      capSoErrorMessage,
      onAssignDocumentNumber,
      canPrepareBanHanh = false,
      canPublishBanHanh = false,
      isBanHanhSaving = false,
      banHanhErrorMessage,
      onPrepareBanHanh,
      onPublishBanHanh
    } = props;
    const tabLabel = TAB_LABELS[tabName] || tabName;
    const [pendingAction, setPendingAction] = useState<WorkflowActionKey | undefined>(undefined);
    const [isCapSoDialogOpen, setIsCapSoDialogOpen] = useState<boolean>(false);
    const [pendingBanHanhAction, setPendingBanHanhAction] = useState<BanHanhDialogAction | undefined>(undefined);

    const canApprove = Boolean(availableActions?.approve);
    const canRequestRevision = Boolean(availableActions?.requestRevision);
    const canReject = Boolean(availableActions?.reject);
    const hasWorkflowActions = canApprove || canRequestRevision || canReject;
    const hasPostApprovalActions = canAssignDocumentNumber || canPrepareBanHanh || canPublishBanHanh;
    const isWorkflowDialogOpen = Boolean(pendingAction);
    const isBanHanhDialogOpen = Boolean(pendingBanHanhAction);
    const isAnyDialogOpen = isWorkflowDialogOpen || isCapSoDialogOpen || isBanHanhDialogOpen;
    const isBusy = isProcessing || isCapSoSaving || isBanHanhSaving;

    const openActionDialog = (action: WorkflowActionKey): void => {
      if (isBusy) {
        return;
      }

      setPendingAction(action);
    };

    const closeActionDialog = (): void => {
      if (isBusy) {
        return;
      }

      setPendingAction(undefined);
    };

    const handleDialogConfirm = async (comment: string): Promise<void> => {
      if (!onRunAction || !pendingAction || isBusy) {
        return;
      }

      const succeeded = await onRunAction(pendingAction, comment || undefined);

      if (succeeded) {
        setPendingAction(undefined);
      }
    };

    const handleCapSoConfirm = async (soVanBan: string): Promise<void> => {
      if (!onAssignDocumentNumber || isBusy) {
        return;
      }

      const succeeded = await onAssignDocumentNumber(soVanBan);

      if (succeeded) {
        setIsCapSoDialogOpen(false);
      }
    };

    const handleBanHanhConfirm = async (): Promise<void> => {
      if (isBusy || !pendingBanHanhAction) {
        return;
      }

      let succeeded = false;

      if (pendingBanHanhAction === 'prepare' && onPrepareBanHanh) {
        succeeded = await onPrepareBanHanh();
      }

      if (pendingBanHanhAction === 'publish' && onPublishBanHanh) {
        succeeded = await onPublishBanHanh();
      }

      if (succeeded) {
        setPendingBanHanhAction(undefined);
      }
    };

    return (
      <div
        ref={ref}
        className={[styles.detailHeader, className || ''].filter(Boolean).join(' ')}
      >
        <div className={styles.detailHeaderMain}>
          <nav className={styles.detailBreadcrumb} aria-label="Breadcrumb">
            <Link to={`/tab/${tabName}`} className={styles.detailBreadcrumbLink}>
              Trang chủ
            </Link>
            <span className={styles.detailBreadcrumbSep}>&gt;</span>
            <Link to={`/tab/${tabName}`} className={styles.detailBreadcrumbLink}>
              {tabLabel}
            </Link>
            <span className={styles.detailBreadcrumbSep}>&gt;</span>
            <span className={styles.detailBreadcrumbCurrent}>{title}</span>
          </nav>
          <h1 className={styles.detailTitle}>{title}</h1>
        </div>

        <div className={styles.detailHeaderActionsArea}>
          {!isAnyDialogOpen && errorMessage ? (
            <p className={styles.detailActionError} role="alert">{errorMessage}</p>
          ) : null}

          {!isCapSoDialogOpen && capSoErrorMessage ? (
            <p className={styles.detailActionError} role="alert">{capSoErrorMessage}</p>
          ) : null}

          {!isBanHanhDialogOpen && banHanhErrorMessage ? (
            <p className={styles.detailActionError} role="alert">{banHanhErrorMessage}</p>
          ) : null}

          {hasPostApprovalActions || hasWorkflowActions ? (
            <div className={styles.detailActions}>
              {canAssignDocumentNumber ? (
                <button
                  type="button"
                  className={styles.detailActionCapSo}
                  disabled={isBusy}
                  onClick={() => setIsCapSoDialogOpen(true)}
                >
                  Cấp số
                </button>
              ) : null}

              {canPrepareBanHanh ? (
                <button
                  type="button"
                  className={styles.detailActionApprove}
                  disabled={isBusy}
                  onClick={() => setPendingBanHanhAction('prepare')}
                >
                  Ban hành
                </button>
              ) : null}

              {canPublishBanHanh ? (
                <button
                  type="button"
                  className={styles.detailActionApprove}
                  disabled={isBusy}
                  onClick={() => setPendingBanHanhAction('publish')}
                >
                  Ban hành văn bản
                </button>
              ) : null}

              {canApprove ? (
                <button
                  type="button"
                  className={styles.detailActionApprove}
                  disabled={isBusy}
                  onClick={() => openActionDialog('approve')}
                >
                  {approveLabel}
                </button>
              ) : null}

              {canRequestRevision ? (
                <button
                  type="button"
                  className={styles.detailActionEdit}
                  disabled={isBusy}
                  onClick={() => openActionDialog('requestRevision')}
                >
                  Yêu cầu chỉnh sửa
                </button>
              ) : null}

              {canReject ? (
                <button
                  type="button"
                  className={styles.detailActionReject}
                  disabled={isBusy}
                  onClick={() => openActionDialog('reject')}
                >
                  Từ chối
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <PhvbMagWorkflowActionDialog
          isOpen={isWorkflowDialogOpen}
          action={pendingAction}
          approveLabel={approveLabel}
          isProcessing={isProcessing}
          errorMessage={isWorkflowDialogOpen ? errorMessage : undefined}
          onCancel={closeActionDialog}
          onConfirm={comment => {
            handleDialogConfirm(comment).catch(() => undefined);
          }}
        />

        <PhvbMagCapSoDialog
          isOpen={isCapSoDialogOpen}
          isProcessing={isCapSoSaving}
          errorMessage={isCapSoDialogOpen ? capSoErrorMessage : undefined}
          onCancel={() => {
            if (!isCapSoSaving) {
              setIsCapSoDialogOpen(false);
            }
          }}
          onConfirm={soVanBan => {
            handleCapSoConfirm(soVanBan).catch(() => undefined);
          }}
        />

        <PhvbMagBanHanhDialog
          isOpen={isBanHanhDialogOpen}
          action={pendingBanHanhAction}
          isProcessing={isBanHanhSaving}
          errorMessage={isBanHanhDialogOpen ? banHanhErrorMessage : undefined}
          onCancel={() => {
            if (!isBanHanhSaving) {
              setPendingBanHanhAction(undefined);
            }
          }}
          onConfirm={() => {
            handleBanHanhConfirm().catch(() => undefined);
          }}
        />
      </div>
    );
  }
);
