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
import { phvbCommentAttachmentService } from './PhvbMagCommentAttachment.service';
import { RELEASE_SELECT_FIELDS } from './PhvbMag.service';
import { groupCommentAttachmentsByCommentId } from '../utils/PhvbMagCommentAttachment.utils';
import type {
  IAllUserWorkflowItem,
  ICommentWithAttachments,
  DetailRefreshScope,
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
  'TrangThai_ThucHien',
  'NoiDung',
  'Modified'
];

const HISTORY_SELECT_FIELDS: ReadonlyArray<string> = [
  ...ALL_USER_SELECT_FIELDS,
  'IsComment',
  'IsHasAttach',
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
    const stageItems = grouped[stage].slice().sort((left, right) => compareByDateAsc(left.Modified, right.Modified));
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
    orderBy: 'Modified asc'
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

async function enrichCommentsWithAttachments(
  context: IPhvbSiteContext,
  comments: ILichSuThucHienItem[]
): Promise<ICommentWithAttachments[]> {
  if (comments.length === 0) {
    return [];
  }

  const hasIsHasAttachField = comments.some(comment => comment.IsHasAttach !== undefined);
  const commentIdsWithAttachments = hasIsHasAttachField
    ? comments.filter(comment => comment.IsHasAttach === true).map(comment => comment.Id)
    : comments.map(comment => comment.Id);

  const attachments = commentIdsWithAttachments.length > 0
    ? await phvbCommentAttachmentService.listFilesForComments(context, commentIdsWithAttachments).catch(() => [])
    : [];
  const grouped = groupCommentAttachmentsByCommentId(attachments);

  return comments.map(comment => ({
    ...comment,
    attachments: grouped[comment.Id] || []
  }));
}

async function enrichHistoryWithAttachments(
  context: IPhvbSiteContext,
  history: ILichSuThucHienItem[]
): Promise<ICommentWithAttachments[]> {
  if (history.length === 0) {
    return [];
  }

  const hasIsHasAttachField = history.some(item => item.IsHasAttach !== undefined);
  const historyIdsWithAttachments = hasIsHasAttachField
    ? history.filter(item => item.IsHasAttach === true).map(item => item.Id)
    : history.map(item => item.Id);

  const attachments = historyIdsWithAttachments.length > 0
    ? await phvbCommentAttachmentService.listFilesForComments(context, historyIdsWithAttachments).catch(() => [])
    : [];
  const grouped = groupCommentAttachmentsByCommentId(attachments);

  return history.map(item => ({
    ...item,
    attachments: grouped[item.Id] || []
  }));
}

export class PhvbDetailService {
  public async loadRequestDetail(context: IPhvbSiteContext, idYeuCau: string): Promise<IRequestDetailData | undefined> {
    const partial = await this.loadRequestDetailPartial(context, idYeuCau, ['full']);

    if (!partial.release) {
      return undefined;
    }

    return {
      release: partial.release,
      attachments: partial.attachments || [],
      history: partial.history || [],
      comments: partial.comments || [],
      workflowParticipants: partial.workflowParticipants || []
    };
  }

  public async loadRequestDetailPartial(
    context: IPhvbSiteContext,
    idYeuCau: string,
    scopes: ReadonlyArray<DetailRefreshScope>
  ): Promise<Partial<IRequestDetailData>> {
    if (!hasSharePointSiteContext(context) || !idYeuCau.trim()) {
      return {};
    }

    const normalizedId = idYeuCau.trim();
    const uniqueScopes = scopes.filter((scope, index, array) => array.indexOf(scope) === index);

    if (uniqueScopes.length === 0 || uniqueScopes.indexOf('full') > -1) {
      return this.loadRequestDetailFull(context, normalizedId);
    }

    const result: Partial<IRequestDetailData> = {};
    const loaders: Array<Promise<void>> = [];

    if (uniqueScopes.indexOf('release') > -1) {
      loaders.push(
        fetchReleaseItem(context, normalizedId).then(release => {
          if (release) {
            result.release = release;
          }
        })
      );
    }

    if (uniqueScopes.indexOf('attachments') > -1) {
      loaders.push(
        phvbAttachmentService.listRequestFiles(context, normalizedId).catch(() => []).then(attachments => {
          result.attachments = attachments;
        })
      );
    }

    if (uniqueScopes.indexOf('activity') > -1) {
      loaders.push(
        fetchHistoryItemsByIdYeuCau(context, normalizedId).catch(() => []).then(async historyItems => {
          const { history: rawHistory, comments: rawComments } = splitHistoryAndComments(historyItems);
          const [history, comments] = await Promise.all([
            enrichHistoryWithAttachments(context, rawHistory),
            enrichCommentsWithAttachments(context, rawComments)
          ]);
          result.history = history;
          result.comments = comments;
        })
      );
    }

    if (uniqueScopes.indexOf('workflow') > -1) {
      loaders.push(
        Promise.all([
          fetchAllUserItemsByIdYeuCau(context, normalizedId, ALL_USER_GOPY_LIST_TITLE).catch(() => []),
          fetchAllUserItemsByIdYeuCau(context, normalizedId, ALL_USER_THAMDINH_LIST_TITLE).catch(() => []),
          fetchAllUserItemsByIdYeuCau(context, normalizedId, ALL_USER_PHEDUYET_LIST_TITLE).catch(() => [])
        ]).then(([gopYUsers, thamDinhUsers, pheDuyetUsers]) => {
          result.workflowParticipants = mergeWorkflowParticipants(gopYUsers, thamDinhUsers, pheDuyetUsers);
        })
      );
    }

    await Promise.all(loaders);
    return result;
  }

  private async loadRequestDetailFull(context: IPhvbSiteContext, normalizedId: string): Promise<Partial<IRequestDetailData>> {
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
      return {};
    }

    const { history: rawHistory, comments: rawComments } = splitHistoryAndComments(historyItems);
    const [history, comments] = await Promise.all([
      enrichHistoryWithAttachments(context, rawHistory),
      enrichCommentsWithAttachments(context, rawComments)
    ]);
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
