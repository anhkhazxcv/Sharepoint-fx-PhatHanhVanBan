import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RECENT_PUBLISHED_HOME_FOLDER_LIMIT,
  TAB_LABELS
} from '../config/PhvbMag.configuration';
import { usePhvbSavedDocuments } from '../context/PhvbMagSavedDocuments.context';
import { usePhvbRecentViews } from '../context/PhvbMagRecentViews.context';
import { usePhvbHomeCategories } from '../hooks/usePhvbHomeCategories';
import { usePhvbHomeData } from '../hooks/usePhvbHomeData';
import type { IPhvbDocumentContext, IPhvbSiteContext, IHomeCategoryItem } from '../models/PhvbMag.models';
import { formatBanHanhDate } from '../utils/PhvbMagBanHanh.tree';
import {
  buildHomeCategoryAriaLabel,
  buildHomeCategoryNavigatePath
} from '../utils/PhvbMagHomeCategories.utils';
import { buildLibrarySearchPath } from '../utils/PhvbMagLibrary.utils';
import { formatRecentPublishDate } from '../utils/PhvbMagRecentPublished.utils';
import {
  CloseIcon,
  FolderAccentIcon,
  SearchIcon,
  SidebarHelpIcon,
  SidebarNewReleaseIcon,
  SidebarRecentViewsIcon,
  SidebarSavedIcon
} from './PhvbMagIcons';
import { PhvbMagHomeLibraryPreviewColumn } from './PhvbMagHomeLibraryPreviewColumn';
import { PhvbMagLibraryDocumentCard } from './PhvbMagLibraryDocumentCard';
import { PhvbMagLoadingOverlay } from './PhvbMagLoadingOverlay';
import styles from './PhvbMag.module.scss';

const HOME_GUIDE_DISMISS_KEY = 'phvb-home-guide-dismissed';

interface IPhvbMagHomeViewProps {
  siteContext: IPhvbSiteContext;
  documentContext: IPhvbDocumentContext;
}

interface IHomeCategoryTileProps {
  category: IHomeCategoryItem;
  onNavigate: (path: string) => void;
}

function HomeCategoryTile(props: IHomeCategoryTileProps): React.ReactElement {
  const { category, onNavigate } = props;

  return (
    <button
      type="button"
      className={styles.homeCategoryTile}
      aria-label={buildHomeCategoryAriaLabel(category)}
      onClick={() => onNavigate(buildHomeCategoryNavigatePath(category))}
    >
      <span className={styles.homeCategoryIcon} aria-hidden="true">{category.icon}</span>
      <span className={styles.homeCategoryName}>{category.title}</span>
      {category.subtitle ? (
        <span className={styles.homeCategorySubtitle}>{category.subtitle}</span>
      ) : null}
    </button>
  );
}

function HomeCategorySkeleton(): React.ReactElement {
  return (
    <div className={styles.homeCategorySkeletonGrid} aria-hidden="true">
      {[0, 1, 2, 3].map(index => (
        <div key={index} className={styles.homeCategorySkeletonTile} />
      ))}
    </div>
  );
}

