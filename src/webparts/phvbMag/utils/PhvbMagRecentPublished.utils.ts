import { ATTACHMENT_FORM_SUBFOLDER } from '../config/PhvbMag.configuration';
import type { IBanHanhLibraryItem } from '../models/PhvbMag.models';
import { getStoragePathAfterLibrary } from './PhvbMagBanHanh.tree';
import { parseDateOnlyToLocalMidnight } from './PhvbMagLibrary.utils';

export const RECENT_PUBLISHED_WINDOW_DAYS = 7;
export const EXPIRED_FOLDER_PATH_MARKER = '/Expired_';

export interface IRecentPublishedSection {
  documentFolderKey: string;
  displayPath: string;
  displayPathFull?: string;
  documents: IBanHanhLibraryItem[];
  formDocuments: IBanHanhLibraryItem[];
  newestNgayPhatHanhMs: number;
  folderNgayPhatHanh?: string;
}

function normalizePath(value: string): string {
  return value.replace(/\/+/g, '/').replace(/\/$/, '');
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

export function getRecentPublishedStartDate(
  windowDays: number,
  referenceDate: Date = new Date()
): Date {
  const safeDays = Math.max(1, windowDays);

  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - (safeDays - 1)
  );
}

/** OData datetime literal at local midnight (date-only window). */
export function toODataDateTimeLiteral(date: Date): string {
  return `datetime'${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T00:00:00'`;
}

export function isExpiredArchivePath(fileDirRefOrFileRef: string): boolean {
  return normalizePath(fileDirRefOrFileRef).indexOf(EXPIRED_FOLDER_PATH_MARKER) > -1;
}

export function isFormAttachmentPath(fileDirRef: string): boolean {
  const normalized = normalizePath(fileDirRef);
  const suffix = `/${ATTACHMENT_FORM_SUBFOLDER}`;

  return normalized === ATTACHMENT_FORM_SUBFOLDER
    || (normalized.length >= suffix.length
      && normalized.substring(normalized.length - suffix.length) === suffix);
}

export function isRecentPublishedFolderCandidate(fileDirRef: string, fileName: string): boolean {
  const normalizedPath = normalizePath(fileDirRef);
  const normalizedName = (fileName || '').trim().toLowerCase();

  if (!normalizedPath || isExpiredArchivePath(normalizedPath)) {
    return false;
  }

  if (normalizedName === 'forms' || isFormAttachmentPath(normalizedPath)) {
    return false;
  }

  return true;
}

export function resolveDocumentFolderKey(fileDirRef: string): string {
  const normalized = normalizePath(fileDirRef);

  if (isFormAttachmentPath(normalized)) {
    const lastSlashIndex = normalized.lastIndexOf('/');
    return lastSlashIndex === -1 ? '' : normalized.substring(0, lastSlashIndex);
  }

  return normalized;
}

export function resolveDocumentFolderDisplayName(documentFolderKey: string): string {
  const normalized = normalizePath(documentFolderKey);
  const lastSlashIndex = normalized.lastIndexOf('/');

  if (lastSlashIndex === -1) {
    return normalized;
  }

  return normalized.substring(lastSlashIndex + 1);
}

export function formatRecentPublishDate(value?: string): string {
  const parsed = parseDateOnlyToLocalMidnight(value);

  if (!parsed) {
    return (value || '').trim();
  }

  return `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
}

function getNgayPhatHanhMs(value?: string): number {
  const parsed = parseDateOnlyToLocalMidnight(value);
  return parsed ? parsed.getTime() : 0;
}

function compareRecentItems(left: IBanHanhLibraryItem, right: IBanHanhLibraryItem): number {
  const dateDiff = getNgayPhatHanhMs(right.ngayPhatHanh) - getNgayPhatHanhMs(left.ngayPhatHanh);

  if (dateDiff !== 0) {
    return dateDiff;
  }

  return left.name.localeCompare(right.name, 'vi');
}

export function groupRecentPublishedByDocumentFolder(
  items: IBanHanhLibraryItem[],
  libraryTitle: string,
  folderNgayPhatHanhByKey?: Record<string, string | undefined>
): IRecentPublishedSection[] {
  const sectionMap = new Map<string, IRecentPublishedSection>();

  items.forEach(item => {
    const documentFolderKey = resolveDocumentFolderKey(item.fileDirRef);

    if (!documentFolderKey) {
      return;
    }

    let section = sectionMap.get(documentFolderKey);

    if (!section) {
      const storagePath = getStoragePathAfterLibrary(documentFolderKey, libraryTitle);
      const folderNgayPhatHanh = folderNgayPhatHanhByKey
        ? folderNgayPhatHanhByKey[documentFolderKey]
        : undefined;
      section = {
        documentFolderKey,
        displayPath: resolveDocumentFolderDisplayName(documentFolderKey),
        displayPathFull: storagePath || documentFolderKey,
        documents: [],
        formDocuments: [],
        newestNgayPhatHanhMs: getNgayPhatHanhMs(folderNgayPhatHanh),
        folderNgayPhatHanh
      };
      sectionMap.set(documentFolderKey, section);
    }

    if (isFormAttachmentPath(item.fileDirRef)) {
      section.formDocuments.push(item);
    } else {
      section.documents.push(item);
    }

    const itemMs = getNgayPhatHanhMs(item.ngayPhatHanh);

    if (itemMs > section.newestNgayPhatHanhMs) {
      section.newestNgayPhatHanhMs = itemMs;
    }
  });

  const sections: IRecentPublishedSection[] = [];
  sectionMap.forEach((section: IRecentPublishedSection) => {
    sections.push(section);
  });

  sections.forEach((section: IRecentPublishedSection) => {
    section.documents.sort(compareRecentItems);
    section.formDocuments.sort(compareRecentItems);
  });

  return sections;
}

export function orderRecentPublishedSections(
  sections: IRecentPublishedSection[],
  folderPathsInOrder: string[]
): IRecentPublishedSection[] {
  const normalizedOrder = folderPathsInOrder.map(path => normalizePath(path));
  const rankByKey = new Map<string, number>();
  normalizedOrder.forEach((path, index) => {
    rankByKey.set(path, index);
  });

  return sections.slice().sort((left, right) => {
    const leftRank = rankByKey.get(normalizePath(left.documentFolderKey));
    const rightRank = rankByKey.get(normalizePath(right.documentFolderKey));

    if (leftRank !== undefined && rightRank !== undefined && leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    if (right.newestNgayPhatHanhMs !== left.newestNgayPhatHanhMs) {
      return right.newestNgayPhatHanhMs - left.newestNgayPhatHanhMs;
    }

    return left.displayPath.localeCompare(right.displayPath, 'vi');
  });
}
