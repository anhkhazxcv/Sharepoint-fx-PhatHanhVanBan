import * as React from 'react';
import { TooltipHost } from '@fluentui/react';
import type { IBanHanhLibraryItem } from '../models/PhvbMag.models';
import {
  isPreviewableFile,
  resolveOfficeEmbedUrlFromItem,
  resolvePreviewUrlFromItem
} from '../infrastructure/SharePointFile.utils';
import { formatBanHanhDate, getStoragePathAfterLibrary } from '../utils/PhvbMagBanHanh.tree';
import {
  resolveLibraryContactPerson,
  resolveLibraryDocumentEffectiveStatus,
  resolveLibraryFileTypeVisual
} from '../utils/PhvbMagLibrary.utils';
import { PhvbMagEmptyState } from './PhvbMagEmptyState';
import { PhvbMagExternalLink } from './PhvbMagExternalLink';
import { PhvbMagSaveBookmarkButton } from './PhvbMagSaveBookmarkButton';
import { PhvbMagSkeleton } from './PhvbMagSkeleton';
import {
  CloseIcon,
  CopyLinkIcon,
  DownloadIcon,
  LibraryFileTypeIcon,
  OpenExternalIcon,
  PaginationNextIcon,
  PaginationPreviousIcon,
  PreviewExitFullscreenIcon,
  PreviewFullscreenIcon
} from './PhvbMagIcons';
import styles from './PhvbMag.module.scss';

/** Embedded viewers fail silently — no onError fires — so fall back on a timer. */
const PREVIEW_LOAD_TIMEOUT_MS = 15000;

export type PhvbMagDocumentPreviewVariant = 'column' | 'overlay';

export interface IPhvbMagDocumentPreviewProps {
  document: IBanHanhLibraryItem;
  libraryTitle: string;
  variant: PhvbMagDocumentPreviewVariant;
  isFullscreen: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onToggleFullscreen: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  onCopyLink: () => void;
}

function buildFolderBreadcrumb(fileDirRef: string, libraryTitle: string): string {
  const storagePath = getStoragePathAfterLibrary(fileDirRef, libraryTitle);
  return storagePath ? storagePath.split('/').filter(Boolean).join(' › ') : '';
}

