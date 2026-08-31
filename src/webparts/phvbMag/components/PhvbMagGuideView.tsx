import * as React from 'react';
import { GUIDE_VIEW_SUBTITLE } from '../config/PhvbMag.configuration';
import type { IPhvbSiteContext } from '../models/PhvbMag.models';
import { usePhvbGuide } from '../hooks/usePhvbGuide';
import { CreateActionIcon, DownloadIcon } from './PhvbMagIcons';
import { PhvbMagEmptyState } from './PhvbMagEmptyState';
import { PhvbMagLoadingOverlay } from './PhvbMagLoadingOverlay';
import { PhvbMagPageHeader } from './PhvbMagPageHeader';
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
  const iframeTitle = 'Hướng dẫn';

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
