import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ALL_FILTER_VALUE, cloneDefaultRequestForm, DEPARTMENT_OPTIONS, DOCUMENT_TYPE_OPTIONS, FOLDER_OPTIONS } from '../config/PhvbMag.configuration';
import { usePhvbDocuments } from '../hooks/usePhvbDocuments';
import type { ICreateRequestInput, IPhvbDirectoryUser, IVanBanItem, TabType } from '../models/PhvbMag.models';
import { selectFilteredItems } from '../utils/PhvbMag.selectors';
import { phvbMagGraphService } from '../services/PhvbMagGraph.service';
import styles from './PhvbMag.module.scss';
import type { IPhvbMagProps } from './IPhvbMagProps';
import { PhvbMagCreateModal } from './PhvbMagCreateModal';
import { PhvbMagDrawer } from './PhvbMagDrawer';
import { PhvbMagSidebar } from './PhvbMagSidebar';
import { PhvbMagTable } from './PhvbMagTable';
import { PhvbMagToolbar } from './PhvbMagToolbar';

export default function PhvbMag(props: IPhvbMagProps): React.ReactElement {
  const { userDisplayName, userEmail, msGraphClientFactory, spHttpClient, currentWebUrl, siteCollectionUrl, sourceSiteUrl, listTitle } = props;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<IVanBanItem | undefined>(undefined);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [userDepartment, setUserDepartment] = useState<string>('');
  const [approverUsers, setApproverUsers] = useState<IPhvbDirectoryUser[]>([]);
  const [isLoadingApprovers, setIsLoadingApprovers] = useState<boolean>(true);
  const [graphErrorMessage, setGraphErrorMessage] = useState<string | undefined>(undefined);
  const defaultRequestForm = useMemo(() => {
    const form = cloneDefaultRequestForm();

    if (userDepartment) {
      form.department = userDepartment;
    }

    return form;
  }, [userDepartment]);
  const departmentOptions = useMemo(() => {
    const nextDepartments = DEPARTMENT_OPTIONS.slice();

    if (userDepartment && nextDepartments.indexOf(userDepartment) === -1) {
      nextDepartments.unshift(userDepartment);
    }

    return nextDepartments;
  }, [userDepartment]);

  const { activeTab, counts, items, isLoading, isSaving, errorMessage, setActiveTab, createRequest } = usePhvbDocuments({
    userDisplayName,
    userEmail,
    spHttpClient,
    currentWebUrl,
    siteCollectionUrl,
    sourceSiteUrl,
    listTitle
  });

  const processedItems = useMemo(() => selectFilteredItems(items, {
    searchQuery,
    filterType: ALL_FILTER_VALUE,
    filterDept: ALL_FILTER_VALUE
  }), [items, searchQuery]);

  useEffect(() => {
    let isMounted = true;

    const loadGraphDirectory = async (): Promise<void> => {
      setIsLoadingApprovers(true);

      try {
        const [currentUserProfile, directoryUsers] = await Promise.all([
          phvbMagGraphService.loadCurrentUserProfile(msGraphClientFactory),
          phvbMagGraphService.loadAllUsers(msGraphClientFactory)
        ]);

        if (!isMounted) {
          return;
        }

        setUserDepartment(currentUserProfile.department || '');
        setApproverUsers(directoryUsers);
        setGraphErrorMessage(undefined);
      } catch {
        if (!isMounted) {
          return;
        }

        setApproverUsers([]);
        setGraphErrorMessage('Không tải được Microsoft Graph. Hãy kiểm tra quyền User.Read và User.Read.All của ứng dụng.');
      } finally {
        if (isMounted) {
          setIsLoadingApprovers(false);
        }
      }
    };

    loadGraphDirectory().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [msGraphClientFactory]);

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
        userDepartment={userDepartment}
      />

      <main className={styles.contentPane}>
        {errorMessage && (
          <div className={styles.connectionBanner}>
            <strong>Kết nối dữ liệu:</strong>
            <span>{errorMessage}</span>
          </div>
        )}

        {graphErrorMessage && (
          <div className={styles.connectionBanner}>
            <strong>Microsoft Graph:</strong>
            <span>{graphErrorMessage}</span>
          </div>
        )}

        <PhvbMagToolbar
          activeTab={activeTab}
          searchQuery={searchQuery}
          canCreate={Boolean(currentWebUrl || siteCollectionUrl || sourceSiteUrl)}
          onSearchChange={setSearchQuery}
          onOpenCreate={() => setIsCreateModalOpen(true)}
        />

        <PhvbMagTable
          activeTab={activeTab}
          items={processedItems}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenCreate={() => setIsCreateModalOpen(true)}
          onSelectItem={setSelectedItem}
        />
      </main>

      <PhvbMagDrawer item={selectedItem} onClose={() => setSelectedItem(undefined)} />
      <PhvbMagCreateModal
        isOpen={isCreateModalOpen}
        isSaving={isSaving}
        isLoadingApprovers={isLoadingApprovers}
        defaultValues={defaultRequestForm}
        documentTypes={DOCUMENT_TYPE_OPTIONS}
        departments={departmentOptions}
        folders={FOLDER_OPTIONS}
        approvers={approverUsers}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateRequest}
      />
    </div>
  );
}