export function PhvbMagDocumentPreview(props: IPhvbMagDocumentPreviewProps): React.ReactElement {
  const {
    document,
    libraryTitle,
    variant,
    isFullscreen,
    hasPrevious,
    hasNext,
    onToggleFullscreen,
    onPrevious,
    onNext,
    onClose,
    onCopyLink
  } = props;

  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [hasLoadFailed, setHasLoadFailed] = React.useState<boolean>(false);
  const [isUsingOfficeFallback, setIsUsingOfficeFallback] = React.useState<boolean>(false);

  const fileType = resolveLibraryFileTypeVisual(document.name);
  const effectiveStatus = resolveLibraryDocumentEffectiveStatus(document.hieuLucTu, document.hieuLucDen);
  const contactPerson = resolveLibraryContactPerson(document.lienHe);
  const effectiveFrom = formatBanHanhDate(document.hieuLucTu) || 'Chưa xác định';
  const effectiveTo = formatBanHanhDate(document.hieuLucDen) || 'không thời hạn';
  const folderBreadcrumb = buildFolderBreadcrumb(document.fileDirRef, libraryTitle);
  const summaryText = document.tomTatVanban?.trim() || 'Chưa có tóm tắt nội dung.';

  // Card is hidden behind the overlay / fullscreen, so re-offer its actions there only.
  const isCardHidden = variant === 'overlay' || isFullscreen;
  const canShowDownload = isCardHidden && document.canDownload === true && Boolean(document.downloadUrl);
  const canPreviewFileType = isPreviewableFile(document.name, document.fileRef);

  // Prefer the URLs the library mapper computed on the site that actually
  // answered. Items that bypassed that mapper (persisted cache written before
  // preview existed, search fallback, hand-built) have none — derive from the
  // item's own fileUrl/fileRef instead of falling straight to the error panel.
  const primaryPreviewUrl = React.useMemo(
    () => document.previewUrl || resolvePreviewUrlFromItem(document, libraryTitle),
    [document, libraryTitle]
  );
  const officeEmbedUrl = React.useMemo(
    () => document.officeEmbedUrl || resolveOfficeEmbedUrlFromItem(document, libraryTitle),
    [document, libraryTitle]
  );
  const previewUrl = isUsingOfficeFallback ? officeEmbedUrl : primaryPreviewUrl;

  // Reset the load state whenever the previewed document changes.
  React.useEffect(() => {
    setIsUsingOfficeFallback(false);
    setIsLoading(Boolean(primaryPreviewUrl));
    setHasLoadFailed(!primaryPreviewUrl);
  }, [primaryPreviewUrl]);

  React.useEffect(() => {
    if (!isLoading || !previewUrl) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      // Office files get a second chance on the Doc.aspx embed before giving up.
      if (!isUsingOfficeFallback && officeEmbedUrl) {
        setIsUsingOfficeFallback(true);
        return;
      }

      setIsLoading(false);
      setHasLoadFailed(true);
    }, PREVIEW_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isLoading, previewUrl, isUsingOfficeFallback, officeEmbedUrl]);

  const handleFrameLoad = (): void => {
    setIsLoading(false);
  };

  return (
    <section
      className={[
        styles.previewPane,
        variant === 'overlay' ? styles.previewPaneOverlay : styles.previewPaneColumn
      ].join(' ')}
      aria-label="Xem trước tài liệu"
    >
      <header className={styles.previewHeader}>
        <div className={styles.previewIdentity}>
          <LibraryFileTypeIcon
            iconName={fileType.iconName}
            className={[
              styles.previewFileTypeIcon,
              fileType.iconName === 'file' ? styles.libraryFileTypeFile : undefined
            ].filter(Boolean).join(' ')}
          />

          <TooltipHost content={variant === 'overlay' ? summaryText : document.name}>
            <h3 className={styles.previewTitle}>{document.name}</h3>
          </TooltipHost>

          {document.isFormAttachment ? (
            <span className={styles.recentFormBadge}>Biểu mẫu</span>
          ) : null}

          <span
            className={styles.libraryDocumentStatusEffective}
            data-status={effectiveStatus === 'expired' ? 'expired' : 'effective'}
          >
            {effectiveStatus === 'effective' ? 'Đang hiệu lực' : 'Hết hiệu lực'}
          </span>
        </div>

        <div className={styles.previewActions}>
          <div className={styles.previewNav}>
            <TooltipHost content="Tài liệu trước">
              <button
                type="button"
                className={styles.previewIconButton}
                onClick={onPrevious}
                disabled={!hasPrevious}
                aria-label="Tài liệu trước"
              >
                <PaginationPreviousIcon className={styles.iconSizeSm} />
              </button>
            </TooltipHost>
            <TooltipHost content="Tài liệu sau">
              <button
                type="button"
                className={styles.previewIconButton}
                onClick={onNext}
                disabled={!hasNext}
                aria-label="Tài liệu sau"
              >
                <PaginationNextIcon className={styles.iconSizeSm} />
              </button>
            </TooltipHost>
          </div>

          {canShowDownload ? (
            <TooltipHost content="Tải xuống">
              <PhvbMagExternalLink
                href={document.downloadUrl}
                className={styles.previewIconButton}
                aria-label="Tải xuống"
              >
                <DownloadIcon className={styles.iconSizeSm} />
              </PhvbMagExternalLink>
            </TooltipHost>
          ) : null}

          {isCardHidden ? (
            <PhvbMagSaveBookmarkButton document={document} showBookmark />
          ) : null}

          <TooltipHost content="Sao chép liên kết">
            <button
              type="button"
              className={styles.previewIconButton}
              onClick={onCopyLink}
              aria-label="Sao chép liên kết"
            >
              <CopyLinkIcon className={styles.iconSizeSm} />
            </button>
          </TooltipHost>

          <TooltipHost content="Mở trong SharePoint">
            <PhvbMagExternalLink
              href={document.fileUrl}
              className={styles.previewIconButton}
              aria-label="Mở trong SharePoint"
            >
              <OpenExternalIcon className={styles.iconSizeSm} />
            </PhvbMagExternalLink>
          </TooltipHost>

          <TooltipHost content={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}>
            <button
              type="button"
              className={styles.previewIconButton}
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            >
              {isFullscreen ? (
                <PreviewExitFullscreenIcon className={styles.iconSizeSm} />
              ) : (
                <PreviewFullscreenIcon className={styles.iconSizeSm} />
              )}
            </button>
          </TooltipHost>

          <TooltipHost content="Đóng">
            <button
              type="button"
              className={styles.previewIconButton}
              onClick={onClose}
              aria-label="Đóng xem trước"
            >
              <CloseIcon className={styles.iconSizeSm} />
            </button>
          </TooltipHost>
        </div>
      </header>

      {!isFullscreen ? (
        <div className={styles.previewMeta}>
          <span className={styles.previewMetaItem}>
            <strong>Hiệu lực:</strong> {effectiveFrom} → {effectiveTo}
          </span>
          <span className={styles.previewMetaItem}>
            <strong>Đầu mối liên hệ:</strong> {contactPerson}
          </span>
          {variant === 'overlay' && folderBreadcrumb ? (
            <span className={styles.previewMetaItem}>
              <strong>Vị trí:</strong> {folderBreadcrumb}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={styles.previewBody}>
        {isLoading ? (
          <div className={styles.previewLoading}>
            <PhvbMagSkeleton variant="card" count={1} />
          </div>
        ) : null}

        {hasLoadFailed ? (
          <div className={styles.previewFallback}>
            <PhvbMagEmptyState
              message={canPreviewFileType
                ? 'Không hiển thị được bản xem trước của tài liệu này.'
                : `Không hỗ trợ xem trước định dạng ${fileType.extension || 'này'}.`}
            />
            <div className={styles.previewFallbackActions}>
              <PhvbMagExternalLink href={document.fileUrl} className={styles.btnSecondary}>
                Mở trong SharePoint
              </PhvbMagExternalLink>
              {document.canDownload && document.downloadUrl ? (
                <PhvbMagExternalLink href={document.downloadUrl} className={styles.btnSecondary}>
                  Tải xuống
                </PhvbMagExternalLink>
              ) : null}
            </div>
          </div>
        ) : null}

        {previewUrl && !hasLoadFailed ? (
          <iframe
            key={previewUrl}
            className={styles.previewFrame}
            src={previewUrl}
            title={`Xem trước ${document.name}`}
            onLoad={handleFrameLoad}
          />
        ) : null}
      </div>
    </section>
  );
}
