import {
  ALL_USER_GOPY_LIST_TITLE,
  ALL_USER_PHEDUYET_LIST_TITLE,
  ALL_USER_THAMDINH_LIST_TITLE
} from '../config/PhvbMag.configuration';
import type { IVanBanItem, IWorkflowParticipantItem, WorkflowStage } from '../models/PhvbMag.models';
import { getRequestTypeFormRules, type RequestTypeValue } from './PhvbMagRequestForm.utils';
import { isTerminalWorkflowStatus, resolveWorkflowStageFromStatus } from './PhvbMagWorkflowState.utils';
import { isWorkflowParticipantUnconfirmed } from './PhvbMagWorkflowTimeline.utils';

export interface IWorkflowParticipantStageConfig {
  listTitle: string;
  releaseField: 'NguoiGopY' | 'ThamDinh' | 'PheDuyet';
  sectionLabel: string;
}

export interface IWorkflowParticipantDraftRow {
  key: string;
  participantId?: number;
  email: string;
  displayName: string;
  department?: string;
  jobTitle?: string;
  status?: string;
  isNew: boolean;
  markedForRemoval: boolean;
}

export interface IWorkflowParticipantsByStage {
  gopy: IWorkflowParticipantDraftRow[];
  thamdinh: IWorkflowParticipantDraftRow[];
  pheduyet: IWorkflowParticipantDraftRow[];
}

export interface IWorkflowParticipantStageChanges {
  addedEmails: string[];
  removedParticipantIds: number[];
}

export type IWorkflowParticipantChanges = Record<WorkflowStage, IWorkflowParticipantStageChanges>;

export const WORKFLOW_PARTICIPANT_STAGE_CONFIG: Record<WorkflowStage, IWorkflowParticipantStageConfig> = {
  gopy: {
    listTitle: ALL_USER_GOPY_LIST_TITLE,
    releaseField: 'NguoiGopY',
    sectionLabel: 'Người góp ý'
  },
  thamdinh: {
    listTitle: ALL_USER_THAMDINH_LIST_TITLE,
    releaseField: 'ThamDinh',
    sectionLabel: 'Người thẩm định'
  },
  pheduyet: {
    listTitle: ALL_USER_PHEDUYET_LIST_TITLE,
    releaseField: 'PheDuyet',
    sectionLabel: 'Người phê duyệt'
  }
};

const WORKFLOW_STAGE_ORDER: ReadonlyArray<WorkflowStage> = ['gopy', 'thamdinh', 'pheduyet'];

export function canOpenWorkflowParticipantModal(release: IVanBanItem): boolean {
  return !isTerminalWorkflowStatus(release.StatusApproved);
}

export function canRemoveWorkflowParticipant(status?: string): boolean {
  return isWorkflowParticipantUnconfirmed(status);
}

export function getVisibleParticipantStages(loaiYeuCau?: string): WorkflowStage[] {
  const requestType = (loaiYeuCau || 'Viết mới') as RequestTypeValue;
  const formRules = getRequestTypeFormRules(requestType);

  if (!formRules.includeGopYThamDinhWorkflow) {
    return ['pheduyet'];
  }

  return WORKFLOW_STAGE_ORDER.slice();
}

export function isParticipantStageAddable(stage: WorkflowStage, statusApproved?: string): boolean {
  const currentStage = resolveWorkflowStageFromStatus(statusApproved);

  if (currentStage === 'none') {
    return true;
  }

  const stageIndex = WORKFLOW_STAGE_ORDER.indexOf(stage);
  const currentIndex = WORKFLOW_STAGE_ORDER.indexOf(currentStage);

  return stageIndex >= currentIndex;
}

export function groupParticipantsByStage(
  workflowParticipants: ReadonlyArray<IWorkflowParticipantItem>
): IWorkflowParticipantsByStage {
  const grouped: IWorkflowParticipantsByStage = {
    gopy: [],
    thamdinh: [],
    pheduyet: []
  };

  workflowParticipants.forEach(participant => {
    grouped[participant.workflowStage].push(mapParticipantToDraftRow(participant));
  });

  return grouped;
}

