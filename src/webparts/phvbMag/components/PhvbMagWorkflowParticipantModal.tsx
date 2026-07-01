import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { IPhvbDirectoryUser, IRequestDetailData, WorkflowStage } from '../models/PhvbMag.models';
import {
  buildInitialParticipantDraft,
  canRemoveWorkflowParticipant,
  getParticipantDisplayInitials,
  getVisibleParticipantStages,
  isEmailAlreadyInStageDraft,
  IWorkflowParticipantDraftRow,
  IWorkflowParticipantsByStage,
  WORKFLOW_PARTICIPANT_STAGE_CONFIG
} from '../utils/PhvbMagWorkflowParticipant.utils';
import styles from './PhvbMag.module.scss';
import { CloseIcon, DeleteFileIcon } from './PhvbMagIcons';

interface IPhvbMagWorkflowParticipantModalProps {
  isOpen: boolean;
  detail?: IRequestDetailData;
  directoryUsers: ReadonlyArray<IPhvbDirectoryUser>;
  isSaving?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSave: (
    initialDraft: IWorkflowParticipantsByStage,
    currentDraft: IWorkflowParticipantsByStage
  ) => Promise<boolean>;
}

interface IStageSectionProps {
  stage: WorkflowStage;
  rows: IWorkflowParticipantDraftRow[];
  directoryUsers: ReadonlyArray<IPhvbDirectoryUser>;
  onAddUser: (stage: WorkflowStage, user: IPhvbDirectoryUser) => void;
  onRemoveRow: (stage: WorkflowStage, rowKey: string) => void;
}

function cloneDraft(draft: IWorkflowParticipantsByStage): IWorkflowParticipantsByStage {
  return {
    gopy: draft.gopy.map(row => ({ ...row })),
    thamdinh: draft.thamdinh.map(row => ({ ...row })),
    pheduyet: draft.pheduyet.map(row => ({ ...row }))
  };
}

function findDirectoryUser(
  users: ReadonlyArray<IPhvbDirectoryUser>,
  matcher: (user: IPhvbDirectoryUser) => boolean
): IPhvbDirectoryUser | undefined {
  for (let index = 0; index < users.length; index += 1) {
    const user = users[index];
    if (matcher(user)) {
      return user;
    }
  }

  return undefined;
}