export function PhvbMagHomeView(props: IPhvbMagHomeViewProps): React.ReactElement {
  const { siteContext } = props;
  const navigate = useNavigate();
  const [searchDraft, setSearchDraft] = useState<string>('');
  const [isGuideDismissed, setIsGuideDismissed] = useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem(HOME_GUIDE_DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  const homeData = usePhvbHomeData({
    siteContext,
    includeMostViewed: true,
    maxFolders: RECENT_PUBLISHED_HOME_FOLDER_LIMIT
  });

  const homeCategories = usePhvbHomeCategories({ siteContext });

  const showCategoriesSection = homeCategories.isLoading || homeCategories.categories.length > 0;

  const {
    loadSavedPreview,
    savedPreviewItems,
    isLoadingSavedPreview
  } = usePhvbSavedDocuments();

  const {
    loadRecentPreview,
    recentPreviewItems,
    isLoadingRecentPreview
  } = usePhvbRecentViews();

  useEffect(() => {
    Promise.all([
      loadSavedPreview(),
      loadRecentPreview()
    ]).catch(() => undefined);
  }, [loadSavedPreview, loadRecentPreview]);

  const isLoadingLibraryPreview = isLoadingSavedPreview || isLoadingRecentPreview;

  const savedHomePreviewItems = useMemo(() => (
    savedPreviewItems.map(item => ({
      key: item.bookmark.id,
      title: item.bookmark.title,
      dateLabel: `Đã lưu: ${formatBanHanhDate(item.bookmark.created) || 'Chưa xác định'}`,
      document: item.document,
      isAccessible: item.isAccessible
    }))
  ), [savedPreviewItems]);

  const recentHomePreviewItems = useMemo(() => (
    recentPreviewItems.map(item => ({
      key: item.recentView.id,
      title: item.recentView.title,
      dateLabel: `Đã xem: ${formatBanHanhDate(item.recentView.modified) || 'Chưa xác định'}`,
      document: item.document,
      isAccessible: item.isAccessible
    }))
  ), [recentPreviewItems]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const query = searchDraft.trim();

    if (!query) {
      navigate('/tab/ThuVienTaiLieu/all');
      return;
    }

    navigate(buildLibrarySearchPath(query, 1));
  };

  const handleDismissGuide = (): void => {
    setIsGuideDismissed(true);

    try {
      window.sessionStorage.setItem(HOME_GUIDE_DISMISS_KEY, '1');
    } catch {
      // Ignore storage errors in restricted environments.
    }
  };

  return (
    <div className={styles.homeView}>
      <div className={styles.homeScroll}>
        <section className={styles.homeHero}>
          <div className={styles.homeHeroLeft}>
            <div className={styles.homeHeroBadge}>Masterise Group · Intranet</div>
            <h1 className={styles.homeHeroTitle}>Hệ thống văn bản nội bộ</h1>
            <p className={styles.homeHeroSub}>
              Tra cứu, đọc và lưu toàn bộ văn bản quy định, tiêu chuẩn và hướng dẫn nội bộ của Tập đoàn.
            </p>
            <form className={styles.homeHeroSearch} onSubmit={handleSearchSubmit}>
              <SearchIcon className={styles.homeHeroSearchIcon} />
              <input
                type="search"
                className={styles.homeHeroSearchInput}
                placeholder="Tìm tên văn bản, mã hiệu, từ khóa..."
                value={searchDraft}
                onChange={event => setSearchDraft(event.target.value)}
              />
            </form>
          </div>
          <div className={styles.homeHeroStats}>
            <div className={styles.homeHeroStat}>
              <div className={styles.homeHeroStatValue}>{homeData.folderCount}</div>
              <div className={styles.homeHeroStatLabel}>Mới ban hành ({homeData.windowDays} ngày)</div>
            </div>
          </div>
        </section>

        {!isGuideDismissed ? (
          <section className={styles.homeGuideBanner}>
            <SidebarHelpIcon className={styles.homeGuideIcon} />
            <div className={styles.homeGuideContent}>
              <div className={styles.homeGuideTitle}>Bạn mới dùng hệ thống? Xem hướng dẫn &amp; biểu mẫu</div>
              <div className={styles.homeGuideSub}>Hiểu rõ quy trình · Chọn đúng loại văn bản · Dùng đúng cách</div>
            </div>
            <button
              type="button"
              className={styles.homeGuideAction}
              onClick={() => navigate('/tab/HuongDan')}
            >
              Hướng dẫn
            </button>
            <button
              type="button"
              className={styles.homeGuideDismiss}
              onClick={handleDismissGuide}
              aria-label="Ẩn banner hướng dẫn"
            >
              <CloseIcon />
            </button>
          </section>
        ) : null}

        {showCategoriesSection ? (
          <section className={styles.homeSection}>
            <header className={styles.homeSectionHeader}>
              <div className={styles.homeSectionTitleWrap}>
                <span className={styles.homeSectionEmoji} aria-hidden="true">📂</span>
                <h2 className={styles.homeSectionTitle}>Danh mục</h2>
              </div>
              <button
                type="button"
                className={styles.homeSectionMore}
                onClick={() => navigate('/tab/ThuVienTaiLieu/all')}
              >
                Xem tất cả →
              </button>
            </header>

            {homeCategories.isLoading ? <HomeCategorySkeleton /> : null}

            {!homeCategories.isLoading && homeCategories.categories.length > 0 ? (
              <div className={styles.homeCategoryGrid}>
                {homeCategories.categories.map(category => (
                  <HomeCategoryTile
                    key={category.id}
                    category={category}
                    onNavigate={path => navigate(path)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className={styles.homeSection}>
          <div className={styles.homeLibraryPreviewGrid}>
            <PhvbMagHomeLibraryPreviewColumn
              icon={<SidebarSavedIcon className={styles.homeSectionIcon} />}
              title={TAB_LABELS.DaLuu}
              viewAllPath="/tab/DaLuu"
              emptyMessage="Chưa có văn bản nào được lưu."
              isLoading={isLoadingLibraryPreview}
              items={savedHomePreviewItems}
              onNavigate={path => navigate(path)}
            />

            <PhvbMagHomeLibraryPreviewColumn
              icon={<SidebarRecentViewsIcon className={styles.homeSectionIcon} />}
              title={TAB_LABELS.XemGanDay}
              viewAllPath="/tab/XemGanDay"
              emptyMessage="Chưa có văn bản nào được xem gần đây."
              isLoading={isLoadingLibraryPreview}
              items={recentHomePreviewItems}
              onNavigate={path => navigate(path)}
            />
          </div>

          <PhvbMagLoadingOverlay
            isOpen={isLoadingLibraryPreview}
            message="Đang tải văn bản đã lưu và xem gần đây..."
          />
        </section>

        <section className={styles.homeSection}>
          <header className={styles.homeSectionHeader}>
            <div className={styles.homeSectionTitleWrap}>
              <SidebarNewReleaseIcon className={styles.homeSectionIcon} />
              <h2 className={styles.homeSectionTitle}>Mới ban hành ({homeData.windowDays} ngày)</h2>
              {homeData.folderCount > 0 ? (
                <span className={styles.homeSectionCount}>{homeData.folderCount}</span>
              ) : null}
            </div>
            <button
              type="button"
              className={styles.homeSectionMore}
              onClick={() => navigate('/tab/MoiBanHanh')}
            >
              Xem tất cả →
            </button>
          </header>

          <PhvbMagLoadingOverlay isOpen={homeData.isLoadingRecent} message="Đang tải văn bản mới ban hành..." />

          {!homeData.isLoadingRecent && homeData.errorMessage ? (
            <div className={styles.homeEmptyState} role="alert">
              <p>{homeData.errorMessage}</p>
            </div>
          ) : null}

          {!homeData.isLoadingRecent && !homeData.errorMessage && homeData.sections.length === 0 ? (
            <div className={styles.homeEmptyState}>
              <p>Không có văn bản mới trong {homeData.windowDays} ngày qua.</p>
            </div>
          ) : null}

          {!homeData.isLoadingRecent && !homeData.errorMessage && homeData.sections.length > 0 ? (
            <div className={styles.homeRecentFolderList}>
              {homeData.sections.map(section => {
                const publishDate = formatRecentPublishDate(section.folderNgayPhatHanh)
                  || formatRecentPublishDate(section.documents[0]?.ngayPhatHanh)
                  || 'Chưa xác định';
                const fileCount = section.documents.length + section.formDocuments.length;

                return (
                  <button
                    key={section.documentFolderKey}
                    type="button"
                    className={styles.homeRecentFolderRow}
                    onClick={() => navigate('/tab/MoiBanHanh')}
                  >
                    <FolderAccentIcon className={styles.homeRecentFolderIcon} />
                    <span className={styles.homeRecentFolderBody}>
                      <span className={styles.homeRecentFolderName} title={section.displayPathFull || section.displayPath}>
                        {section.displayPath}
                      </span>
                      <span className={styles.homeRecentFolderMeta}>
                        Ban hành {publishDate} · {fileCount} tài liệu
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className={styles.homeSection}>
          <header className={styles.homeSectionHeader}>
            <div className={styles.homeSectionTitleWrap}>
              <span className={styles.homeSectionEmoji} aria-hidden="true">🔥</span>
              <h2 className={styles.homeSectionTitle}>Đọc nhiều nhất</h2>
            </div>
            <button
              type="button"
              className={styles.homeSectionMore}
              onClick={() => navigate('/tab/ThuVienTaiLieu/all')}
            >
              Xem tất cả →
            </button>
          </header>

          <PhvbMagLoadingOverlay isOpen={homeData.isLoadingMostViewed} message="Đang tải văn bản đọc nhiều..." />

          {!homeData.isLoadingMostViewed && homeData.mostViewedErrorMessage ? (
            <div className={styles.homeEmptyState} role="alert">
              <p>{homeData.mostViewedErrorMessage}</p>
            </div>
          ) : null}

          {!homeData.isLoadingMostViewed && !homeData.mostViewedErrorMessage && homeData.mostViewed.length === 0 ? (
            <div className={styles.homeEmptyState}>
              <p>Chưa có dữ liệu lượt xem.</p>
            </div>
          ) : null}

          {!homeData.isLoadingMostViewed && !homeData.mostViewedErrorMessage && homeData.mostViewed.length > 0 ? (
            <div className={styles.homePopularList}>
              {homeData.mostViewed.map(document => (
                <PhvbMagLibraryDocumentCard
                  key={document.id}
                  document={document}
                  showDownload
                  metaContent={null}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
