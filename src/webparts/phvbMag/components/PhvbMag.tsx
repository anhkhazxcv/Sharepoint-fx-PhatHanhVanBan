import * as React from 'react';
import { useMemo, useState } from 'react';
import styles from './PhvbMag.module.scss';
import type { IPhvbMagProps } from './IPhvbMagProps';
import { usePhvbDocuments } from './PhvbMag.hooks';
import { PhvbMagCreateModal } from './PhvbMagCreateModal';
import { PhvbMagDrawer } from './PhvbMagDrawer';
import { PhvbMagSidebar } from './PhvbMagSidebar';
import { PhvbMagTable } from './PhvbMagTable';
import { PhvbMagToolbar } from './PhvbMagToolbar';
import type { ICreateRequestInput, IVanBanItem, TabType } from './PhvbMag.types';
import { getUniqueValues } from './PhvbMag.types';

export default function PhvbMag(props: IPhvbMagProps): React.ReactElement {
  const { userDisplayName, userEmail, spHttpClient, currentWebUrl, siteCollectionUrl, sourceSiteUrl, listTitle } = props;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterDept, setFilterDept] = useState<string>('All');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<IVanBanItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const { activeTab, counts, items, isLoading, isSaving, errorMessage, setActiveTab, createRequest } = usePhvbDocuments({
    userDisplayName,
    userEmail,
    spHttpClient,
    currentWebUrl,
    siteCollectionUrl,
    sourceSiteUrl,
    listTitle
  });

  const processedItems = useMemo(() => {
    let result = items.slice();

    if (filterType !== 'All') {
      result = result.filter(item => item.LoaiYeuCau === filterType);
    }

    if (filterDept !== 'All') {
      result = result.filter(item => item.KhoaPhongNguoiTao === filterDept);
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        return (
          (item.Tenvanban || '').toLowerCase().indexOf(query) > -1 ||
          (item.SoVanBan || '').toLowerCase().indexOf(query) > -1 ||
          (item.TomTatNoiDung || '').toLowerCase().indexOf(query) > -1 ||
          (item.KhoaPhongNguoiTao || '').toLowerCase().indexOf(query) > -1 ||
          (item.NguoiTao || '').toLowerCase().indexOf(query) > -1
        );
      });
    }

    return result;
  }, [items, searchQuery, filterType, filterDept]);

  const uniqueTypes = useMemo(() => getUniqueValues(items, 'LoaiYeuCau'), [items]);
  const uniqueDepts = useMemo(() => getUniqueValues(items, 'KhoaPhongNguoiTao'), [items]);

  const handleSelectTab = (tab: TabType): void => {
    setActiveTab(tab);
    setSelectedItem(null);
  };

  const handleCreateRequest = async (input: ICreateRequestInput): Promise<boolean> => {
    const isSuccess = await createRequest(input);
    if (isSuccess) {
      setIsCreateModalOpen(false);
    }

    return isSuccess;
  };

  return (
    <div className={styles.phvbContainer}>
      <PhvbMagSidebar
        activeTab={activeTab}
        counts={counts}
        isCollapsed={isSidebarCollapsed}
        onSelectTab={handleSelectTab}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        userDisplayName={userDisplayName}
      />

      <main className={styles.contentPane}>
        {errorMessage && (
          <div className={styles.connectionBanner}>
            <strong>Kết nối dữ liệu:</strong>
            <span>{errorMessage}</span>
          </div>
        )}

        <PhvbMagToolbar
          activeTab={activeTab}
          totalResults={processedItems.length}
          searchQuery={searchQuery}
          filterType={filterType}
          filterDept={filterDept}
          uniqueTypes={uniqueTypes}
          uniqueDepts={uniqueDepts}
          canCreate={Boolean(currentWebUrl || siteCollectionUrl || sourceSiteUrl)}
          onSearchChange={setSearchQuery}
          onFilterTypeChange={setFilterType}
          onFilterDeptChange={setFilterDept}
          onOpenCreate={() => setIsCreateModalOpen(true)}
        />

        <PhvbMagTable items={processedItems} isLoading={isLoading} onSelectItem={setSelectedItem} />
      </main>

      <PhvbMagDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />
      <PhvbMagCreateModal isOpen={isCreateModalOpen} isSaving={isSaving} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateRequest} />
    </div>
  );
}