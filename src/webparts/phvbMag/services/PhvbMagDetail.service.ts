import {
  ALL_USER_GOPY_LIST_TITLE,
  ALL_USER_PHEDUYET_LIST_TITLE,
  ALL_USER_THAMDINH_LIST_TITLE,
  DEFAULT_LIST_TITLE,
  hasSharePointSiteContext,
  HISTORY_LIST_TITLE
} from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { toRuntimeMessage } from './PhvbMag.error';
import { phvbAttachmentService } from './PhvbMagAttachment.service';
import { RELEASE_SELECT_FIELDS } from './PhvbMag.service';
import type {
  IAllUserWorkflowItem,
  ILichSuThucHienItem,
  IPhvbSiteContext,
  IRequestDetailData,
  IVanBanItem,
  IWorkflowParticipantItem,
  WorkflowStage
} from '../models/PhvbMag.models';

const ALL_USER_SELECT_FIELDS: ReadonlyArray<string> = [
  'Id',
  'IDYeuCau',
  'User_ThucHien',
  'Email_ThucHien',
  'PhongBan_ThucHien',
  'Ngay_ThucHien',
  'TrangThai_ThucHien',
  'NoiDung',
  'Modified'
];

const HISTORY_SELECT_FIELDS: ReadonlyArray<string> = [
  ...ALL_USER_SELECT_FIELDS,
  'IsComment',
  'Created'
];

const WORKFLOW_STAGE_ORDER: ReadonlyArray<WorkflowStage> = ['gopy', 'thamdinh', 'pheduyet'];

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

function buildIdYeuCauFilter(idYeuCau: string): string {
  return `IDYeuCau eq '${escapeODataValue(idYeuCau)}'`;
}

function buildReleaseIdYeuCauFilter(idYeuCau: string): string {
  return `IdYeuCau eq '${escapeODataValue(idYeuCau)}'`;
}

function compareByDateAsc(left?: string, right?: string): number {
  const leftValue = (left || '').trim();
  const rightValue = (right || '').trim();

  if (!leftValue && !rightValue) {
    return 0;
  }

  if (!leftValue) {
    return 1;
  }

  if (!rightValue) {
    return -1;
  }

  const leftTime = Date.parse(leftValue);
  const rightTime = Date.parse(rightValue);

  if (!isNaN(leftTime) && !isNaN(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return leftValue.localeCompare(rightValue, 'vi');
}

export function splitHistoryAndComments(items: ILichSuThucHienItem[]): {
  history: ILichSuThucHienItem[];
  comments: ILichSuThucHienItem[];
} {
  const history: ILichSuThucHienItem[] = [];
  const comments: ILichSuThucHienItem[] = [];

  items.forEach(item => {
    if (item.IsComment === true) {
      comments.push(item);
    } else {
      history.push(item);
    }
  });

  return { history, comments };
}

function tagWorkflowItems(
  items: IAllUserWorkflowItem[],
  workflowStage: WorkflowStage,
  workflowStageLabel: string
): IWorkflowParticipantItem[] {
  return items.map(item => ({
    ...item,
    workflowStage,
    workflowStageLabel
  }));
}

export function mergeWorkflowParticipants(
  gopYUsers: IAllUserWorkflowItem[],
  thamDinhUsers: IAllUserWorkflowItem[],
  pheDuyetUsers: IAllUserWorkflowItem[]
): IWorkflowParticipantItem[] {
  const grouped: Record<WorkflowStage, IWorkflowParticipantItem[]> = {
    gopy: tagWorkflowItems(gopYUsers, 'gopy', 'Góp ý'),
    thamdinh: tagWorkflowItems(thamDinhUsers, 'thamdinh', 'Thẩm định'),
    pheduyet: tagWorkflowItems(pheDuyetUsers, 'pheduyet', 'Phê duyệt')
  };

  const merged: IWorkflowParticipantItem[] = [];

  WORKFLOW_STAGE_ORDER.forEach(stage => {
    const stageItems = grouped[stage].slice().sort((left, right) => compareByDateAsc(left.Ngay_ThucHien, right.Ngay_ThucHien));
    stageItems.forEach(item => merged.push(item));
  });

  return merged;
}

async function fetchListItemsByIdYeuCau(
  context: IPhvbSiteContext,
  idYeuCau: string,
  listTitle: string,
  selectFields: ReadonlyArray<string>
): Promise<ILichSuThucHienItem[]> {
  const items = await phvbRepository.fetchItems({
    ...context,
    listTitle,
    selectFields,
    filter: buildIdYeuCauFilter(idYeuCau),
    top: 500,
    orderBy: 'Ngay_ThucHien asc'
  });

  return items as unknown as ILichSuThucHienItem[];
}

async function fetchHistoryItemsByIdYeuCau(
  context: IPhvbSiteContext,
  idYeuCau: string
): Promise<ILichSuThucHienItem[]> {
  const items = await phvbRepository.fetchItems({
    ...context,
    listTitle: HISTORY_LIST_TITLE,
    selectFields: HISTORY_SELECT_FIELDS,
    filter: buildIdYeuCauFilter(idYeuCau),
    top: 500,
    orderBy: 'Created asc'
  });

  return items as unknown as ILichSuThucHienItem[];
}

async function fetchAllUserItemsByIdYeuCau(
  context: IPhvbSiteContext,
  idYeuCau: string,
  listTitle: string
): Promise<IAllUserWorkflowItem[]> {
  const items = await fetchListItemsByIdYeuCau(context, idYeuCau, listTitle, ALL_USER_SELECT_FIELDS);
  return items as IAllUserWorkflowItem[];
}

async function fetchReleaseItem(context: IPhvbSiteContext, idYeuCau: string): Promise<IVanBanItem | undefined> {
  const items = await phvbRepository.fetchItems({
    ...context,
    listTitle: DEFAULT_LIST_TITLE,
    selectFields: RELEASE_SELECT_FIELDS,
    filter: buildReleaseIdYeuCauFilter(idYeuCau),
    top: 1
  });

  return items.length > 0 ? items[0] : undefined;
}

export class PhvbDetailService {
  public async loadRequestDetail(context: IPhvbSiteContext, idYeuCau: string): Promise<IRequestDetailData | undefined> {
    if (!hasSharePointSiteContext(context) || !idYeuCau.trim()) {
      return undefined;
    }

    const normalizedId = idYeuCau.trim();

    const [
      release,
      attachments,
      historyItems,
      gopYUsers,
      thamDinhUsers,
      pheDuyetUsers
    ] = await Promise.all([
      fetchReleaseItem(context, normalizedId),
      phvbAttachmentService.listRequestFiles(context, normalizedId).catch(() => []),
      fetchHistoryItemsByIdYeuCau(context, normalizedId).catch(() => []),
      fetchAllUserItemsByIdYeuCau(context, normalizedId, ALL_USER_GOPY_LIST_TITLE).catch(() => []),
      fetchAllUserItemsByIdYeuCau(context, normalizedId, ALL_USER_THAMDINH_LIST_TITLE).catch(() => []),
      fetchAllUserItemsByIdYeuCau(context, normalizedId, ALL_USER_PHEDUYET_LIST_TITLE).catch(() => [])
    ]);

    if (!release) {
      return undefined;
    }

    const { history, comments } = splitHistoryAndComments(historyItems);
    const workflowParticipants = mergeWorkflowParticipants(gopYUsers, thamDinhUsers, pheDuyetUsers);

    return {
      release,
      attachments,
      history,
      comments,
      workflowParticipants
    };
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, DEFAULT_LIST_TITLE);
  }
}

export const phvbDetailService = new PhvbDetailService();
