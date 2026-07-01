import * as React from 'react';
import { useState } from 'react';
import styles from './PhvbMag.module.scss';

interface IPhvbMagSidebarAccordionProps {
  title: string;
  badge?: string | number;
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
    className || ''
  ].filter(Boolean).join(' ');

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
          {badge !== undefined && badge !== null && `${badge}` !== '' ? (
            <span className={styles.detailSidebarAccordionBadge}>{badge}</span>
          ) : null}
        </span>
        <span
          className={[
            styles.detailSidebarAccordionChevron,
            isOpen && !compact ? styles.detailSidebarAccordionChevronOpen : ''
          ].filter(Boolean).join(' ')}
          aria-hidden="true"
        />
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
