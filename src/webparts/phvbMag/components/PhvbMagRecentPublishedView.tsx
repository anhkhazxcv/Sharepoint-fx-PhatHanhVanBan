import * as React from 'react';
import { useEffect, useState } from 'react';
import { ATTACHMENT_FORM_SUBFOLDER, TAB_LABELS } from '../config/PhvbMag.configuration';
import type { IBanHanhLibraryItem, IPhvbSiteContext } from '../models/PhvbMag.models';
import { usePhvbRecentPublished } from '../hooks/usePhvbRecentPublished';
import { resolveLibraryContactPerson } from '../utils/PhvbMagLibrary.utils';
import {
  formatRecentPublishDate,
  type IRecentPublishedSection
} from '../utils/PhvbMagRecentPublished.utils';
import {
  AccordionChevronIcon,
  FolderAccentIcon
} from './PhvbMagIcons';
import { PhvbMagLibraryDocumentCard } from './PhvbMagLibraryDocumentCard';
import { PhvbMagLibraryListPageShell } from './PhvbMagLibraryListPageShell';
import styles from './PhvbMag.module.scss';

interface IPhvbMagRecentPublishedViewProps {
  siteContext: IPhvbSiteContext;
}

interface IRecentDocumentCardProps {
  document: IBanHanhLibraryItem;
  isFormAttachment?: boolean;
}

interface IRecentPublishedSectionProps {
  section: IRecentPublishedSection;
  isExpanded: boolean;
  onToggle: () => void;
}

function RecentDocumentCard(props: IRecentDocumentCardProps): React.ReactElement {
  const { document, isFormAttachment = false } = props;
  const publishDate = formatRecentPublishDate(document.ngayPhatHanh) || 'Chưa xác định';
  const contactPerson = resolveLibraryContactPerson(document.lienHe);

  return (
    <PhvbMagLibraryDocumentCard
      document={document}
      showDownload
      badgeContent={isFormAttachment ? (
        <span className={styles.recentFormBadge}>Biểu mẫu</span>
      ) : null}
      metaContent={(
        <>
          <span className={styles.libraryDocumentEffectiveDate}>
            <strong>Ngày ban hành:</strong> {publishDate}
          </span>
          <span className={styles.libraryDocumentContact}>
            <strong>Người liên hệ:</strong> {contactPerson}
          </span>
        </>
      )}
    />
  );
}

function RecentPublishedSection(props: IRecentPublishedSectionProps): React.ReactElement {
  const { section, isExpanded, onToggle } = props;
  const fileCount = section.documents.length + section.formDocuments.length;

  return (
    <section className={styles.recentSection}>
      <button
        type="button"
        className={styles.recentSectionHeaderButton}
        aria-expanded={isExpanded}
        onClick={onToggle}
      >
        <FolderAccentIcon className={styles.recentSectionFolderIcon} />
        <span className={styles.recentSectionTitle} title={section.displayPathFull || section.displayPath}>
          {section.displayPath}
        </span>
        <span className={styles.recentSectionCount}>{fileCount}</span>
        <AccordionChevronIcon
          isOpen={isExpanded}
          className={styles.recentSectionChevron}
        />
      </button>

      {isExpanded ? (
        <>
          {section.documents.length > 0 ? (
            <div className={styles.libraryDocumentList}>
              {section.documents.map(document => (
                <RecentDocumentCard key={document.id} document={document} />
              ))}
            </div>
          ) : null}

          {section.formDocuments.length > 0 ? (
            <div className={styles.recentFormSubsection}>
              <div className={styles.recentFormSubsectionHeader}>
                <FolderAccentIcon className={styles.recentSectionFolderIcon} />
                <span>{ATTACHMENT_FORM_SUBFOLDER}</span>
              </div>
              <div className={styles.libraryDocumentList}>
                {section.formDocuments.map(document => (
                  <RecentDocumentCard
                    key={document.id}
                    document={document}
                    isFormAttachment
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export function PhvbMagRecentPublishedView(props: IPhvbMagRecentPublishedViewProps): React.ReactElement {
  const { siteContext } = props;
  const recent = usePhvbRecentPublished(siteContext);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set<string>());
  const hasSections = recent.sections.length > 0;

  useEffect(() => {
    const validKeys = new Set<string>();
    recent.sections.forEach((section: IRecentPublishedSection) => {
      validKeys.add(section.documentFolderKey);
    });

    setExpandedKeys((previous: Set<string>) => {
      const next = new Set<string>();
      previous.forEach((key: string) => {
        if (validKeys.has(key)) {
          next.add(key);
        }
      });

      if (next.size === previous.size) {
        let unchanged = true;
        previous.forEach((key: string) => {
          if (!next.has(key)) {
            unchanged = false;
          }
        });
        if (unchanged) {
          return previous;
        }
      }

      return next;
    });
  }, [recent.sections]);

  const handleToggleSection = (documentFolderKey: string): void => {
    setExpandedKeys((previous: Set<string>) => {
      const next = new Set<string>();
      previous.forEach((key: string) => {
        next.add(key);
      });
      if (next.has(documentFolderKey)) {
        next.delete(documentFolderKey);
      } else {
        next.add(documentFolderKey);
      }
      return next;
    });
  };

  const handleExpandAll = (): void => {
    const next = new Set<string>();
    recent.sections.forEach((section: IRecentPublishedSection) => {
      next.add(section.documentFolderKey);
    });
    setExpandedKeys(next);
  };

  const handleCollapseAll = (): void => {
    setExpandedKeys(new Set<string>());
  };

  return (
    <PhvbMagLibraryListPageShell
      eyebrow="Thư viện"
      title={TAB_LABELS.MoiBanHanh}
      subtitle={`Văn bản ban hành trong ${recent.windowDays} ngày gần nhất`}
      headerActions={hasSections ? (
        <div className={styles.recentHeaderActions}>
          <button
            type="button"
            className={styles.recentHeaderActionBtn}
            onClick={handleExpandAll}
          >
            Mở tất cả
          </button>
          <button
            type="button"
            className={styles.recentHeaderActionBtn}
            onClick={handleCollapseAll}
          >
            Thu gọn tất cả
          </button>
        </div>
      ) : undefined}
      isLoading={recent.isLoading}
      loadingMessage="Đang tải văn bản mới ban hành..."
      errorMessage={recent.errorMessage}
      isEmpty={recent.sections.length === 0}
      emptyMessage={`Không có văn bản mới trong ${recent.windowDays} ngày qua.`}
    >
      <div className={styles.recentSectionList}>
        {recent.sections.map(section => (
          <RecentPublishedSection
            key={section.documentFolderKey}
            section={section}
            isExpanded={expandedKeys.has(section.documentFolderKey)}
            onToggle={() => handleToggleSection(section.documentFolderKey)}
          />
        ))}
      </div>
    </PhvbMagLibraryListPageShell>
  );
}
