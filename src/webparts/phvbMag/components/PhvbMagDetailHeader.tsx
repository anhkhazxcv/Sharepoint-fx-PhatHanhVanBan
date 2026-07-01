import * as React from 'react';
import { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type { TabType } from '../models/PhvbMag.models';
import type { IWorkflowActionAvailability, WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
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
      onAssignDocumentNumber
    } = props;
    const tabLabel = TAB_LABELS[tabName] || tabName;
    const [documentNumberDraft, setDocumentNumberDraft] = useState<string>('');
    const [pendingAction, setPendingAction] = useState<WorkflowActionKey | undefined>(undefined);

    const canApprove = Boolean(availableActions?.approve);
    const canRequestRevision = Boolean(availableActions?.requestRevision);
    const canReject = Boolean(availableActions?.reject);
    const hasAnyAction = canApprove || canRequestRevision || canReject;
    const isDialogOpen = Boolean(pendingAction);

    const openActionDialog = (action: WorkflowActionKey): void => {
      if (isProcessing) {
        return;
      }

      setPendingAction(action);
    };

    const closeActionDialog = (): void => {
      if (isProcessing) {
        return;
      }

      setPendingAction(undefined);
    };

    const handleDialogConfirm = async (comment: string): Promise<void> => {
      if (!onRunAction || !pendingAction || isProcessing) {
        return;
      }

      const succeeded = await onRunAction(pendingAction, comment || undefined);

      if (succeeded) {
        setPendingAction(undefined);
      }
    };

    const canSubmitCapSo = canAssignDocumentNumber && documentNumberDraft.trim().length > 0 && !isCapSoSaving;

    const handleAssignDocumentNumber = async (): Promise<void> => {
      if (!onAssignDocumentNumber || !canSubmitCapSo) {
        return;
      }

      const succeeded = await onAssignDocumentNumber(documentNumberDraft.trim());

      if (succeeded) {
        setDocumentNumberDraft('');
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
          {!isDialogOpen && errorMessage ? (
            <p className={styles.detailActionError} role="alert">{errorMessage}</p>
          ) : null}

          {capSoErrorMessage ? (
            <p className={styles.detailActionError} role="alert">{capSoErrorMessage}</p>
          ) : null}

          {canAssignDocumentNumber ? (
            <div className={styles.detailCapSoBox}>
              <label htmlFor="phvb-detail-document-number">Số văn bản</label>
              <div className={styles.detailCapSoRow}>
                <input
                  id="phvb-detail-document-number"
                  type="text"
                  value={documentNumberDraft}
                  placeholder="Nhập số văn bản..."
                  disabled={isCapSoSaving}
                  onChange={event => setDocumentNumberDraft(event.target.value)}
                />
                <button
                  type="button"
                  className={styles.detailActionCapSo}
                  disabled={!canSubmitCapSo}
                  onClick={() => {
                    handleAssignDocumentNumber().catch(() => undefined);
                  }}
                >
                  {isCapSoSaving ? 'Đang cấp số...' : 'Cấp số'}
                </button>
              </div>
            </div>
          ) : null}

          {hasAnyAction ? (
            <div className={styles.detailActions}>
              <button
                type="button"
                className={styles.detailActionApprove}
                disabled={!canApprove || isProcessing}
                onClick={() => openActionDialog('approve')}
              >
                {approveLabel}
              </button>
              <button
                type="button"
                className={styles.detailActionEdit}
                disabled={!canRequestRevision || isProcessing}
                onClick={() => openActionDialog('requestRevision')}
              >
                Yêu cầu chỉnh sửa
              </button>
              <button
                type="button"
                className={styles.detailActionReject}
                disabled={!canReject || isProcessing}
                onClick={() => openActionDialog('reject')}
              >
                Từ chối
              </button>
            </div>
          ) : null}
        </div>

        <PhvbMagWorkflowActionDialog
          isOpen={isDialogOpen}
          action={pendingAction}
          approveLabel={approveLabel}
          isProcessing={isProcessing}
          errorMessage={isDialogOpen ? errorMessage : undefined}
          onCancel={closeActionDialog}
          onConfirm={comment => {
            handleDialogConfirm(comment).catch(() => undefined);
          }}
        />
      </div>
    );
  }
);