function WorkflowParticipantStageSection(props: IStageSectionProps): React.ReactElement {
  const { stage, rows, directoryUsers, onAddUser, onRemoveRow } = props;
  const stageConfig = WORKFLOW_PARTICIPANT_STAGE_CONFIG[stage];
  const [query, setQuery] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');

  const suggestions = useMemo(() => {
    return directoryUsers.filter(user => {
      if (isEmailAlreadyInStageDraft(rows, user.email)) {
        return false;
      }

      if (!query.trim()) {
        return true;
      }

      const normalizedQuery = query.trim().toLowerCase();
      return (
        user.displayName.toLowerCase().indexOf(normalizedQuery) > -1 ||
        user.email.toLowerCase().indexOf(normalizedQuery) > -1 ||
        Boolean(user.department && user.department.toLowerCase().indexOf(normalizedQuery) > -1) ||
        Boolean(user.jobTitle && user.jobTitle.toLowerCase().indexOf(normalizedQuery) > -1)
      );
    });
  }, [directoryUsers, rows, query]);

  const visibleRows = rows.filter(row => !row.markedForRemoval);

  const handleAdd = (): void => {
    const matchedUser = findDirectoryUser(directoryUsers, user => user.email === selectedUserEmail)
      || findDirectoryUser(suggestions, user => user.email === selectedUserEmail)
      || suggestions[0];

    if (!matchedUser || isEmailAlreadyInStageDraft(rows, matchedUser.email)) {
      return;
    }

    onAddUser(stage, matchedUser);
    setQuery('');
    setSelectedUserEmail('');
  };

  return (
    <section className={styles.workflowParticipantSection}>
      <h5 className={styles.workflowParticipantSectionTitle}>{stageConfig.sectionLabel}</h5>

      <div className={styles.workflowParticipantSearchRow}>
        <input
          type="text"
          className={styles.workflowParticipantSearchInput}
          placeholder={`Tìm kiếm ${stageConfig.sectionLabel}...`}
          value={query}
          list={`phvb-participant-suggestions-${stage}`}
          onChange={event => {
            setQuery(event.target.value);
            setSelectedUserEmail('');
          }}
          onInput={event => {
            const value = (event.target as HTMLInputElement).value;
            const matchedUser = findDirectoryUser(directoryUsers, user =>
              user.displayName.toLowerCase() === value.trim().toLowerCase() ||
              user.email.toLowerCase() === value.trim().toLowerCase()
            );

            if (matchedUser) {
              setSelectedUserEmail(matchedUser.email);
            }
          }}
        />
        <datalist id={`phvb-participant-suggestions-${stage}`}>
          {suggestions.slice(0, 20).map(user => (
            <option key={user.email} value={user.displayName}>
              {user.email}
            </option>
          ))}
        </datalist>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={handleAdd}
          disabled={suggestions.length === 0 && !selectedUserEmail}
        >
          + Thêm
        </button>
      </div>

      <div className={styles.workflowParticipantList}>
        {visibleRows.length === 0 ? (
          <p className={styles.workflowParticipantEmpty}>Chưa có người tham gia.</p>
        ) : (
          visibleRows.map(row => {
            const directoryUser = findDirectoryUser(
              directoryUsers,
              user => user.email.toLowerCase() === row.email.toLowerCase()
            );
            const jobTitle = row.jobTitle || directoryUser?.jobTitle || '';
            const canRemove = row.isNew || canRemoveWorkflowParticipant(row.status);

            return (
              <div key={row.key} className={styles.workflowParticipantRow}>
                <div className={styles.workflowParticipantAvatar} aria-hidden="true">
                  {getParticipantDisplayInitials(row.displayName)}
                </div>
                <div className={styles.workflowParticipantInfo}>
                  <div className={styles.workflowParticipantName}>{row.displayName}</div>
                  <div className={styles.workflowParticipantRole}>{stageConfig.sectionLabel}</div>
                </div>
                {jobTitle ? (
                  <div className={styles.workflowParticipantJobTitle}>{jobTitle}</div>
                ) : null}
                {canRemove ? (
                  <button
                    type="button"
                    className={styles.btnTrash}
                    aria-label={`Xóa ${row.displayName}`}
                    onClick={() => onRemoveRow(stage, row.key)}
                  >
                    <DeleteFileIcon />
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export function PhvbMagWorkflowParticipantModal(props: IPhvbMagWorkflowParticipantModalProps): React.ReactElement {
  const {
    isOpen,
    detail,
    directoryUsers,
    isSaving = false,
    errorMessage,
    onClose,
    onSave
  } = props;
  const [initialDraft, setInitialDraft] = useState<IWorkflowParticipantsByStage>({
    gopy: [],
    thamdinh: [],
    pheduyet: []
  });
  const [currentDraft, setCurrentDraft] = useState<IWorkflowParticipantsByStage>({
    gopy: [],
    thamdinh: [],
    pheduyet: []
  });
  const [localErrorMessage, setLocalErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isOpen || !detail) {
      return;
    }

    const nextDraft = buildInitialParticipantDraft(detail.workflowParticipants);
    setInitialDraft(cloneDraft(nextDraft));
    setCurrentDraft(cloneDraft(nextDraft));
    setLocalErrorMessage(undefined);
  }, [isOpen, detail]);

  if (!isOpen || !detail) {
    return <></>;
  }

  const visibleStages = getVisibleParticipantStages(detail.release.LoaiYeuCau);
  const displayedError = localErrorMessage || errorMessage;

  const handleAddUser = (stage: WorkflowStage, user: IPhvbDirectoryUser): void => {
    if (isEmailAlreadyInStageDraft(currentDraft[stage], user.email)) {
      return;
    }

    const nextRow: IWorkflowParticipantDraftRow = {
      key: `new-${stage}-${user.email}-${Date.now()}`,
      email: user.email,
      displayName: user.displayName,
      department: user.department,
      jobTitle: user.jobTitle,
      isNew: true,
      markedForRemoval: false
    };

    setCurrentDraft(previous => ({
      ...previous,
      [stage]: [...previous[stage], nextRow]
    }));
  };

  const handleRemoveRow = (stage: WorkflowStage, rowKey: string): void => {
    setCurrentDraft(previous => ({
      ...previous,
      [stage]: previous[stage].map(row => {
        if (row.key !== rowKey) {
          return row;
        }

        if (row.isNew) {
          return { ...row, markedForRemoval: true };
        }

        if (!canRemoveWorkflowParticipant(row.status)) {
          return row;
        }

        return { ...row, markedForRemoval: true };
      }).filter(row => !(row.isNew && row.markedForRemoval))
    }));
  };

  const handleSave = async (): Promise<void> => {
    setLocalErrorMessage(undefined);
    const succeeded = await onSave(initialDraft, currentDraft);

    if (succeeded) {
      onClose();
    }
  };

  return (
    <div className={styles.confirmDialogOverlay}>
      <div className={styles.workflowParticipantModalContent}>
        <div className={styles.workflowParticipantModalHeader}>
          <h4>Thêm người tham gia quy trình</h4>
          <button type="button" className={styles.workflowParticipantModalClose} onClick={onClose} aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className={styles.workflowParticipantModalBody}>
          {visibleStages.map(stage => (
            <WorkflowParticipantStageSection
              key={stage}
              stage={stage}
              rows={currentDraft[stage]}
              directoryUsers={directoryUsers}
              onAddUser={handleAddUser}
              onRemoveRow={handleRemoveRow}
            />
          ))}
        </div>

        {displayedError ? (
          <p className={styles.workflowParticipantError}>{displayedError}</p>
        ) : null}

        <div className={styles.confirmDialogActions}>
          <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={isSaving}>
            Hủy
          </button>
          <button type="button" className={styles.btnSubmit} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Đang lưu...' : 'Lưu/Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}
