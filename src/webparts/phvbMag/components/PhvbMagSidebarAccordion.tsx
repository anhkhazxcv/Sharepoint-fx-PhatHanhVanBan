import * as React from 'react';
import { useState } from 'react';
import { AccordionChevronIcon } from './PhvbMagIcons';
import styles from './PhvbMag.module.scss';

interface IPhvbMagSidebarAccordionProps {
  title: string;
  badge?: string | number;
  titleSuffix?: string;
  headerActions?: React.ReactNode;
  defaultOpen?: boolean;
  bodyMaxHeight?: number;
  className?: string;
  fillHeight?: boolean;
  compact?: boolean;
  footer?: React.ReactNode;
  /**
   * Bỏ hẳn thanh header (tiêu đề + badge + nút collapse) và luôn mở. Dùng khi
   * container bên ngoài đã có tiêu đề riêng — vd. bottom sheet trên mobile,
   * nơi header accordion vừa trùng tiêu đề vừa để lại nút collapse vô nghĩa.
   */
  hideHeader?: boolean;
  children: React.ReactNode;
}

export function PhvbMagSidebarAccordion(props: IPhvbMagSidebarAccordionProps): React.ReactElement {
  const {
    title,
    badge,
    titleSuffix,
    headerActions,
    defaultOpen = true,
    bodyMaxHeight = 320,
    className,
    fillHeight = false,
    compact = false,
    footer,
    hideHeader = false,
    children
  } = props;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  // hideHeader thì không còn cách nào mở lại, nên buộc luôn mở.
  const isExpanded = hideHeader || (isOpen && !compact);
  const panelId = `sidebar-accordion-${title.replace(/\s+/g, '-').toLowerCase()}`;

  const sectionClassName = [
    styles.detailSidebarAccordion,
    fillHeight ? styles.detailSidebarAccordionFill : '',
    compact ? styles.detailSidebarAccordionCompact : '',
    !isExpanded ? styles.detailSidebarAccordionCollapsed : '',
    className || ''
  ].filter(Boolean).join(' ');

  const stopHeaderActionToggle = (event: React.SyntheticEvent): void => {
    event.stopPropagation();
  };

  return (
    <section className={sectionClassName}>
      {!hideHeader ? (
      <button
        type="button"
        className={styles.detailSidebarAccordionHeader}
        aria-expanded={isOpen && !compact}
        aria-controls={panelId}
        onClick={() => setIsOpen(previous => !previous)}
      >
        <span className={styles.detailSidebarAccordionTitleRow}>
          <span className={styles.detailSidebarAccordionTitle}>{title}</span>
          {titleSuffix ? (
            <span className={styles.detailSidebarAccordionTitleSuffix}>{titleSuffix}</span>
          ) : null}
          {badge !== undefined && badge !== null && `${badge}` !== '' ? (
            <span className={styles.detailSidebarAccordionBadge}>{badge}</span>
          ) : null}
        </span>

        <span className={styles.detailSidebarAccordionHeaderActions}>
          {headerActions ? (
            <span
              className={styles.detailSidebarAccordionHeaderActionsSlot}
              onClick={stopHeaderActionToggle}
              onPointerDown={stopHeaderActionToggle}
            >
              {headerActions}
            </span>
          ) : null}
          <AccordionChevronIcon
            className={styles.detailSidebarAccordionChevron}
            isOpen={isOpen && !compact}
          />
        </span>
      </button>
      ) : null}

      {isExpanded ? (
        <>
          <div
            id={panelId}
            className={styles.detailSidebarAccordionBody}
            style={fillHeight ? undefined : { maxHeight: `${bodyMaxHeight}px` }}
          >
            {children}
          </div>
          {footer ? (
            <div className={styles.detailSidebarAccordionFooter}>
              {footer}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
