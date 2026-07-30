import * as React from 'react';
import { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type { IBanHanhNotifyDraft, IAttachmentLibraryItem, TabType } from '../models/PhvbMag.models';
import type { IWorkflowActionAvailability, WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
import type { CommentConfirmActionKey } from '../utils/PhvbMagWorkflowActionDialog.utils';
import { PhvbMagBanHanhNotifyDialog, type BanHanhNotifyMode, type IBanHanhNotifyConfirmOptions } from './PhvbMagBanHanhNotifyDialog';
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
  canEditBanHanhNotify?: boolean;
  isBanHanhSaving?: boolean;
  isBanHanhNotifyLoading?: boolean;
  banHanhErrorMessage?: string;
  banHanhNotifyDraft?: IBanHanhNotifyDraft;
  banHanhNotifyMode?: BanHanhNotifyMode;
  requireMainDocument?: boolean;
  mainDocumentReadOnly?: boolean;
  mainDocumentCandidates?: ReadonlyArray<IAttachmentLibraryItem>;
  onOpenPrepareBanHanh?: () => void;
  onOpenPublishBanHanh?: () => void;
  onOpenEditBanHanhNotify?: () => void;
  onPrepareBanHanh?: (notify: IBanHanhNotifyDraft, mainDocumentId?: number) => Promise<boolean>;
  onPublishBanHanh?: (mainDocumentId?: number) => Promise<boolean>;
  onUpdateBanHanhNotify?: (
    notify: IBanHanhNotifyDraft,
    mainDocumentId?: number
  ) => Promise<boolean>;
  onReturnBanHanhToAdmin?: (comment: string) => Promise<boolean>;
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
      canEditBanHanhNotify = false,
      isBanHanhSaving = false,
      isBanHanhNotifyLoading = false,
      banHanhErrorMessage,
      banHanhNotifyDraft,
      banHanhNotifyMode = 'prepare',
      requireMainDocument = false,
      mainDocumentReadOnly = false,
      mainDocumentCandidates = [],
      onOpenPrepareBanHanh,
      onOpenPublishBanHanh,
      onOpenEditBanHanhNotify,
      onPrepareBanHanh,
      onPublishBanHanh,
      onUpdateBanHanhNotify,
      onReturnBanHanhToAdmin
    } = props;
    const tabLabel = TAB_LABELS[tabName] || tabName;
    const [pendingAction, setPendingAction] = useState<CommentConfirmActionKey | undefined>(undefined);
    const [isCapSoDialogOpen, setIsCapSoDialogOpen] = useState<boolean>(false);
    const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState<boolean>(false);

    const canApprove = Boolean(availableActions?.approve);
    const canRequestRevision = Boolean(availableActions?.requestRevision);
    const canReject = Boolean(availableActions?.reject);
    const hasWorkflowActions = canApprove || canRequestRevision || canReject;
    const hasPostApprovalActions =
      canAssignDocumentNumber || canPrepareBanHanh || canPublishBanHanh || canEditBanHanhNotify;
    const isWorkflowDialogOpen = Boolean(pendingAction);
    const isAnyDialogOpen =
      isWorkflowDialogOpen ||
      isCapSoDialogOpen ||
      isNotifyDialogOpen;
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
      if (!pendingAction || isBusy) {
        return;
      }

      if (pendingAction === 'returnBanHanhToAdmin') {
        if (!onReturnBanHanhToAdmin) {
          return;
        }

        const succeeded = await onReturnBanHanhToAdmin(comment);

        if (succeeded) {
          setPendingAction(undefined);
          setIsNotifyDialogOpen(false);
        }

        return;
      }

      if (!onRunAction) {
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

    const handleOpenPublish = (): void => {
      if (isBusy) {
        return;
      }

      setIsNotifyDialogOpen(true);

      if (onOpenPublishBanHanh) {
        onOpenPublishBanHanh();
      }
    };

    const handleOpenEditNotify = (): void => {
      if (isBusy) {
        return;
      }

      setIsNotifyDialogOpen(true);

      if (onOpenEditBanHanhNotify) {
        onOpenEditBanHanhNotify();
      }
    };

    const handleNotifyConfirm = async (
      notify: IBanHanhNotifyDraft,
      options?: IBanHanhNotifyConfirmOptions
    ): Promise<void> => {
      if (isBusy) {
        return;
      }

      if (banHanhNotifyMode === 'publish') {
        if (!onPublishBanHanh) {
          return;
        }

        const succeeded = await onPublishBanHanh(options?.mainDocumentId);

        if (succeeded) {
          setIsNotifyDialogOpen(false);
        }

        return;
      }

      if (banHanhNotifyMode === 'edit') {
        if (!onUpdateBanHanhNotify) {
          return;
        }

        const succeeded = await onUpdateBanHanhNotify(notify, options?.mainDocumentId);

        if (succeeded) {
          setIsNotifyDialogOpen(false);
        }

        return;
      }

      if (!onPrepareBanHanh) {
        return;
      }

      const succeeded = await onPrepareBanHanh(notify, options?.mainDocumentId);

      if (succeeded) {
        setIsNotifyDialogOpen(false);
      }
    };

    const handleReturnToAdmin = (): void => {
      if (isBusy || !onReturnBanHanhToAdmin) {
        return;
      }

      setPendingAction('returnBanHanhToAdmin');
    };

    return (
      <div
        ref={ref}
        className={[styles.detailHeader, className || ''].filter(Boolean).join(' ')}
      >
        <div className={styles.detailHeaderMain}>
          <nav className={styles.detailBreadcrumb} aria-label="Breadcrumb">
            <Link to="/tab/ViecCanLam" className={styles.detailBreadcrumbLink}>
              {TAB_LABELS.ViecCanLam}
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

          {!isNotifyDialogOpen && banHanhErrorMessage ? (
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
                  Gửi ban hành
                </button>
              ) : null}

              {canPublishBanHanh ? (
                <button
                  type="button"
                  className={styles.detailActionApprove}
                  disabled={isBusy}
                  onClick={handleOpenPublish}
                >
                  Ban hành
                </button>
              ) : null}

              {canEditBanHanhNotify ? (
                <button
                  type="button"
                  className={styles.detailActionEdit}
                  disabled={isBusy}
                  onClick={handleOpenEditNotify}
                >
                  Chỉnh sửa nội dung ban hành
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
          isProcessing={pendingAction === 'returnBanHanhToAdmin' ? isBanHanhSaving : isProcessing}
          errorMessage={
            isWorkflowDialogOpen
              ? pendingAction === 'returnBanHanhToAdmin'
                ? banHanhErrorMessage
                : errorMessage
              : undefined
          }
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
          mode={banHanhNotifyMode}
          requireMainDocument={requireMainDocument}
          mainDocumentReadOnly={mainDocumentReadOnly}
          mainDocumentCandidates={mainDocumentCandidates}
          isLoading={isBanHanhNotifyLoading}
          isProcessing={isBanHanhSaving}
          errorMessage={isNotifyDialogOpen ? banHanhErrorMessage : undefined}
          draft={banHanhNotifyDraft}
          onCancel={() => {
            if (!isBanHanhSaving && !isBanHanhNotifyLoading) {
              setIsNotifyDialogOpen(false);
            }
          }}
          onConfirm={(notify, options) => {
            handleNotifyConfirm(notify, options).catch(() => undefined);
          }}
          onReturnToAdmin={
            banHanhNotifyMode === 'publish' && onReturnBanHanhToAdmin
              ? handleReturnToAdmin
              : undefined
          }
        />
      </div>
    );
  }
);
