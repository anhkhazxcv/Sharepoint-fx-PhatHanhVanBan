import * as React from 'react';
import { useState } from 'react';
import type { IRequestDetailData, TabType } from '../models/PhvbMag.models';
import styles from './PhvbMag.module.scss';
import { PhvbMagDetailActivityFeed } from './PhvbMagDetailActivityFeed';
import { PhvbMagDetailDocumentsTab } from './PhvbMagDetailDocumentsTab';
import { PhvbMagDetailHeader } from './PhvbMagDetailHeader';
import { PhvbMagDetailHistoryTab } from './PhvbMagDetailHistoryTab';
import { PhvbMagDetailInfoTab } from './PhvbMagDetailInfoTab';
import { PhvbMagDetailStepper } from './PhvbMagDetailStepper';
import { PhvbMagDetailWorkflowSidebar } from './PhvbMagDetailWorkflowSidebar';

type DetailTabKey = 'info' | 'documents' | 'history';

interface IPhvbMagDetailProps {
  tabName: TabType;
  data: IRequestDetailData;
}

const DETAIL_TABS: ReadonlyArray<{ key: DetailTabKey; label: string }> = [
  { key: 'info', label: 'Thông tin' },
  { key: 'documents', label: 'Tài liệu' },
  { key: 'history', label: 'Lịch sử' }
];

export function PhvbMagDetail(props: IPhvbMagDetailProps): React.ReactElement {
  const { tabName, data } = props;
  const [activeTab, setActiveTab] = useState<DetailTabKey>('info');
  const [isWorkflowExpanded, setIsWorkflowExpanded] = useState(false);
  const [isActivityExpanded, setIsActivityExpanded] = useState(false);
  const title = data.release.Tenvanban || data.release.IdYeuCau || 'Chi tiết văn bản';

  const renderTabContent = (): React.ReactElement => {
    switch (activeTab) {
      case 'documents':
        return <PhvbMagDetailDocumentsTab attachments={data.attachments} />;
      case 'history':
        return <PhvbMagDetailHistoryTab history={data.history} />;
      default:
        return <PhvbMagDetailInfoTab release={data.release} />;
    }
  };

  return (
    <div className={styles.detailPage}>
      <PhvbMagDetailHeader
        className={styles.detailHeaderArea}
        tabName={tabName}
        title={title}
      />

      <div className={styles.detailBodySplit}>
        <div className={styles.detailLeftColumn}>
          <div className={styles.detailStepperArea}>
            <PhvbMagDetailStepper statusApproved={data.release.StatusApproved} />
          </div>

          <div className={styles.detailMain}>
            <div className={styles.detailTabs} role="tablist" aria-label="Chi tiết yêu cầu">
              {DETAIL_TABS.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={[
                    styles.detailTab,
                    activeTab === tab.key ? styles.detailTabActive : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className={styles.detailTabPanel} role="tabpanel">
              {renderTabContent()}
            </div>
          </div>
        </div>

        <div className={styles.detailRightColumn}>
          <div className={styles.detailWorkflowSlot}>
            <PhvbMagDetailWorkflowSidebar
              release={data.release}
              workflowParticipants={data.workflowParticipants}
              isExpanded={isWorkflowExpanded}
              onExpandedChange={setIsWorkflowExpanded}
            />
          </div>
          <div className={styles.detailActivitySlot}>
            <PhvbMagDetailActivityFeed
              comments={data.comments}
              isExpanded={isActivityExpanded}
              onExpandedChange={setIsActivityExpanded}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
