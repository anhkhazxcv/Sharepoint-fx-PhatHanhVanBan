import * as React from 'react';
import { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type { IBanHanhNotifyDraft, TabType } from '../models/PhvbMag.models';
import type { IWorkflowActionAvailability, WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
import { PhvbMagBanHanhDialog } from './PhvbMagBanHanhDialog';
import { PhvbMagBanHanhNotifyDialog } from './PhvbMagBanHanhNotifyDialog';
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
  isBanHanhNotifyLoading?: boolean;
  banHanhErrorMessage?: string;
  banHanhNotifyDraft?: IBanHanhNotifyDraft;
  onOpenPrepareBanHanh?: () => void;
  onPrepareBanHanh?: (notify: IBanHanhNotifyDraft) => Promise<boolean>;
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
      isBanHanhNotifyLoading = false,
      banHanhErrorMessage,
      banHanhNotifyDraft,
      onOpenPrepareBanHanh,
      onPrepareBanHanh,
      onPublishBanHanh
    } = props;
    const tabLabel = TAB_LABELS[tabName] || tabName;
    const [pendingAction, setPendingAction] = useState<WorkflowActionKey | undefined>(undefined);
    const [isCapSoDialogOpen, setIsCapSoDialogOpen] = useState<boolean>(false);
    const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState<boolean>(false);
    const [isPublishDialogOpen, setIsPublishDialogOpen] = useState<boolean>(false);

    const canApprove = Boolean(availableActions?.approve);
    const canRequestRevision = Boolean(availableActions?.requestRevision);
    const canReject = Boolean(availableActions?.reject);
    const hasWorkflowActions = canApprove || canRequestRevision || canReject;
    const hasPostApprovalActions = canAssignDocumentNumber || canPrepareBanHanh || canPublishBanHanh;
    const isWorkflowDialogOpen = Boolean(pendingAction);
    const isAnyDialogOpen =
      isWorkflowDialogOpen ||
      isCapSoDialogOpen ||
      isNotifyDialogOpen ||
      isPublishDialogOpen;
    const isBusy = isProcessing || isCapSoSaving || isBanHanhSaving || isBanHanhNotifyLoading;

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

    const handleOpenPrepare = (): void => {
      if (isBusy) {
        return;
      }

      setIsNotifyDialogOpen(true);

      if (onOpenPrepareBanHanh) {
        onOpenPrepareBanHanh();
      }
    };

    const handleNotifyConfirm = async (notify: IBanHanhNotifyDraft): Promise<void> => {
      if (!onPrepareBanHanh || isBusy) {
        return;
      }

      const succeeded = await onPrepareBanHanh(notify);

      if (succeeded) {
        setIsNotifyDialogOpen(false);
      }
    };

    const handlePublishConfirm = async (): Promise<void> => {
      if (!onPublishBanHanh || isBusy) {
        return;
      }

      const succeeded = await onPublishBanHanh();

      if (succeeded) {
        setIsPublishDialogOpen(false);
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

          {!isNotifyDialogOpen && !isPublishDialogOpen && banHanhErrorMessage ? (
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
                  onClick={handleOpenPrepare}
                >
                  Ban hành
                </button>
              ) : null}

              {canPublishBanHanh ? (
                <button
                  type="button"
                  className={styles.detailActionApprove}
                  disabled={isBusy}
                  onClick={() => setIsPublishDialogOpen(true)}
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

        <PhvbMagBanHanhNotifyDialog
          isOpen={isNotifyDialogOpen}
          isLoading={isBanHanhNotifyLoading}
          isProcessing={isBanHanhSaving}
          errorMessage={isNotifyDialogOpen ? banHanhErrorMessage : undefined}
          draft={banHanhNotifyDraft}
          onCancel={() => {
            if (!isBanHanhSaving && !isBanHanhNotifyLoading) {
              setIsNotifyDialogOpen(false);
            }
          }}
          onConfirm={notify => {
            handleNotifyConfirm(notify).catch(() => undefined);
          }}
        />

        <PhvbMagBanHanhDialog
          isOpen={isPublishDialogOpen}
          action="publish"
          isProcessing={isBanHanhSaving}
          errorMessage={isPublishDialogOpen ? banHanhErrorMessage : undefined}
          onCancel={() => {
            if (!isBanHanhSaving) {
              setIsPublishDialogOpen(false);
            }
          }}
          onConfirm={() => {
            handlePublishConfirm().catch(() => undefined);
          }}
        />
      </div>
    );
  }
);
