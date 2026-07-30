import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type {
  IBanHanhFolderNode,
  IBanHanhLibraryItem,
  IPhvbSiteContext,
  ISelectedBanHanhFolder
} from '../models/PhvbMag.models';
import { phvbDocumentLibraryService } from '../services/PhvbMagDocumentLibrary.service';
import { resolveIssuanceLibraryTitle } from '../config/PhvbMag.configuration';
import { buildFolderTree, getStoragePathAfterLibrary } from '../utils/PhvbMagBanHanh.tree';
import { PhvbMagFolderConfirmDialog } from './PhvbMagFolderConfirmDialog';
import { CloseIcon, FolderAccentIcon, FolderTreeChevronDownIcon, FolderTreeChevronRightIcon } from './PhvbMagIcons';
import styles from './PhvbMag.module.scss';

interface IPhvbMagFolderPickerDialogProps {
  isOpen: boolean;
  requestType: 'Viết mới' | 'Điều chỉnh' | 'Thu hồi';
  siteContext: IPhvbSiteContext;
  onClose: () => void;
  onConfirm: (folder: ISelectedBanHanhFolder) => void;
}

interface IFolderTreeNodeProps {
  node: IBanHanhFolderNode;
  depth: number;
  expandedPaths: Set<string>;
  selectedPath?: string;
  libraryTitle: string;
  onToggleExpand: (path: string) => void;
  onSelectFolder: (folder: ISelectedBanHanhFolder) => void;
}

function FolderTreeNode(props: IFolderTreeNodeProps): React.ReactElement {
  const {
    node,
    depth,
    expandedPaths,
    selectedPath,
    libraryTitle,
    onToggleExpand,
    onSelectFolder
  } = props;
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedPaths.has(node.serverRelativePath);
  const isSelected = selectedPath === node.serverRelativePath;

  const handleSelect = (): void => {
    onSelectFolder({
      id: node.id,
      name: node.name,
      serverRelativePath: node.serverRelativePath,
      storagePath: getStoragePathAfterLibrary(node.serverRelativePath, libraryTitle)
    });
  };

  return (
    <>
      <div
        className={`${styles.libraryFolderNode} ${isSelected ? styles.libraryFolderNodeActive : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <button
          type="button"
          className={styles.libraryFolderChevron}
          onClick={event => {
            event.stopPropagation();
            if (hasChildren) {
              onToggleExpand(node.serverRelativePath);
            }
          }}
          aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
        >
          {hasChildren ? (
            isExpanded ? (
              <FolderTreeChevronDownIcon className={styles.libraryFolderChevronIcon} />
            ) : (
              <FolderTreeChevronRightIcon className={styles.libraryFolderChevronIcon} />
            )
          ) : null}
        </button>
        <button
          type="button"
          className={styles.libraryFolderNodeButton}
          onClick={handleSelect}
          title={node.name}
        >
          <FolderAccentIcon className={styles.libraryFolderIcon} />
          <span>{node.name}</span>
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className={styles.folderPickerTreeChildren}>
          {node.children.map(child => (
            <FolderTreeNode
              key={child.serverRelativePath}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              libraryTitle={libraryTitle}
              onToggleExpand={onToggleExpand}
              onSelectFolder={onSelectFolder}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function PhvbMagFolderPickerDialog(props: IPhvbMagFolderPickerDialogProps): React.ReactElement {
  const { isOpen, requestType, siteContext, onClose, onConfirm } = props;
  const [libraryFolders, setLibraryFolders] = useState<IBanHanhLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set<string>());
  const [selectedFolder, setSelectedFolder] = useState<ISelectedBanHanhFolder | undefined>(undefined);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const libraryTitle = resolveIssuanceLibraryTitle(siteContext.issuanceLibraryTitle);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadFolders = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(undefined);
      setSelectedFolder(undefined);
      setShowConfirmDialog(false);
      setExpandedPaths(new Set<string>());

      try {
        const folders = await phvbDocumentLibraryService.loadBanHanhLibraryFolders(siteContext);
        if (!isMounted) {
          return;
        }

        setLibraryFolders(folders);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLibraryFolders([]);
        setErrorMessage(error instanceof Error ? error.message : 'Không tải được danh mục thư mục ban hành.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadFolders().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [isOpen, siteContext]);

  const folderTree = useMemo(() => buildFolderTree(libraryFolders), [libraryFolders]);

  if (!isOpen) {
    return <></>;
  }

  const handleToggleExpand = (path: string): void => {
    setExpandedPaths(previousState => {
      const nextState = new Set<string>();
      previousState.forEach(item => nextState.add(item));

      if (nextState.has(path)) {
        nextState.delete(path);
      } else {
        nextState.add(path);
      }

      return nextState;
    });
  };

  const handleConfirmSelection = (): void => {
    if (!selectedFolder) {
      return;
    }

    onConfirm(selectedFolder);
    setShowConfirmDialog(false);
    onClose();
  };

  return (
    <>
      <div className={styles.folderPickerOverlay}>
        <div className={styles.folderPickerDialog}>
          <div className={styles.folderPickerHeader}>
            <h3>Danh mục thư mục ban hành</h3>
            <button type="button" className={styles.btnClose} onClick={onClose} aria-label="Đóng">
              <CloseIcon />
            </button>
          </div>

          <div className={styles.folderPickerBody}>
            <div className={styles.folderPickerTreePane}>
              <div className={styles.folderPickerTreeHeader}>
                <h4>THƯ MỤC BAN HÀNH</h4>
              </div>

              <div className={styles.folderPickerTreeScroll}>
                {isLoading && (
                  <div className={styles.libraryStatusMessage}>Đang tải danh sách thư mục...</div>
                )}
                {!isLoading && errorMessage && (
                  <div className={styles.libraryErrorBanner}>{errorMessage}</div>
                )}
                {!isLoading && !errorMessage && folderTree.length === 0 && (
                  <div className={styles.libraryStatusMessage}>Không có thư mục nào.</div>
                )}
                {!isLoading && !errorMessage && folderTree.map(node => (
                  <FolderTreeNode
                    key={node.serverRelativePath}
                    node={node}
                    depth={0}
                    expandedPaths={expandedPaths}
                    selectedPath={selectedFolder?.serverRelativePath}
                    libraryTitle={libraryTitle}
                    onToggleExpand={handleToggleExpand}
                    onSelectFolder={setSelectedFolder}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className={styles.folderPickerFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>
              Thoát
            </button>
            <button
              type="button"
              className={styles.btnSubmit}
              disabled={!selectedFolder}
              onClick={() => setShowConfirmDialog(true)}
            >
              Chọn
            </button>
          </div>
        </div>
      </div>

      <PhvbMagFolderConfirmDialog
        isOpen={showConfirmDialog}
        requestType={requestType}
        selectedFolder={selectedFolder}
        onCancel={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmSelection}
      />
    </>
  );
}
