import * as React from 'react';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
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
  const title = TAB_LABELS.HuongDan;

  return (
    <div className={styles.guideView}>
      <header className={styles.guideHeader}>
        <div className={styles.pageHeading}>
          <span className={styles.pageEyebrow}>Trợ giúp</span>
          <h2>{title}</h2>
        </div>

        {guide.pdfUrl ? (
          <div className={styles.guideHeaderActions}>
            <PhvbMagExternalLink href={guide.pdfUrl} className={styles.btnSecondary}>
              Mở tab mới
            </PhvbMagExternalLink>
            <PhvbMagExternalLink
              href={guide.pdfUrl}
              mode="download"
              downloadFileName="SoTayHuongDan.pdf"
              className={styles.guideDownloadBtn}
              aria-label="Tải xuống sổ tay hướng dẫn"
            >
              <DownloadIcon style={{ width: 14, height: 14 }} />
              <span>Tải xuống</span>
            </PhvbMagExternalLink>
          </div>
        ) : null}
      </header>

      <div className={styles.guideBody}>
        <PhvbMagLoadingOverlay isOpen={guide.isLoading} message="Đang tải sổ tay hướng dẫn..." />

        {!guide.isLoading && guide.errorMessage ? (
          <div className={styles.guideEmptyState} role="alert">
            <p>{guide.errorMessage}</p>
          </div>
        ) : null}

        {!guide.isLoading && !guide.errorMessage && guide.pdfUrl ? (
          <iframe
            className={styles.guidePdfFrame}
            src={guide.pdfUrl}
            title={title}
          />
        ) : null}
      </div>
    </div>
  );
}
