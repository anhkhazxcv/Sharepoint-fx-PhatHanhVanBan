import * as React from 'react';
import { useState } from 'react';
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
    children
  } = props;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = `sidebar-accordion-${title.replace(/\s+/g, '-').toLowerCase()}`;

  const sectionClassName = [
    styles.detailSidebarAccordion,
    fillHeight ? styles.detailSidebarAccordionFill : '',
    compact ? styles.detailSidebarAccordionCompact : '',
    !isOpen || compact ? styles.detailSidebarAccordionCollapsed : '',
    className || ''
  ].filter(Boolean).join(' ');

  const stopHeaderActionToggle = (event: React.SyntheticEvent): void => {
    event.stopPropagation();
  };

  return (
    <section className={sectionClassName}>
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
          <span
            className={[
              styles.detailSidebarAccordionChevron,
              isOpen && !compact ? styles.detailSidebarAccordionChevronOpen : ''
            ].filter(Boolean).join(' ')}
            aria-hidden="true"
          />
        </span>
      </button>

      {isOpen && !compact ? (
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
