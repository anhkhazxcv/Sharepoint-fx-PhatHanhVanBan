import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { getParticipantDisplayInitials } from '../utils/PhvbMagWorkflowParticipant.utils';
import type { IRemindDeadlineContext } from '../utils/PhvbMagRemindDeadline.utils';
import styles from './PhvbMag.module.scss';

interface IPhvbMagRemindDeadlineDialogProps {
  isOpen: boolean;
  isProcessing?: boolean;
  errorMessage?: string;
  context?: IRemindDeadlineContext;
  onCancel: () => void;
  onConfirm: (selectedRecipientIds: string[]) => void;
}

export function PhvbMagRemindDeadlineDialog(props: IPhvbMagRemindDeadlineDialogProps): React.ReactElement {
  const {
    isOpen,
    isProcessing = false,
    errorMessage,
    context,
    onCancel,
    onConfirm
  } = props;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [validationError, setValidationError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isOpen || !context) {
      return;
    }

    setSelectedIds(context.recipients.map(recipient => recipient.id));
    setSearchQuery('');
    setValidationError(undefined);
  }, [isOpen, context]);

  const filteredRecipients = useMemo(() => {
    if (!context) {
      return [];
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return context.recipients;
    }

    return context.recipients.filter(recipient =>
      recipient.displayName.toLowerCase().indexOf(normalizedQuery) > -1 ||
      recipient.email.toLowerCase().indexOf(normalizedQuery) > -1 ||
      Boolean(recipient.subtitle && recipient.subtitle.toLowerCase().indexOf(normalizedQuery) > -1)
    );
  }, [context, searchQuery]);

  if (!isOpen) {
    return <></>;
  }

  const displayedError = validationError || errorMessage;
  const isBusy = isProcessing;
  const allFilteredSelected =
    filteredRecipients.length > 0 &&
    filteredRecipients.every(recipient => selectedIds.indexOf(recipient.id) > -1);
  const selectedCount = context
    ? context.recipients.filter(recipient => selectedIds.indexOf(recipient.id) > -1).length
    : 0;

  const toggleRecipient = (recipientId: string): void => {
    if (isBusy) {
      return;
    }

    setSelectedIds(previous => {
      if (previous.indexOf(recipientId) > -1) {
        return previous.filter(id => id !== recipientId);
      }

      return previous.concat(recipientId);
    });

    if (validationError) {
      setValidationError(undefined);
    }
  };

  const handleSelectAllFiltered = (): void => {
    if (isBusy) {
      return;
    }

    setSelectedIds(previous => {
      const next = previous.slice();
      filteredRecipients.forEach(recipient => {
        if (next.indexOf(recipient.id) === -1) {
          next.push(recipient.id);
        }
      });
      return next;
    });

    if (validationError) {
      setValidationError(undefined);
    }
  };

  const handleClearAllFiltered = (): void => {
    if (isBusy) {
      return;
    }

    const filteredIdSet = filteredRecipients.map(recipient => recipient.id);
    setSelectedIds(previous => previous.filter(id => filteredIdSet.indexOf(id) === -1));
  };

  const handleSelectAll = (): void => {
    if (isBusy || !context) {
      return;
    }

    setSelectedIds(context.recipients.map(recipient => recipient.id));

    if (validationError) {
      setValidationError(undefined);
    }
  };

  const handleClearAll = (): void => {
    if (isBusy) {
      return;
    }

    setSelectedIds([]);

    if (validationError) {
      setValidationError(undefined);
    }
  };

  const handleConfirm = (): void => {
    if (selectedCount === 0) {
      setValidationError('Vui lòng chọn ít nhất một người nhận.');
      return;
    }

    setValidationError(undefined);
    onConfirm(selectedIds.slice());
  };

  return (
    <div className={styles.modalOverlay}>
      <div
        className={styles.remindDeadlineModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="phvb-remind-deadline-title"
      >
        <div className={styles.remindDeadlineHeader}>
          <h4 id="phvb-remind-deadline-title">Nhắc hạn</h4>
        </div>

        <div className={styles.remindDeadlineBody}>
          {context ? (
            <>
              <p className={styles.remindDeadlineDescription}>
                <strong>{context.statusLabel}</strong>
                {' — '}
                {context.description}
              </p>

              <div className={styles.remindDeadlineToolbar}>
                <div className={styles.remindDeadlineToolbarActions}>
                  <button
                    type="button"
                    className={styles.remindDeadlineToolbarBtn}
                    disabled={isBusy || !context.recipients.length}
                    onClick={handleSelectAll}
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    className={styles.remindDeadlineToolbarBtn}
                    disabled={isBusy || selectedCount === 0}
                    onClick={handleClearAll}
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
                <span className={styles.remindDeadlineSelectedCount}>
                  Đã chọn {selectedCount}/{context.recipients.length}
                </span>
              </div>

              <div className={styles.remindDeadlineSearchRow}>
                <input
                  type="search"
                  className={styles.remindDeadlineSearchInput}
                  value={searchQuery}
                  disabled={isBusy}
                  placeholder="Tìm theo tên hoặc email..."
                  aria-label="Tìm người nhận"
                  onChange={event => setSearchQuery(event.target.value)}
                />
                {searchQuery.trim() ? (
                  <div className={styles.remindDeadlineFilterActions}>
                    <button
                      type="button"
                      className={styles.remindDeadlineToolbarBtn}
                      disabled={isBusy || filteredRecipients.length === 0}
                      onClick={handleSelectAllFiltered}
                    >
                      Chọn kết quả lọc
                    </button>
                    <button
                      type="button"
                      className={styles.remindDeadlineToolbarBtn}
                      disabled={isBusy || !allFilteredSelected}
                      onClick={handleClearAllFiltered}
                    >
                      Bỏ chọn kết quả lọc
                    </button>
                  </div>
                ) : null}
              </div>

              <div className={styles.remindDeadlineList} role="list">
                {filteredRecipients.length === 0 ? (
                  <p className={styles.remindDeadlineEmpty}>Không tìm thấy người nhận phù hợp.</p>
                ) : (
                  filteredRecipients.map(recipient => {
                    const isSelected = selectedIds.indexOf(recipient.id) > -1;

                    return (
                      <label
                        key={recipient.id}
                        className={[
                          styles.remindDeadlineRow,
                          isSelected ? styles.remindDeadlineRowSelected : ''
                        ].filter(Boolean).join(' ')}
                        role="listitem"
                      >
                        <input
                          type="checkbox"
                          className={styles.remindDeadlineCheckbox}
                          checked={isSelected}
                          disabled={isBusy}
                          onChange={() => toggleRecipient(recipient.id)}
                        />
                        <span className={styles.remindDeadlineAvatar} aria-hidden="true">
                          {getParticipantDisplayInitials(recipient.displayName)}
                        </span>
                        <span className={styles.remindDeadlineInfo}>
                          <span className={styles.remindDeadlineName}>{recipient.displayName}</span>
                          <span className={styles.remindDeadlineEmail}>{recipient.email}</span>
                          {recipient.subtitle ? (
                            <span className={styles.remindDeadlineSubtitle}>{recipient.subtitle}</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <p className={styles.remindDeadlineEmpty}>Không có dữ liệu người nhận.</p>
          )}

          {displayedError ? (
            <p className={styles.remindDeadlineError} role="alert">{displayedError}</p>
          ) : null}
        </div>

        <div className={styles.remindDeadlineActions}>
          <button
            type="button"
            className={styles.remindDeadlineCancelBtn}
            disabled={isBusy}
            onClick={onCancel}
          >
            Hủy
          </button>
          <button
            type="button"
            className={styles.remindDeadlineSendBtn}
            disabled={isBusy || !context || selectedCount === 0}
            onClick={handleConfirm}
          >
            {isProcessing ? 'Đang gửi...' : 'Gửi nhắc hạn'}
          </button>
        </div>
      </div>
    </div>
  );
}
