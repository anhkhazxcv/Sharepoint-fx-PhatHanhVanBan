import { ATTACHMENT_FORM_SUBFOLDER } from '../config/PhvbMag.configuration';
import type { IBanHanhLibraryItem } from '../models/PhvbMag.models';
import { getStoragePathAfterLibrary } from './PhvbMagBanHanh.tree';
import { parseDateOnlyToLocalMidnight } from './PhvbMagLibrary.utils';

export const RECENT_PUBLISHED_WINDOW_DAYS = 7;
export const RECENT_PUBLISHED_TOP = 200;
export const EXPIRED_FOLDER_PATH_MARKER = '/Expired_';

export interface IRecentPublishedSection {
  documentFolderKey: string;
  displayPath: string;
  documents: IBanHanhLibraryItem[];
  formDocuments: IBanHanhLibraryItem[];
  newestNgayPhatHanhMs: number;
}

function normalizePath(value: string): string {
  return value.replace(/\/+/g, '/').replace(/\/$/, '');
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

export function getRecentPublishedStartDate(referenceDate: Date = new Date()): Date {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - (RECENT_PUBLISHED_WINDOW_DAYS - 1)
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

export function resolveDocumentFolderKey(fileDirRef: string): string {
  const normalized = normalizePath(fileDirRef);

  if (isFormAttachmentPath(normalized)) {
    const lastSlashIndex = normalized.lastIndexOf('/');
    return lastSlashIndex === -1 ? '' : normalized.substring(0, lastSlashIndex);
  }

  return normalized;
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
  libraryTitle: string
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
      section = {
        documentFolderKey,
        displayPath: storagePath || documentFolderKey,
        documents: [],
        formDocuments: [],
        newestNgayPhatHanhMs: 0
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

  sections.sort((left: IRecentPublishedSection, right: IRecentPublishedSection) => {
    if (right.newestNgayPhatHanhMs !== left.newestNgayPhatHanhMs) {
      return right.newestNgayPhatHanhMs - left.newestNgayPhatHanhMs;
    }

    return left.displayPath.localeCompare(right.displayPath, 'vi');
  });

  return sections;
}
