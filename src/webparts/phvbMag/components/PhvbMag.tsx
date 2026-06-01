import * as React from 'react';
import { useMemo, useState } from 'react';
import { ALL_FILTER_VALUE, cloneDefaultRequestForm, DEPARTMENT_OPTIONS, DOCUMENT_TYPE_OPTIONS, FOLDER_OPTIONS } from '../config/PhvbMag.configuration';
import { usePhvbDocuments } from '../hooks/usePhvbDocuments';
import type { ICreateRequestInput, IVanBanItem, TabType } from '../models/PhvbMag.models';
import { getUniqueFieldValues, selectFilteredItems } from '../utils/PhvbMag.selectors';
import styles from './PhvbMag.module.scss';
import type { IPhvbMagProps } from './IPhvbMagProps';
import { PhvbMagCreateModal } from './PhvbMagCreateModal';
import { PhvbMagDrawer } from './PhvbMagDrawer';
import { PhvbMagSidebar } from './PhvbMagSidebar';
import { PhvbMagTable } from './PhvbMagTable';
import { PhvbMagToolbar } from './PhvbMagToolbar';

export default function PhvbMag(props: IPhvbMagProps): React.ReactElement {
  const { userDisplayName, userEmail, spHttpClient, currentWebUrl, siteCollectionUrl, sourceSiteUrl, listTitle } = props;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>(ALL_FILTER_VALUE);
  const [filterDept, setFilterDept] = useState<string>(ALL_FILTER_VALUE);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<IVanBanItem | undefined>(undefined);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const defaultRequestForm = useMemo(() => cloneDefaultRequestForm(), []);

  const { activeTab, counts, items, isLoading, isSaving, errorMessage, setActiveTab, createRequest } = usePhvbDocuments({
    userDisplayName,
    userEmail,
    spHttpClient,
    currentWebUrl,
    siteCollectionUrl,
    sourceSiteUrl,
    listTitle
  });

  const processedItems = useMemo(() => selectFilteredItems(items, { searchQuery, filterType, filterDept }), [items, searchQuery, filterType, filterDept]);

  const uniqueTypes = useMemo(() => getUniqueFieldValues(items, 'LoaiYeuCau'), [items]);
  const uniqueDepts = useMemo(() => getUniqueFieldValues(items, 'KhoaPhongNguoiTao'), [items]);

  const handleSelectTab = (tab: TabType): void => {
    setActiveTab(tab);
    setSelectedItem(undefined);
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

      <PhvbMagDrawer item={selectedItem} onClose={() => setSelectedItem(undefined)} />
      <PhvbMagCreateModal
        isOpen={isCreateModalOpen}
        isSaving={isSaving}
        defaultValues={defaultRequestForm}
        documentTypes={DOCUMENT_TYPE_OPTIONS}
        departments={DEPARTMENT_OPTIONS}
        folders={FOLDER_OPTIONS}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateRequest}
      />
    </div>
  );
}