import * as React from 'react';
import { FolderAccentIcon, FolderTreeChevronDownIcon, FolderTreeChevronRightIcon } from './PhvbMagIcons';
import styles from './PhvbMag.module.scss';

export interface IPhvbMagFolderTreeNodeProps {
  name: string;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
}

export function PhvbMagFolderTreeNode(props: IPhvbMagFolderTreeNodeProps): React.ReactElement {
  const {
    name,
    depth,
    hasChildren,
    isExpanded,
    isSelected,
    onToggleExpand,
    onSelect
  } = props;

  return (
    <div
      className={[styles.libraryFolderNode, isSelected ? styles.libraryFolderNodeActive : ''].filter(Boolean).join(' ')}
      style={{ ['--phvb-folder-depth' as string]: depth }}
    >
      <button
        type="button"
        className={styles.libraryFolderChevron}
        onClick={event => {
          event.stopPropagation();
          if (hasChildren) {
            onToggleExpand();
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
        onClick={onSelect}
        title={name}
      >
        <FolderAccentIcon className={styles.libraryFolderIcon} />
        <span>{name}</span>
      </button>
    </div>
  );
}
