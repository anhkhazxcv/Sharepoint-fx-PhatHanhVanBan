import * as React from 'react';
import { GUIDE_VIEW_SUBTITLE } from '../config/PhvbMag.configuration';
import type { IPhvbSiteContext } from '../models/PhvbMag.models';
import { usePhvbGuide } from '../hooks/usePhvbGuide';
import { DownloadIcon } from './PhvbMagIcons';
import { PhvbMagExternalLink } from './PhvbMagExternalLink';
import { PhvbMagLoadingOverlay } from './PhvbMagLoadingOverlay';
import styles from './PhvbMag.module.scss';

interface IPhvbMagGuideViewProps {
  siteContext: IPhvbSiteContext;
}

export function PhvbMagGuideView(props: IPhvbMagGuideViewProps): React.ReactElement {
  const { siteContext } = props;
  const guide = usePhvbGuide(siteContext);
  const iframeTitle = 'Hướng dẫn';

  return (
    <div className={styles.recentView}>
      <header className={styles.recentHeader}>
        <div className={styles.pageHeading}>
          <span className={styles.pageEyebrow}>Thư viện</span>
          <h2>Hướng dẫn</h2>
          <p className={styles.recentSubtitle}>{GUIDE_VIEW_SUBTITLE}</p>
        </div>

        {guide.pdfUrl ? (
          <div className={styles.recentHeaderActions}>
            <PhvbMagExternalLink
              href={guide.pdfUrl}
              className={styles.recentHeaderActionBtn}
            >
              Mở tab mới
            </PhvbMagExternalLink>
            <PhvbMagExternalLink
              href={guide.pdfUrl}
              mode="download"
              downloadFileName="SoTayHuongDan.pdf"
              className={styles.recentHeaderActionBtn}
              aria-label="Tải xuống sổ tay hướng dẫn"
            >
              <DownloadIcon style={{ width: 14, height: 14 }} />
              <span>Tải xuống</span>
            </PhvbMagExternalLink>
          </div>
        ) : null}
      </header>

      <div className={[styles.recentBody, styles.guidePdfBody].join(' ')}>
        <PhvbMagLoadingOverlay isOpen={guide.isLoading} message="Đang tải sổ tay hướng dẫn..." />

        {!guide.isLoading && guide.errorMessage ? (
          <div className={styles.recentEmptyState} role="alert">
            <p>{guide.errorMessage}</p>
          </div>
        ) : null}

        {!guide.isLoading && !guide.errorMessage && guide.pdfUrl ? (
          <iframe
            className={styles.guidePdfFrame}
            src={guide.pdfUrl}
            title={iframeTitle}
          />
        ) : null}
      </div>
    </div>
  );
}
