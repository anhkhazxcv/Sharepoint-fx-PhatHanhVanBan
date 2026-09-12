import * as React from 'react';
import { useState } from 'react';
import type { IBanHanhNotifyDraft, IAttachmentLibraryItem } from '../models/PhvbMag.models';
import type { IWorkflowActionAvailability, WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
import type { CommentConfirmActionKey } from '../utils/PhvbMagWorkflowActionDialog.utils';
import { PhvbMagBanHanhNotifyDialog, type BanHanhNotifyMode, type IBanHanhNotifyConfirmOptions } from './PhvbMagBanHanhNotifyDialog';
import { PhvbMagCapSoDialog } from './PhvbMagCapSoDialog';
import { PhvbMagWorkflowActionDialog } from './PhvbMagWorkflowActionDialog';
import styles from './PhvbMag.module.scss';

/**
 * Mọi prop điều khiển hành động workflow trên trang chi tiết. Tách thành
 * interface riêng để PhvbMagDetailHeader kế thừa thay vì khai lại — trước đây
 * header vừa giữ chrome tiêu đề vừa giữ 9 nút + 3 dialog, nên không thể đặt
 * nhóm nút xuống sticky footer của mobile.
 */
export interface IPhvbMagDetailActionProps {
  approveLabel?: string;
  rejectLabel?: string;
  availableActions?: IWorkflowActionAvailability;
  isProcessing?: boolean;
  errorMessage?: string;
  onRunAction?: (
    action: WorkflowActionKey,
    comment?: string,
    targetParticipantId?: number,
    files?: File[]
  ) => Promise<boolean>;
  transitionLabel?: string;
  canRunTransition?: boolean;
  isTransitionProcessing?: boolean;
  transitionErrorMessage?: string;
  onRunTransition?: () => Promise<boolean>;
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
  storedMainDocumentId?: number;
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
  canResumeDmvlBanHanh?: boolean;
  isDmvlResumeBusy?: boolean;
  dmvlResumeErrorMessage?: string;
  onOpenResumeDmvlBanHanh?: () => void;
  canDuplicate?: boolean;
  onDuplicate?: () => void;
}

interface IPhvbMagDetailActionBarProps extends IPhvbMagDetailActionProps {
  /**
   * 'header' — cụm nút canh phải trong header desktop (hành vi cũ).
   * 'footer' — sticky footer mobile: nút chính chiếm cả dòng, còn lại xếp hàng.
   */
  variant?: 'header' | 'footer';
}

interface IActionButton {
  key: string;
  label: string;
  className: string;
  onClick: () => void;
  /** Nút "đẩy luồng đi tiếp" — lên đầu và chiếm cả dòng ở footer mobile. */
  isPrimary?: boolean;
}

export function PhvbMagDetailActionBar(
  props: IPhvbMagDetailActionBarProps
): React.ReactElement {
  const {
    variant = 'header',
    approveLabel = 'Phê duyệt',
    rejectLabel = 'Từ chối',
    availableActions,
    isProcessing = false,
    errorMessage,
    onRunAction,
    transitionLabel = 'Chuyển giai đoạn',
    canRunTransition = false,
    isTransitionProcessing = false,
    transitionErrorMessage,
    onRunTransition,
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
    storedMainDocumentId,
    onOpenPrepareBanHanh,
    onOpenPublishBanHanh,
    onOpenEditBanHanhNotify,
    onPrepareBanHanh,
    onPublishBanHanh,
    onUpdateBanHanhNotify,
    onReturnBanHanhToAdmin,
    canResumeDmvlBanHanh = false,
    isDmvlResumeBusy = false,
    dmvlResumeErrorMessage,
    onOpenResumeDmvlBanHanh,
    canDuplicate = false,
    onDuplicate
  } = props;

  const [pendingAction, setPendingAction] = useState<CommentConfirmActionKey | undefined>(undefined);
  const [isCapSoDialogOpen, setIsCapSoDialogOpen] = useState<boolean>(false);
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState<boolean>(false);

  const canApprove = Boolean(availableActions?.approve);
  const canReject = Boolean(availableActions?.reject);
  const isWorkflowDialogOpen = Boolean(pendingAction);
  const isAnyDialogOpen =
    isWorkflowDialogOpen ||
    isCapSoDialogOpen ||
    isNotifyDialogOpen;
  const isBusy =
    isProcessing ||
    isCapSoSaving ||
    isBanHanhSaving ||
    isBanHanhNotifyLoading ||
    isDmvlResumeBusy ||
    isTransitionProcessing;

  const openActionDialog = (action: WorkflowActionKey): void => {
    if (isBusy) {
      return;
    }

    setPendingAction(action);
  };

  const handleRunTransitionClick = (): void => {
    if (isBusy || !onRunTransition) {
      return;
    }

    onRunTransition().catch(() => undefined);
  };

  const closeActionDialog = (): void => {
    if (isBusy) {
      return;
    }

    setPendingAction(undefined);
  };

  const handleDialogConfirm = async (comment: string, files: File[]): Promise<void> => {
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

    if (pendingAction === 'advanceStage') {
      return;
    }

    if (!onRunAction) {
      return;
    }

    const succeeded = await onRunAction(pendingAction, comment || undefined, undefined, files);

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

  // Danh sách nút dựng theo THỨ TỰ và ĐIỀU KIỆN y như bản trong header cũ, chỉ
  // chuyển thành dữ liệu để hai variant render lại từ cùng một nguồn.
  const actionButtons: IActionButton[] = [];

  if (canResumeDmvlBanHanh) {
    actionButtons.push({
      key: 'resumeDmvl',
      label: 'Tiếp tục ban hành DMVL',
      className: styles.detailActionApprove,
      onClick: () => onOpenResumeDmvlBanHanh?.(),
      isPrimary: true
    });
  }

  if (canAssignDocumentNumber) {
    actionButtons.push({
      key: 'capSo',
      label: 'Cấp số',
      className: styles.detailActionCapSo,
      onClick: () => setIsCapSoDialogOpen(true),
      isPrimary: true
    });
  }

  if (canPrepareBanHanh) {
    actionButtons.push({
      key: 'prepareBanHanh',
      label: 'Gửi ban hành',
      className: styles.detailActionApprove,
      onClick: handleOpenPrepare,
      isPrimary: true
    });
  }

  if (canPublishBanHanh) {
    actionButtons.push({
      key: 'publishBanHanh',
      label: 'Ban hành',
      className: styles.detailActionApprove,
      onClick: handleOpenPublish,
      isPrimary: true
    });
  }

  if (canEditBanHanhNotify) {
    actionButtons.push({
      key: 'editBanHanhNotify',
      label: 'Chỉnh sửa nội dung ban hành',
      className: styles.detailActionEdit,
      onClick: handleOpenEditNotify
    });
  }

  if (canDuplicate) {
    actionButtons.push({
      key: 'duplicate',
      label: 'Tạo bản sao',
      className: styles.detailActionEdit,
      onClick: () => onDuplicate?.()
    });
  }

  if (canRunTransition) {
    actionButtons.push({
      key: 'transition',
      label: transitionLabel,
      className: styles.detailActionApprove,
      onClick: handleRunTransitionClick,
      isPrimary: true
    });
  }

  if (canApprove) {
    actionButtons.push({
      key: 'approve',
      label: approveLabel,
      className: styles.detailActionApprove,
      onClick: () => openActionDialog('approve'),
      isPrimary: true
    });
  }

  if (canReject) {
    actionButtons.push({
      key: 'reject',
      label: rejectLabel,
      className: styles.detailActionReject,
      onClick: () => openActionDialog('reject')
    });
  }

  const errorMessages = [
    !isAnyDialogOpen ? errorMessage : undefined,
    !isCapSoDialogOpen ? capSoErrorMessage : undefined,
    !isNotifyDialogOpen ? banHanhErrorMessage : undefined,
    !isDmvlResumeBusy ? dmvlResumeErrorMessage : undefined,
    !isAnyDialogOpen ? transitionErrorMessage : undefined
  ].filter(Boolean) as string[];

  const renderButton = (button: IActionButton): React.ReactElement => (
    <button
      key={button.key}
      type="button"
      className={button.className}
      disabled={isBusy}
      onClick={button.onClick}
    >
      {button.label}
    </button>
  );

  const dialogs = (
    <>
      <PhvbMagWorkflowActionDialog
        isOpen={isWorkflowDialogOpen}
        action={pendingAction}
        approveLabel={pendingAction === 'reject' ? rejectLabel : approveLabel}
        isProcessing={pendingAction === 'returnBanHanhToAdmin' ? isBanHanhSaving : isProcessing}
        errorMessage={
          isWorkflowDialogOpen
            ? pendingAction === 'returnBanHanhToAdmin'
              ? banHanhErrorMessage
              : errorMessage
            : undefined
        }
        onCancel={closeActionDialog}
        onConfirm={(comment, files) => {
          handleDialogConfirm(comment, files).catch(() => undefined);
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
        storedMainDocumentId={storedMainDocumentId}
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
    </>
  );

  if (variant === 'footer') {
    // Không có nút nào khả dụng thì không chiếm chỗ ở đáy màn hình — nhưng
    // dialog vẫn phải mount để lần mở trước đó còn hiển thị được.
    if (actionButtons.length === 0) {
      return <>{dialogs}</>;
    }

    const primaryButtons = actionButtons.filter(button => button.isPrimary);
    const leadButton = primaryButtons.length > 0 ? primaryButtons[0] : actionButtons[0];
    const restButtons = actionButtons.filter(button => button.key !== leadButton.key);

    return (
      <>
        <div className={styles.mobileActionFooter}>
          {canResumeDmvlBanHanh ? (
            <div className={styles.connectionBanner} role="status">
              <span>
                Yêu cầu chưa ban hành. Vui lòng chọn văn bản chính và xác nhận ban hành.
              </span>
            </div>
          ) : null}

          {errorMessages.map((message, index) => (
            <p
              key={`action-error-${index}`}
              className={styles.detailActionError}
              role="alert"
            >
              {message}
            </p>
          ))}

          {renderButton(leadButton)}

          {restButtons.length > 0 ? (
            <div className={styles.mobileActionFooterRow}>
              {restButtons.map(renderButton)}
            </div>
          ) : null}
        </div>
        {dialogs}
      </>
    );
  }

  return (
    <div className={styles.detailHeaderActionsArea}>
      {canResumeDmvlBanHanh ? (
        <div className={styles.connectionBanner} role="status">
          <span>
            Yêu cầu chưa ban hành. Vui lòng chọn văn bản chính và xác nhận ban hành.
          </span>
        </div>
      ) : null}

      {errorMessages.map((message, index) => (
        <p key={`action-error-${index}`} className={styles.detailActionError} role="alert">
          {message}
        </p>
      ))}

      {actionButtons.length > 0 ? (
        <div className={styles.detailActions}>{actionButtons.map(renderButton)}</div>
      ) : null}

      {dialogs}
    </div>
  );
}
