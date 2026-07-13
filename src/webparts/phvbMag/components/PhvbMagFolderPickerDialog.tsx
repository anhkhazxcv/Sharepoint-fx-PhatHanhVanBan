import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type {
  IBanHanhFolderNode,
  IBanHanhLibraryItem,
  IPhvbSiteContext,
  ISelectedBanHanhFolder
} from '../models/PhvbMag.models';
import { phvbDocumentLibraryService } from '../services/PhvbMagDocumentLibrary.service';
import { ISSUANCE_LIBRARY_TITLE } from '../config/PhvbMag.configuration';
import { buildFolderTree, formatBanHanhDate, getFilesInFolder, getStoragePathAfterLibrary, truncateText } from '../utils/PhvbMagBanHanh.tree';
import { PhvbMagFolderConfirmDialog } from './PhvbMagFolderConfirmDialog';
import { PhvbMagExternalLink } from './PhvbMagExternalLink';
import styles from './PhvbMag.module.scss';

interface IPhvbMagFolderPickerDialogProps {
  isOpen: boolean;
  requestType: 'Viết mới' | 'Điều chỉnh' | 'Thu hồi';
  siteContext: IPhvbSiteContext;
  onClose: () => void;
  onConfirm: (folder: ISelectedBanHanhFolder) => void;
}

function getFileIconLabel(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  if (extension === 'doc' || extension === 'docx') {
    return 'W';
  }

  if (extension === 'xls' || extension === 'xlsx') {
    return 'X';
  }

  if (extension === 'pdf') {
    return 'PDF';
  }

  return 'DOC';
}

interface IFolderTreeNodeProps {
  node: IBanHanhFolderNode;
  depth: number;
  expandedPaths: Set<string>;
  selectedPath?: string;
  onToggleExpand: (path: string) => void;
  onSelectFolder: (folder: ISelectedBanHanhFolder) => void;
}

function FolderTreeNode(props: IFolderTreeNodeProps): React.ReactElement {
  const { node, depth, expandedPaths, selectedPath, onToggleExpand, onSelectFolder } = props;
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedPaths.has(node.serverRelativePath);
  const isSelected = selectedPath === node.serverRelativePath;

  const handleSelect = (): void => {
    onSelectFolder({
      id: node.id,
      name: node.name,
      serverRelativePath: node.serverRelativePath,
      storagePath: getStoragePathAfterLibrary(node.serverRelativePath, ISSUANCE_LIBRARY_TITLE)
    });
  };

  return (
    <>
      <div
        className={`${styles.folderTreeNode} ${isSelected ? styles.folderTreeNodeActive : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <button
          type="button"
          className={`${styles.folderTreeChevron} ${isExpanded ? styles.folderTreeChevronExpanded : ''}`}
          onClick={event => {
            event.stopPropagation();
            if (hasChildren) {
              onToggleExpand(node.serverRelativePath);
            }
          }}
          aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
        >
          {hasChildren ? (isExpanded ? 'v' : '>') : ' '}
        </button>
        <button
          type="button"
          className={styles.folderTreeNodeContent}
          onClick={handleSelect}
          title={node.name}
        >
          <span className={styles.folderTreeIcon}>📁</span>
          <span className={styles.folderTreeLabel}>{node.name}</span>
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className={styles.folderTreeChildren}>
          {node.children.map(child => (
            <FolderTreeNode
              key={child.serverRelativePath}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
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
  const [libraryItems, setLibraryItems] = useState<IBanHanhLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set<string>());
  const [selectedFolder, setSelectedFolder] = useState<ISelectedBanHanhFolder | undefined>(undefined);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadItems = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(undefined);
      setSelectedFolder(undefined);
      setShowConfirmDialog(false);
      setExpandedPaths(new Set<string>());

      try {
        const items = await phvbDocumentLibraryService.loadBanHanhLibraryItems(siteContext);
        if (!isMounted) {
          return;
        }

        setLibraryItems(items);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLibraryItems([]);
        setErrorMessage(error instanceof Error ? error.message : 'Không tải được danh mục thư mục ban hành.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadItems().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [isOpen, siteContext]);

  const folderTree = useMemo(() => buildFolderTree(libraryItems), [libraryItems]);
  const documentsInFolder = useMemo(() => {
    if (!selectedFolder) {
      return [];
    }

    return getFilesInFolder(libraryItems, selectedFolder.serverRelativePath);
  }, [libraryItems, selectedFolder]);

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
            <button type="button" className={styles.btnClose} onClick={onClose}>×</button>
          </div>

          <div className={styles.folderPickerBody}>
            <div className={styles.folderTreePane}>
              <div className={styles.folderTreeHeader}>
                <span className={styles.folderTreeIcon}>📁</span>
                <span>Danh sách thư mục</span>
              </div>

              <div className={styles.folderTreeScroll}>
                {isLoading && <div className={styles.folderPickerStatus}>Đang tải danh sách thư mục...</div>}
                {!isLoading && errorMessage && <div className={styles.folderPickerError}>{errorMessage}</div>}
                {!isLoading && !errorMessage && folderTree.length === 0 && (
                  <div className={styles.folderPickerStatus}>Không có thư mục nào.</div>
                )}
                {!isLoading && !errorMessage && folderTree.map(node => (
                  <FolderTreeNode
                    key={node.serverRelativePath}
                    node={node}
                    depth={0}
                    expandedPaths={expandedPaths}
                    selectedPath={selectedFolder?.serverRelativePath}
                    onToggleExpand={handleToggleExpand}
                    onSelectFolder={setSelectedFolder}
                  />
                ))}
              </div>
            </div>

            <div className={styles.folderDocPane}>
              <div className={styles.folderDocPaneHeader}>Danh sách văn bản trong thư mục</div>
              <div className={styles.folderDocList}>
                {!selectedFolder && (
                  <div className={styles.folderPickerStatus}>Chọn một thư mục để xem danh sách văn bản.</div>
                )}
                {selectedFolder && documentsInFolder.length === 0 && (
                  <div className={styles.folderPickerStatus}>Thư mục này chưa có văn bản.</div>
                )}
                {selectedFolder && documentsInFolder.map((document, documentIndex) => (
                  <div
                    key={document.id}
                    className={styles.folderDocCard}
                    style={{ animationDelay: `${Math.min(documentIndex, 8) * 45}ms` }}
                  >
                    <PhvbMagExternalLink
                      href={document.fileUrl}
                      className={styles.folderDocCardTitle}
                    >
                      {document.name}
                    </PhvbMagExternalLink>
                    <div className={styles.folderDocCardBody}>
                      <div className={styles.folderDocCardIcon}>{getFileIconLabel(document.name)}</div>
                      <div className={styles.folderDocCardSummary}>
                        {truncateText(document.tomTatVanban || 'Chưa có tóm tắt nội dung.', 180)}
                      </div>
                    </div>
                    <div className={styles.folderDocCardMeta}>
                      <span>
                        <span className={styles.folderDocCardMetaLabel}>Người liên hệ:</span> {document.lienHe || '—'}
                      </span>
                      <span>
                        <span className={styles.folderDocCardMetaLabel}>Ngày hiệu lực:</span> {formatBanHanhDate(document.hieuLucTu) || '—'}
                      </span>
                    </div>
                  </div>
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