export function buildReleaseParticipantFieldValue(emails: string[]): string {
  const uniqueEmails: string[] = [];

  emails.forEach(email => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || uniqueEmails.indexOf(normalizedEmail) > -1) {
      return;
    }
    uniqueEmails.push(email.trim());
  });

  return uniqueEmails.join('; ');
}

export function buildInitialParticipantDraft(
  workflowParticipants: ReadonlyArray<IWorkflowParticipantItem>
): IWorkflowParticipantsByStage {
  return groupParticipantsByStage(workflowParticipants);
}

export function collectParticipantChanges(
  initialDraft: IWorkflowParticipantsByStage,
  currentDraft: IWorkflowParticipantsByStage
): IWorkflowParticipantChanges {
  const changes: IWorkflowParticipantChanges = {
    gopy: { addedEmails: [], removedParticipantIds: [] },
    thamdinh: { addedEmails: [], removedParticipantIds: [] },
    pheduyet: { addedEmails: [], removedParticipantIds: [] }
  };

  WORKFLOW_STAGE_ORDER.forEach(stage => {
    const initialRows = initialDraft[stage];
    const currentRows = currentDraft[stage];
    const initialById = new Map<number, IWorkflowParticipantDraftRow>();

    initialRows.forEach(row => {
      if (typeof row.participantId === 'number') {
        initialById.set(row.participantId, row);
      }
    });

    currentRows.forEach(row => {
      if (row.isNew && !row.markedForRemoval) {
        changes[stage].addedEmails.push(row.email);
        return;
      }

      if (typeof row.participantId !== 'number') {
        return;
      }

      const initialRow = initialById.get(row.participantId);
      if (initialRow && !initialRow.markedForRemoval && row.markedForRemoval) {
        changes[stage].removedParticipantIds.push(row.participantId);
      }
    });
  });

  return changes;
}

export function buildFinalStageEmails(draftRows: IWorkflowParticipantDraftRow[]): string[] {
  const emails: string[] = [];

  draftRows.forEach(row => {
    if (row.markedForRemoval) {
      return;
    }

    const normalizedEmail = row.email.trim().toLowerCase();
    if (!normalizedEmail || emails.some(existing => existing.toLowerCase() === normalizedEmail)) {
      return;
    }

    emails.push(row.email.trim());
  });

  return emails;
}

export function isEmailAlreadyInStageDraft(
  draftRows: IWorkflowParticipantDraftRow[],
  email: string
): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  return draftRows.some(row => !row.markedForRemoval && row.email.trim().toLowerCase() === normalizedEmail);
}

export function getParticipantDisplayInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function mapParticipantToDraftRow(participant: IWorkflowParticipantItem): IWorkflowParticipantDraftRow {
  return {
    key: `existing-${participant.workflowStage}-${participant.Id}`,
    participantId: participant.Id,
    email: participant.Email_ThucHien || '',
    displayName: participant.User_ThucHien || participant.Email_ThucHien || '---',
    department: participant.PhongBan_ThucHien,
    status: participant.TrangThai_ThucHien,
    isNew: false,
    markedForRemoval: false
  };
}

export function buildParticipantChangesSummary(
  changes: IWorkflowParticipantChanges,
  visibleStages: WorkflowStage[],
  resolveRemovedEmail: (participantId: number) => string | undefined
): string {
  const segments: string[] = [];

  visibleStages.forEach(stage => {
    const stageChanges = changes[stage];
    const parts: string[] = [];

    stageChanges.addedEmails.forEach(email => {
      const trimmed = email.trim();
      if (trimmed) {
        parts.push(`+${trimmed}`);
      }
    });

    stageChanges.removedParticipantIds.forEach(participantId => {
      const email = (resolveRemovedEmail(participantId) || '').trim();
      if (email) {
        parts.push(`-${email}`);
      }
    });

    if (parts.length > 0) {
      segments.push(`${WORKFLOW_PARTICIPANT_STAGE_CONFIG[stage].sectionLabel}: ${parts.join('; ')}`);
    }
  });

  return segments.join(' | ');
}
