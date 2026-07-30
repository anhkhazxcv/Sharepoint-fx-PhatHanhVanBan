import type {
  IBanHanhFolderNode,
  IBanHanhLibraryItem,
  ILibraryFolderEntry
} from '../models/PhvbMag.models';

const FOLDER_TYPE = 1;
const FILE_TYPE = 0;

function normalizePath(value: string): string {
  return value.replace(/\/+/g, '/').replace(/\/$/, '');
}

function joinPath(parentPath: string, childName: string): string {
  const normalizedParent = normalizePath(parentPath);
  const normalizedChild = childName.replace(/^\/+/, '');
  return `${normalizedParent}/${normalizedChild}`;
}

function getFolderItems(items: IBanHanhLibraryItem[]): IBanHanhLibraryItem[] {
  return items.filter(item => item.fsObjType === FOLDER_TYPE);
}

function detectLibraryRootPath(folders: IBanHanhLibraryItem[]): string {
  if (folders.length === 0) {
    return '';
  }

  const paths = folders.map(folder => normalizePath(joinPath(folder.fileDirRef, folder.name)));
  const shortestPath = paths.reduce((currentShortest, path) => {
    if (!currentShortest || path.length < currentShortest.length) {
      return path;
    }

    return currentShortest;
  }, '');

  const segments = shortestPath.split('/');
  if (segments.length <= 1) {
    return shortestPath;
  }

  return segments.slice(0, -1).join('/');
}

export interface ILibraryFolderIndex {
  libraryRootPath: string;
  childFoldersByPath: Record<string, ILibraryFolderEntry[]>;
  folderById: Map<number, ILibraryFolderEntry>;
}

export interface ILibraryFolderAncestorData {
  expandedPaths: string[];
  childFoldersByPath: Record<string, ILibraryFolderEntry[]>;
}

function isLibraryFolderItem(item: IBanHanhLibraryItem): boolean {
  return item.fsObjType === FOLDER_TYPE && item.name.toLowerCase() !== 'forms';
}

export function buildLibraryFolderChildrenIndex(items: IBanHanhLibraryItem[]): ILibraryFolderIndex {
  const folders = getFolderItems(items).filter(isLibraryFolderItem);
  const libraryRootPath = detectLibraryRootPath(folders);
  const childFoldersByPath: Record<string, ILibraryFolderEntry[]> = {};
  const folderById = new Map<number, ILibraryFolderEntry>();
  const entries: ILibraryFolderEntry[] = [];

  folders.forEach(folder => {
    const serverRelativePath = normalizePath(joinPath(folder.fileDirRef, folder.name));
    const entry: ILibraryFolderEntry = {
      id: folder.id,
      name: folder.name,
      serverRelativePath,
      hasChildFolders: false
    };
    entries.push(entry);
    folderById.set(folder.id, entry);

    const parentPath = normalizePath(folder.fileDirRef);
    if (!childFoldersByPath[parentPath]) {
      childFoldersByPath[parentPath] = [];
    }

    childFoldersByPath[parentPath].push(entry);
  });

  entries.forEach(entry => {
    entry.hasChildFolders = (childFoldersByPath[entry.serverRelativePath]?.length ?? 0) > 0;
  });

  Object.keys(childFoldersByPath).forEach(parentPath => {
    childFoldersByPath[parentPath].sort((left, right) => left.name.localeCompare(right.name, 'vi'));
  });

  return {
    libraryRootPath,
    childFoldersByPath,
    folderById
  };
}

export function buildFolderAncestorData(
  index: ILibraryFolderIndex,
  folder: ILibraryFolderEntry
): ILibraryFolderAncestorData {
  const result: ILibraryFolderAncestorData = {
    expandedPaths: [],
    childFoldersByPath: {}
  };

  if (!index.libraryRootPath) {
    return result;
  }

  const segments = folder.serverRelativePath
    .replace(index.libraryRootPath, '')
    .split('/')
    .filter(Boolean);
  let currentPath = index.libraryRootPath;

  for (let indexSegment = 0; indexSegment < segments.length - 1; indexSegment += 1) {
    currentPath = `${currentPath}/${segments[indexSegment]}`;
    result.expandedPaths.push(currentPath);

    const children = index.childFoldersByPath[currentPath];

    if (children) {
      result.childFoldersByPath[currentPath] = children;
    }
  }

  return result;
}

export function buildFolderTree(items: IBanHanhLibraryItem[]): IBanHanhFolderNode[] {
  const folders = getFolderItems(items);
  const libraryRootPath = detectLibraryRootPath(folders);
  const nodeMap = new Map<string, IBanHanhFolderNode>();

  folders.forEach(folder => {
    const serverRelativePath = normalizePath(joinPath(folder.fileDirRef, folder.name));
    nodeMap.set(serverRelativePath, {
      id: folder.id,
      name: folder.name,
      serverRelativePath,
      children: []
    });
  });

  const roots: IBanHanhFolderNode[] = [];

  nodeMap.forEach(node => {
    const parentPath = normalizePath(node.serverRelativePath.split('/').slice(0, -1).join('/'));

    if (!parentPath || parentPath === libraryRootPath || parentPath.indexOf(libraryRootPath) !== 0) {
      roots.push(node);
      return;
    }

    const parentNode = nodeMap.get(parentPath);
    if (parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: IBanHanhFolderNode[]): void => {
    nodes.sort((left, right) => left.name.localeCompare(right.name, 'vi'));
    nodes.forEach(child => sortNodes(child.children));
  };

  sortNodes(roots);
  return roots;
}

export function getFilesInFolder(items: IBanHanhLibraryItem[], folderPath: string): IBanHanhLibraryItem[] {
  const normalizedFolderPath = normalizePath(folderPath);

  return items
    .filter(item => item.fsObjType === FILE_TYPE && normalizePath(item.fileDirRef) === normalizedFolderPath)
    .sort((left, right) => left.name.localeCompare(right.name, 'vi'));
}

export function formatBanHanhDate(value?: string): string {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(value);
  if (isNaN(parsedDate.getTime())) {
    return value;
  }

  const dayValue = parsedDate.getDate();
  const monthValue = parsedDate.getMonth() + 1;
  const day = dayValue < 10 ? `0${dayValue}` : `${dayValue}`;
  const month = monthValue < 10 ? `0${monthValue}` : `${monthValue}`;
  const year = parsedDate.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getStoragePathAfterLibrary(serverRelativePath: string, libraryTitle: string): string {
  const normalizedPath = normalizePath(serverRelativePath);
  const marker = `/${libraryTitle}/`;
  const markerIndex = normalizedPath.toLowerCase().indexOf(marker.toLowerCase());

  if (markerIndex === -1) {
    return '';
  }

  return normalizedPath.substring(markerIndex + marker.length);
}

export function getParentStoragePathAfterLibrary(serverRelativePath: string, libraryTitle: string): string {
  const fullPath = getStoragePathAfterLibrary(serverRelativePath, libraryTitle);
  const lastSlashIndex = fullPath.lastIndexOf('/');

  if (lastSlashIndex === -1) {
    return '';
  }

  return fullPath.substring(0, lastSlashIndex);
}

export function truncateText(value: string, maxLength: number): string {
  if (!value || value.length <= maxLength) {
    return value;
  }

  return `${value.substring(0, maxLength).trim()}...`;
}
