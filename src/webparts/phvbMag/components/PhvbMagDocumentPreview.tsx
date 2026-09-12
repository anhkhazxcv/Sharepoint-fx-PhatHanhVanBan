import * as React from 'react';
import { TooltipHost } from '@fluentui/react';
import type { IBanHanhLibraryItem } from '../models/PhvbMag.models';
import {
  isExcelFile,
  isPreviewableFile,
  resolveOfficeEmbedUrlFromItem,
  resolvePreviewUrlFromItem
} from '../infrastructure/SharePointFile.utils';
import { usePhvbSavedDocumentsOptional } from '../context/PhvbMagSavedDocuments.context';
import { usePhvbIsMobile } from '../hooks/usePhvbViewport';
import { formatBanHanhDate, getStoragePathAfterLibrary } from '../utils/PhvbMagBanHanh.tree';
import {
  resolveLibraryContactPerson,
  resolveLibraryDocumentEffectiveStatus,
  resolveLibraryFileTypeVisual
} from '../utils/PhvbMagLibrary.utils';
import { PhvbMagExternalLink } from './PhvbMagExternalLink';
import { PhvbMagPreviewFrame } from './PhvbMagPreviewFrame';
import { PhvbMagSaveBookmarkButton } from './PhvbMagSaveBookmarkButton';
import { PhvbMagMobileSheet } from './mobile/PhvbMagMobileSheet';
import {
  BookmarkFilledIcon,
  BookmarkOutlineIcon,
  CloseIcon,
  CopyLinkIcon,
  DownloadIcon,
  LibraryFileTypeIcon,
  MobileMoreIcon,
  OpenExternalIcon,
  PaginationNextIcon,
  PaginationPreviousIcon,
  PreviewExitFullscreenIcon,
  PreviewFullscreenIcon
} from './PhvbMagIcons';
import styles from './PhvbMag.module.scss';

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

/**
 * Icon loại file đã biểu thị đuôi rồi — bỏ đuôi để nhường chỗ cho tên trên
 * app bar mobile. `lastDot > 0` để tên kiểu `.gitignore` không bị xoá sạch.
 */
function stripFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
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

  const [isActionSheetOpen, setIsActionSheetOpen] = React.useState<boolean>(false);
  const isMobile = usePhvbIsMobile();
  const savedDocuments = usePhvbSavedDocumentsOptional();

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
  // Excel: embed.aspx không render workbook, nên Doc.aspx?action=embedview đi
  // TRƯỚC và embed.aspx lùi xuống làm lần thử thứ hai. Các loại khác giữ thứ tự
  // cũ — docx/pdf đang chạy tốt trên embed.aspx, đổi là tự chuốc hồi quy.
  const prefersOfficeEmbed = isExcelFile(document.name, document.fileRef) && Boolean(officeEmbedUrl);
  const attemptUrl = prefersOfficeEmbed ? officeEmbedUrl : primaryPreviewUrl;
  const fallbackUrl = prefersOfficeEmbed ? primaryPreviewUrl : officeEmbedUrl;

  // Khung xem trước (skeleton / chuỗi thử URL / panel lỗi) dùng chung với màn
  // Hướng dẫn — dựng một lần rồi đặt vào cả nhánh mobile lẫn desktop.
  const previewFrame = (
    <PhvbMagPreviewFrame
      attemptUrl={attemptUrl}
      fallbackUrl={fallbackUrl}
      title={`Xem trước ${document.name}`}
      errorMessage={canPreviewFileType
        ? 'Không hiển thị được bản xem trước của tài liệu này.'
        : `Không hỗ trợ xem trước định dạng ${fileType.extension || 'này'}.`}
      errorActions={(
        <>
          <PhvbMagExternalLink href={document.fileUrl} className={styles.btnSecondary}>
            Mở trong SharePoint
          </PhvbMagExternalLink>
          {document.canDownload && document.downloadUrl ? (
            <PhvbMagExternalLink href={document.downloadUrl} className={styles.btnSecondary}>
              Tải xuống
            </PhvbMagExternalLink>
          ) : null}
        </>
      )}
    />
  );

  // Tooltip là affordance của chuột. Trên cảm ứng TooltipHost treo cứng (một
  // cú chạm bắn enter+focus mà không bao giờ có leave), và cái div wrapper
  // display:inline nó chèn vào DOM phá luôn chuỗi flex vì không có min-width:0
  // — chính nó mới là flex item, không phải phần tử bên trong. Nên mobile bỏ
  // hẳn TooltipHost: nút icon đã có aria-label, tiêu đề dùng title= như các
  // card trong repo vẫn làm.
  const withTooltip = (content: string, node: React.ReactElement): React.ReactElement =>
    isMobile ? node : <TooltipHost content={content}>{node}</TooltipHost>;

  const navIconClassName = isMobile ? styles.iconSizeMd : styles.iconSizeSm;

  const navButtons = (
    <div className={styles.previewNav}>
      {withTooltip(
        'Tài liệu trước',
        <button
          type="button"
          className={styles.previewIconButton}
          onClick={onPrevious}
          disabled={!hasPrevious}
          aria-label="Tài liệu trước"
        >
          <PaginationPreviousIcon className={navIconClassName} />
        </button>
      )}
      {withTooltip(
        'Tài liệu sau',
        <button
          type="button"
          className={styles.previewIconButton}
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Tài liệu sau"
        >
          <PaginationNextIcon className={navIconClassName} />
        </button>
      )}
    </div>
  );

  const closeButton = withTooltip(
    'Đóng',
    <button
      type="button"
      className={styles.previewIconButton}
      onClick={onClose}
      aria-label="Đóng xem trước"
    >
      <CloseIcon className={navIconClassName} />
    </button>
  );

  // Mobile: h3 nằm thẳng trong .previewHeader nên NÓ là flex item co giãn.
  const titleNode = isMobile ? (
    <h3 className={styles.previewTitle} title={document.name}>
      {stripFileExtension(document.name)}
    </h3>
  ) : (
    <TooltipHost content={variant === 'overlay' ? summaryText : document.name}>
      <h3 className={styles.previewTitle}>{document.name}</h3>
    </TooltipHost>
  );

  // Mobile: app bar gọn — đóng bên trái, tên file, điều hướng, rồi dồn phần
  // còn lại vào sheet overflow. Đảo bằng thứ tự RENDER chứ không bằng CSS
  // order, để thứ tự focus luôn khớp thứ tự nhìn thấy.
  if (isMobile) {
    return (
      <section
        className={[styles.previewPane, styles.previewPaneOverlay].join(' ')}
        aria-label="Xem trước tài liệu"
      >
        <header className={styles.previewHeader}>
          {closeButton}
          {titleNode}
          {navButtons}
          <button
            type="button"
            className={styles.previewIconButton}
            onClick={() => setIsActionSheetOpen(true)}
            aria-label="Thao tác khác"
            aria-haspopup="dialog"
          >
            <MobileMoreIcon className={styles.iconSizeMd} />
          </button>
        </header>

        {previewFrame}

        <PhvbMagMobileSheet
          isOpen={isActionSheetOpen}
          title="Thao tác"
          onDismiss={() => setIsActionSheetOpen(false)}
        >
          <div className={styles.previewActionSheet}>
            {canShowDownload ? (
              <PhvbMagExternalLink
                href={document.downloadUrl}
                className={styles.previewActionSheetItem}
                onOpen={() => setIsActionSheetOpen(false)}
              >
                <DownloadIcon className={styles.iconSizeSm} />
                Tải xuống
              </PhvbMagExternalLink>
            ) : null}

            {/* Không tái dùng PhvbMagSaveBookmarkButton ở đây: nó chỉ render
                nút icon trần, mà mỗi hàng trong sheet cần vùng bấm 44px có
                nhãn. Dùng thẳng context để dựng hàng đúng kiểu. */}
            {savedDocuments && document.fsObjType === 0 ? (
              <button
                type="button"
                className={styles.previewActionSheetItem}
                disabled={savedDocuments.isPending(document.id)}
                onClick={() => {
                  savedDocuments.toggleSave(document).catch(() => undefined);
                  setIsActionSheetOpen(false);
                }}
              >
                {savedDocuments.isSaved(document.id) ? (
                  <>
                    <BookmarkFilledIcon className={styles.iconSizeSm} />
                    Bỏ lưu
                  </>
                ) : (
                  <>
                    <BookmarkOutlineIcon className={styles.iconSizeSm} />
                    Lưu văn bản
                  </>
                )}
              </button>
            ) : null}

            <button
              type="button"
              className={styles.previewActionSheetItem}
              onClick={() => {
                onCopyLink();
                setIsActionSheetOpen(false);
              }}
            >
              <CopyLinkIcon className={styles.iconSizeSm} />
              Sao chép liên kết
            </button>

            <PhvbMagExternalLink
              href={document.fileUrl}
              className={styles.previewActionSheetItem}
              onOpen={() => setIsActionSheetOpen(false)}
            >
              <OpenExternalIcon className={styles.iconSizeSm} />
              Mở trong SharePoint
            </PhvbMagExternalLink>
          </div>
        </PhvbMagMobileSheet>
      </section>
    );
  }

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

          {titleNode}

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
          {navButtons}

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

          {closeButton}
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

      {previewFrame}
    </section>
  );
}
