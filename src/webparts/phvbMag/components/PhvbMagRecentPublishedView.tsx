import * as React from 'react';
import { useEffect, useState } from 'react';
import { TooltipHost } from '@fluentui/react';
import { ATTACHMENT_FORM_SUBFOLDER, TAB_LABELS } from '../config/PhvbMag.configuration';
import type { IBanHanhLibraryItem, IPhvbSiteContext } from '../models/PhvbMag.models';
import { usePhvbRecentPublished } from '../hooks/usePhvbRecentPublished';
import {
  formatViewCount,
  resolveLibraryContactPerson,
  resolveLibraryDocumentEffectiveStatus,
  resolveLibraryFileTypeVisual
} from '../utils/PhvbMagLibrary.utils';
import {
  formatRecentPublishDate,
  type IRecentPublishedSection
} from '../utils/PhvbMagRecentPublished.utils';
import { PhvbMagExternalLink } from './PhvbMagExternalLink';
import {
  AccordionChevronIcon,
  DownloadIcon,
  EyeIcon,
  FolderAccentIcon,
  LibraryFileTypeIcon
} from './PhvbMagIcons';
import { PhvbMagLoadingOverlay } from './PhvbMagLoadingOverlay';
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
  const fileType = resolveLibraryFileTypeVisual(document.name);
  const viewCountLabel = formatViewCount(document.viewCount);
  const effectiveStatus = resolveLibraryDocumentEffectiveStatus(document.hieuLucTu, document.hieuLucDen);
  const contactPerson = resolveLibraryContactPerson(document.lienHe);
  const publishDate = formatRecentPublishDate(document.ngayPhatHanh) || 'Chưa xác định';
  const summaryText = document.tomTatVanban?.trim() || 'Chưa có tóm tắt nội dung.';
  const canShowDownload = document.canDownload === true && Boolean(document.downloadUrl);

  return (
    <article className={styles.libraryDocumentItem}>
      <div className={styles.libraryDocumentFileType}>
        <LibraryFileTypeIcon
          iconName={fileType.iconName}
          style={{ color: fileType.color }}
        />
      </div>

      <div className={styles.libraryDocumentContent}>
        <div className={styles.libraryDocumentTitleRow}>
          <PhvbMagExternalLink
            href={document.fileUrl}
            className={styles.libraryDocumentTitle}
          >
            {document.name}
          </PhvbMagExternalLink>

          <div className={styles.libraryDocumentStatusGroup}>
            {isFormAttachment ? (
              <span className={styles.recentFormBadge}>Biểu mẫu</span>
            ) : null}
            {viewCountLabel ? (
              <span className={styles.libraryDocumentViews}>
                <EyeIcon className={styles.libraryDocumentViewsIcon} />
                {viewCountLabel}
              </span>
            ) : null}
            <span
              className={styles.libraryDocumentStatusEffective}
              data-status={effectiveStatus === 'expired' ? 'expired' : 'effective'}
            >
              {effectiveStatus === 'effective' ? 'Còn hiệu lực' : 'Hết hiệu lực'}
            </span>
            {canShowDownload ? (
              <TooltipHost content="Tải xuống">
                <PhvbMagExternalLink
                  href={document.downloadUrl}
                  className={styles.libraryDocumentDownloadBtn}
                  aria-label="Tải xuống"
                >
                  <DownloadIcon style={{ width: 14, height: 14 }} />
                </PhvbMagExternalLink>
              </TooltipHost>
            ) : null}
          </div>
        </div>

        <TooltipHost content={summaryText}>
          <p className={styles.libraryDocumentSummary}>
            {summaryText}
          </p>
        </TooltipHost>

        <div className={styles.libraryDocumentMeta}>
          <span className={styles.libraryDocumentEffectiveDate}>
            <strong>Ngày ban hành:</strong> {publishDate}
          </span>
          <span className={styles.libraryDocumentContact}>
            <strong>Người liên hệ:</strong> {contactPerson}
          </span>
        </div>
      </div>
    </article>
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
        <span className={styles.recentSectionTitle} title={section.displayPath}>
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
    <div className={styles.recentView}>
      <header className={styles.recentHeader}>
        <div className={styles.pageHeading}>
          <span className={styles.pageEyebrow}>Thư viện</span>
          <h2>{TAB_LABELS.MoiBanHanh}</h2>
          <p className={styles.recentSubtitle}>Văn bản ban hành trong 7 ngày gần nhất</p>
        </div>

        {hasSections ? (
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
        ) : null}
      </header>

      <div className={styles.recentBody}>
        <PhvbMagLoadingOverlay isOpen={recent.isLoading} message="Đang tải văn bản mới ban hành..." />

        {!recent.isLoading && recent.errorMessage ? (
          <div className={styles.recentEmptyState} role="alert">
            <p>{recent.errorMessage}</p>
          </div>
        ) : null}

        {!recent.isLoading && !recent.errorMessage && recent.sections.length === 0 ? (
          <div className={styles.recentEmptyState}>
            <p>Không có văn bản mới trong 7 ngày qua.</p>
          </div>
        ) : null}

        {!recent.isLoading && !recent.errorMessage && recent.sections.length > 0 ? (
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
        ) : null}
      </div>
    </div>
  );
}
