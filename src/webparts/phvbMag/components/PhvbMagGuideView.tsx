import * as React from 'react';
import { GUIDE_VIEW_SUBTITLE } from '../config/PhvbMag.configuration';
import type { IPhvbSiteContext } from '../models/PhvbMag.models';
import { usePhvbGuide } from '../hooks/usePhvbGuide';
import { CreateActionIcon, DownloadIcon } from './PhvbMagIcons';
import { PhvbMagEmptyState } from './PhvbMagEmptyState';
import { PhvbMagExternalLink } from './PhvbMagExternalLink';
import { PhvbMagLoadingOverlay } from './PhvbMagLoadingOverlay';
import { PhvbMagPageHeader } from './PhvbMagPageHeader';
import { PhvbMagPreviewFrame } from './PhvbMagPreviewFrame';
import styles from './PhvbMag.module.scss';

interface IPhvbMagGuideViewProps {
  siteContext: IPhvbSiteContext;
  canCreate: boolean;
  onOpenTemplate: () => void;
  onOpenCreate: () => void;
}

export function PhvbMagGuideView(props: IPhvbMagGuideViewProps): React.ReactElement {
  const { siteContext, canCreate, onOpenTemplate, onOpenCreate } = props;
  const guide = usePhvbGuide(siteContext);

  return (
    <div className={styles.recentView}>
      <PhvbMagPageHeader
        eyebrow="Thư viện"
        title="Hướng dẫn"
        subtitle={GUIDE_VIEW_SUBTITLE}
        className={styles.contentHeader}
        headerActions={(
          <div className={styles.headerActions}>
            <button type="button" className={styles.btnTemplate} onClick={onOpenTemplate}>
              <DownloadIcon className={styles.iconSizeSm} />
              <span>Template</span>
            </button>
            <button type="button" className={styles.btnCreate} onClick={onOpenCreate} disabled={!canCreate}>
              <span className={styles.btnCreateContent}>
                <CreateActionIcon />
                Tạo văn bản
              </span>
            </button>
          </div>
        )}
      />

      <div className={[styles.recentBody, styles.guidePdfBody].join(' ')}>
        <PhvbMagLoadingOverlay isOpen={guide.isLoading} message="Đang tải sổ tay hướng dẫn..." />

        {!guide.isLoading && guide.errorMessage ? (
          <PhvbMagEmptyState message={guide.errorMessage} role="alert" />
        ) : null}

        {/* Cùng khung xem trước với thư viện: skeleton khi tải, panel lỗi kèm
            lối thoát khi nhúng chết. Sổ tay chỉ có một URL nên không có
            fallbackUrl để thử lần hai. */}
        {!guide.isLoading && !guide.errorMessage && guide.pdfUrl ? (
          <PhvbMagPreviewFrame
            attemptUrl={guide.pdfUrl}
            title="Xem trước sổ tay hướng dẫn"
            errorMessage="Không hiển thị được sổ tay hướng dẫn."
            errorActions={(
              <PhvbMagExternalLink href={guide.pdfUrl} className={styles.btnSecondary}>
                Mở trong tab mới
              </PhvbMagExternalLink>
            )}
          />
        ) : null}
      </div>
    </div>
  );
}
