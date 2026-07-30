import * as React from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ICommentAttachmentItem, ILichSuThucHienItem } from '../models/PhvbMag.models';
import { formatExecutionDateTime } from '../utils/PhvbMagDateTime.utils';
import { PhvbMagExternalLink } from './PhvbMagExternalLink';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailHistoryItemProps {
  item: ILichSuThucHienItem;
  attachments?: ICommentAttachmentItem[];
}

function measureContentOverflow(
  element: HTMLParagraphElement | undefined,
  collapsedClassName: string
): boolean {
  if (!element) {
    return false;
  }

  // Fast path: line-clamp often exposes overflow via scroll vs client height.
  if (element.scrollHeight > element.clientHeight + 1) {
    return true;
  }

  // Harden for browsers where -webkit-line-clamp keeps scrollHeight === clientHeight.
  const clampedHeight = element.getBoundingClientRect().height;
  const hadCollapsedClass = element.classList.contains(collapsedClassName);

  if (hadCollapsedClass) {
    element.classList.remove(collapsedClassName);
  }

  const fullHeight = element.scrollHeight;

  if (hadCollapsedClass) {
    element.classList.add(collapsedClassName);
  }

  return fullHeight > clampedHeight + 1;
}

export function PhvbMagDetailHistoryItem(props: IPhvbMagDetailHistoryItemProps): React.ReactElement {
  const { item, attachments } = props;
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [canExpand, setCanExpand] = useState<boolean>(false);

  // Only collapse when content identity changes. Do not reset canExpand here —
  // useLayoutEffect owns that, and resetting after measure used to wipe it permanently.
  useEffect(() => {
    setIsExpanded(false);
  }, [item.Id, item.NoiDung]);

  useLayoutEffect(() => {
    if (!item.NoiDung) {
      setCanExpand(false);
      return;
    }

    // Keep toggle visible ("Ẩn bớt") while expanded; re-measure when collapsed.
    if (isExpanded) {
      return;
    }

    setCanExpand(
      measureContentOverflow(contentRef.current || undefined, styles.detailHistoryContentCollapsed)
    );
  }, [item.Id, item.NoiDung, isExpanded]);

  const handleToggleExpand = (): void => {
    setIsExpanded(previous => !previous);
  };

  return (
    <div className={styles.detailHistoryItem}>
      <div className={styles.detailHistoryHeader}>
        <strong>{item.User_ThucHien || '---'}</strong>
        <span className={styles.detailHistoryDate}>
          {formatExecutionDateTime(item.Ngay_ThucHien || item.Created)}
        </span>
      </div>
      <span className={styles.detailHistoryStatus}>
        {item.TrangThai_ThucHien || '---'}
      </span>
      {item.NoiDung ? (
        <>
          <p
            ref={contentRef}
            title={!isExpanded && canExpand ? item.NoiDung : undefined}
            className={[
              styles.detailHistoryContent,
              !isExpanded ? styles.detailHistoryContentCollapsed : ''
            ].filter(Boolean).join(' ')}
          >
            {item.NoiDung}
          </p>
          {canExpand ? (
            <button
              type="button"
              className={styles.detailHistoryContentToggle}
              onClick={handleToggleExpand}
            >
              {isExpanded ? 'Ẩn bớt' : 'Xem thêm'}
            </button>
          ) : null}
        </>
      ) : null}
      {attachments && attachments.length > 0 ? (
        <ul className={styles.detailCommentAttachmentList}>
          {attachments.map(attachment => (
            <li key={attachment.id}>
              <PhvbMagExternalLink
                href={attachment.fileUrl}
                className={styles.detailCommentAttachmentLink}
              >
                {attachment.name}
              </PhvbMagExternalLink>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
