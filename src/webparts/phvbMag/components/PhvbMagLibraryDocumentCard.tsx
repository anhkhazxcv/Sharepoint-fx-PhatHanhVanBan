import * as React from 'react';
import { TooltipHost } from '@fluentui/react';
import type { IBanHanhLibraryItem } from '../models/PhvbMag.models';
import {
  formatViewCount,
  resolveLibraryContactPerson,
  resolveLibraryDocumentEffectiveStatus,
  resolveLibraryFileTypeVisual
} from '../utils/PhvbMagLibrary.utils';
import { PhvbMagExternalLink } from './PhvbMagExternalLink';
import {
  DownloadIcon,
  EyeIcon,
  LibraryFileTypeIcon,
  type LibraryFileTypeIconName
} from './PhvbMagIcons';
import { PhvbMagSaveBookmarkButton } from './PhvbMagSaveBookmarkButton';
import { usePhvbRecentViewsOptional } from '../context/PhvbMagRecentViews.context';
import styles from './PhvbMag.module.scss';

export interface IPhvbMagLibraryDocumentCardProps {
  document: IBanHanhLibraryItem;
  showDownload: boolean;
  showBookmark?: boolean;
  trackRecentView?: boolean;
  summaryText?: string;
  metaContent: React.ReactNode;
  badgeContent?: React.ReactNode;
  className?: string;
}

const LIBRARY_FILE_TYPE_CLASS: Record<LibraryFileTypeIconName, string> = {
  pdf: styles.libraryFileTypePdf,
  word: styles.libraryFileTypeWord,
  excel: styles.libraryFileTypeExcel,
  powerpoint: styles.libraryFileTypePowerpoint,
  file: styles.libraryFileTypeFile
};

function PhvbMagLibraryDocumentCardInner(props: IPhvbMagLibraryDocumentCardProps): React.ReactElement {
  const {
    document,
    showDownload,
    showBookmark = true,
    trackRecentView = true,
    summaryText: summaryTextOverride,
    metaContent,
    badgeContent,
    className
  } = props;
  const recentViews = usePhvbRecentViewsOptional();
  const fileType = resolveLibraryFileTypeVisual(document.name);
  const viewCountLabel = formatViewCount(document.viewCount);
  const effectiveStatus = resolveLibraryDocumentEffectiveStatus(document.hieuLucTu, document.hieuLucDen);
  const summaryText = summaryTextOverride !== undefined
    ? summaryTextOverride
    : (document.tomTatVanban?.trim() || 'Chưa có tóm tắt nội dung.');
  const canShowDownload = showDownload
    && document.canDownload === true
    && Boolean(document.downloadUrl);

  const handleOpenDocument = (): void => {
    if (trackRecentView && recentViews) {
      recentViews.recordView(document);
    }
  };

  return (
    <article className={[styles.libraryDocumentItem, className].filter(Boolean).join(' ')}>
      <div className={styles.libraryDocumentFileType}>
        <LibraryFileTypeIcon
          iconName={fileType.iconName}
          className={`${styles.libraryFileTypeIcon} ${LIBRARY_FILE_TYPE_CLASS[fileType.iconName]}`}
        />
      </div>

      <div className={styles.libraryDocumentContent}>
        <div className={styles.libraryDocumentTitleRow}>
          <PhvbMagExternalLink
            href={document.fileUrl}
            className={styles.libraryDocumentTitle}
            onOpen={handleOpenDocument}
          >
            {document.name}
          </PhvbMagExternalLink>

          <div className={styles.libraryDocumentStatusGroup}>
            {badgeContent}
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
            <PhvbMagSaveBookmarkButton document={document} showBookmark={showBookmark} />
            {canShowDownload ? (
              <TooltipHost content="Tải xuống">
                <PhvbMagExternalLink
                  href={document.downloadUrl}
                  className={styles.libraryDocumentDownloadBtn}
                  aria-label="Tải xuống"
                >
                  <DownloadIcon className={styles.iconSizeSm} />
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
          {metaContent}
        </div>
      </div>
    </article>
  );
}

export const PhvbMagLibraryDocumentCard = React.memo(PhvbMagLibraryDocumentCardInner);

export function buildLibraryEffectiveMeta(document: IBanHanhLibraryItem, effectiveDate: string): React.ReactElement {
  const contactPerson = resolveLibraryContactPerson(document.lienHe);

  return (
    <>
      <span className={styles.libraryDocumentContact}>
        <strong>Người liên hệ:</strong> {contactPerson}
      </span>
      <span className={styles.libraryDocumentEffectiveDate}>
        <strong>Ngày hiệu lực:</strong> {effectiveDate}
      </span>
    </>
  );
}
