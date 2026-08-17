import {
  DMVL_FOLDER_NAME,
  PHVB_ROLES,
  REQUEST_STATUS,
  resolveIssuanceLibraryTitle
} from '../config/PhvbMag.configuration';
import { phvbBanHanhConfigService } from '../services/PhvbMagBanHanhConfig.service';
import { phvbDocumentLibraryService } from '../services/PhvbMagDocumentLibrary.service';
import {
  buildBanHanhNotifyDraft,
  buildBanHanhNotifyDraftFromSavedRelease,
  resolveRecipientEmail
} from './PhvbMagBanHanhNotify.utils';
import { getStoragePathAfterLibrary } from './PhvbMagBanHanh.tree';
import { normalizeRoleEmail, userHasAnyRole } from './PhvbMagRole.utils';
import type {
  IBanHanhNotifyDraft,
  ILabelCustomConfigItem,
  IMailBanHanhConfigItem,
  IPhvbRoleEntry,
  IPhvbSiteContext,
  IVanBanItem
} from '../models/PhvbMag.models';

interface IDmvlFolderCacheEntry {
  storagePath: string;
}

const dmvlFolderCacheBySiteKey: Record<string, IDmvlFolderCacheEntry> = {};
const dmvlFolderPromiseBySiteKey: Record<string, Promise<string>> = {};

function resolveSiteCacheKey(context: IPhvbSiteContext): string {
  const siteUrl = (context.sourceSiteUrl || context.siteCollectionUrl || context.currentWebUrl || '').trim().toLowerCase();
  const libraryTitle = resolveIssuanceLibraryTitle(context.issuanceLibraryTitle).toLowerCase();
  return `${siteUrl}::${libraryTitle}`;
}

export function clearDmvlFolderStoragePathCache(): void {
  Object.keys(dmvlFolderCacheBySiteKey).forEach(key => {
    delete dmvlFolderCacheBySiteKey[key];
  });
  Object.keys(dmvlFolderPromiseBySiteKey).forEach(key => {
    delete dmvlFolderPromiseBySiteKey[key];
  });
}

export async function resolveDmvlFolderStoragePath(context: IPhvbSiteContext): Promise<string> {
  const cacheKey = resolveSiteCacheKey(context);
  const cachedEntry = dmvlFolderCacheBySiteKey[cacheKey];

  if (cachedEntry) {
    return cachedEntry.storagePath;
  }

  if (!dmvlFolderPromiseBySiteKey[cacheKey]) {
    dmvlFolderPromiseBySiteKey[cacheKey] = loadDmvlFolderStoragePath(context, cacheKey);
  }

  const pendingPromise = dmvlFolderPromiseBySiteKey[cacheKey];

  try {
    return await pendingPromise;
  } finally {
    if (dmvlFolderPromiseBySiteKey[cacheKey] === pendingPromise) {
      delete dmvlFolderPromiseBySiteKey[cacheKey];
    }
  }
}

async function loadDmvlFolderStoragePath(context: IPhvbSiteContext, cacheKey: string): Promise<string> {
  const libraryTitle = resolveIssuanceLibraryTitle(context.issuanceLibraryTitle);
  const folders = await phvbDocumentLibraryService.loadBanHanhLibraryFolders(context);
  const normalizedFolderName = DMVL_FOLDER_NAME.trim().toLowerCase();

  for (let index = 0; index < folders.length; index += 1) {
    const folder = folders[index];
    const folderName = (folder.name || '').trim();

    if (folderName.toLowerCase() !== normalizedFolderName) {
      continue;
    }

    const serverRelativePath = `${(folder.fileDirRef || '').replace(/\/+$/, '')}/${folder.name}`;
    const storagePath = getStoragePathAfterLibrary(serverRelativePath, libraryTitle);

    if (!storagePath) {
      break;
    }

    dmvlFolderCacheBySiteKey[cacheKey] = { storagePath };
    return storagePath;
  }

  throw new Error(`Không tìm thấy thư mục ban hành "${DMVL_FOLDER_NAME}" trong thư viện ban hành.`);
}

export function thuMucBanHanhHasDmvlFolder(thuMucBanHanh?: string): boolean {
  const normalizedPath = (thuMucBanHanh || '').trim().toLowerCase();

  if (!normalizedPath) {
    return false;
  }

  const dmvlFolder = DMVL_FOLDER_NAME.trim().toLowerCase();
  const segments = normalizedPath.split('/').map(segment => segment.trim()).filter(Boolean);

  return segments.indexOf(dmvlFolder) > -1;
}

export function isDmvlSubmissionRelease(release: IVanBanItem): boolean {
  return thuMucBanHanhHasDmvlFolder(release.ThuMucBanHanh);
}

export function isDmvlBanHanhActor(
  release: IVanBanItem,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  userEmail?: string
): boolean {
  const creatorEmail = normalizeRoleEmail(release.EmailNguoiTao);
  const currentEmail = normalizeRoleEmail(userEmail);
  const isCreator = Boolean(creatorEmail) && creatorEmail === currentEmail;

  if (isCreator) {
    return true;
  }

  return userHasAnyRole(roles, userEmail, [PHVB_ROLES.ADMIN, PHVB_ROLES.SUPER_ADMIN]);
}

export function canResumeDmvlBanHanh(
  release: IVanBanItem,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  userEmail?: string
): boolean {
  const status = (release.StatusApproved || '').trim();

  if (status !== REQUEST_STATUS.CHO_BAN_HANH || !isDmvlSubmissionRelease(release)) {
    return false;
  }

  return isDmvlBanHanhActor(release, roles, userEmail);
}

export function resolveDmvlNotifyDraft(
  release: IVanBanItem,
  mailConfig: ReadonlyArray<IMailBanHanhConfigItem>,
  labelConfig: ReadonlyArray<ILabelCustomConfigItem>
): IBanHanhNotifyDraft {
  const savedSubject = (release.SubjectBanHanh || '').trim();
  const savedBody = (release.BodyEmail || '').trim();

  if (savedSubject && savedBody) {
    const draft = buildBanHanhNotifyDraftFromSavedRelease(release);

    if (!draft.recipient) {
      draft.recipient = resolveRecipientEmail(release.ThuMucBanHanh, mailConfig);
    }

    return draft;
  }

  return buildBanHanhNotifyDraft(release, mailConfig, labelConfig);
}

export async function prepareDmvlNotifyDraft(
  context: IPhvbSiteContext,
  release: IVanBanItem
): Promise<IBanHanhNotifyDraft> {
  const [mailConfig, labelConfig] = await Promise.all([
    phvbBanHanhConfigService.loadMailBanHanhConfig(context),
    phvbBanHanhConfigService.loadLabelCustomConfig(context)
  ]);

  return resolveDmvlNotifyDraft(release, mailConfig, labelConfig);
}
