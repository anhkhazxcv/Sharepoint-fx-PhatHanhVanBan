import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ALL_FILTER_VALUE, cloneDefaultRequestForm, DEPARTMENT_OPTIONS, DOCUMENT_TYPE_OPTIONS } from '../config/PhvbMag.configuration';
import { usePhvbDocuments } from '../hooks/usePhvbDocuments';
import type { ICreateRequestInput, IPhvbDirectoryUser, IVanBanItem, SaveRequestMode, TabType } from '../models/PhvbMag.models';
import { selectFilteredItems } from '../utils/PhvbMag.selectors';
import { ToastService } from '../utils/ToastService';
import { phvbMagGraphService } from '../services/PhvbMagGraph.service';
import styles from './PhvbMag.module.scss';
import type { IPhvbMagProps } from './IPhvbMagProps';
import { PhvbMagCreateModal } from './PhvbMagCreateModal';
import { PhvbMagDrawer } from './PhvbMagDrawer';
import { PhvbMagSidebar } from './PhvbMagSidebar';
import { PhvbMagTable } from './PhvbMagTable';
import { PhvbMagToolbar } from './PhvbMagToolbar';

function PhvbMagInner(props: IPhvbMagProps): React.ReactElement {
  const { userDisplayName, userEmail, msGraphClientFactory, spHttpClient, currentWebUrl, siteCollectionUrl, sourceSiteUrl, listTitle } = props;
  
  const { tabName, itemId } = useParams<{ tabName: string; itemId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isCreateRoute = /\/create$/.test(location.pathname);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<IVanBanItem | undefined>(undefined);
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

  const siteContext = useMemo(() => ({
    spHttpClient,
    currentWebUrl,
    siteCollectionUrl,
    sourceSiteUrl,
    listTitle
  }), [spHttpClient, currentWebUrl, siteCollectionUrl, sourceSiteUrl, listTitle]);

  const departmentOptions = useMemo(() => {
    const nextDepartments = DEPARTMENT_OPTIONS.slice();

    if (userDepartment && nextDepartments.indexOf(userDepartment) === -1) {
      nextDepartments.unshift(userDepartment);
    }

    return nextDepartments;
  }, [userDepartment]);

  const { activeTab, counts, items, isLoading, isSaving, errorMessage, setActiveTab, saveRequest } = usePhvbDocuments({
    userDisplayName,
    userEmail,
    spHttpClient,
    currentWebUrl,
    siteCollectionUrl,
    sourceSiteUrl,
    listTitle
  });

  // Sync activeTab with tabName from URL
  useEffect(() => {
    if (tabName && tabName !== activeTab) {
      setActiveTab(tabName as TabType);
    }
  }, [tabName, activeTab, setActiveTab]);

  // Sync selectedItem with itemId from URL
  useEffect(() => {
    if (itemId && items.length > 0) {
      let foundItem: IVanBanItem | undefined;
      for (let i = 0; i < items.length; i++) {
        if (items[i].Id.toString() === itemId) {
          foundItem = items[i];
          break;
        }
      }
      setSelectedItem(foundItem);
    } else {
      setSelectedItem(undefined);
    }
  }, [itemId, items]);

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
    navigate(`/tab/${tab}`);
  };

  const handleCreateRequest = async (input: ICreateRequestInput, mode: SaveRequestMode): Promise<boolean> => {
    const result = await saveRequest(input, mode);

    if (!result) {
      return false;
    }

    const successMessage = mode === 'draft'
      ? `Lưu nháp thành công. ID yêu cầu: ${result.requestReferenceId}`
      : `Gửi yêu cầu thành công. ID yêu cầu: ${result.requestReferenceId}`;

    ToastService.success(successMessage);

    const targetTab = mode === 'draft' ? 'BanNhap' : activeTab;
    navigate(`/tab/${targetTab}`);

    return true;
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
          canCreate={Boolean(currentWebUrl || siteCollectionUrl || sourceSiteUrl)}
          onOpenCreate={() => navigate(`/tab/${activeTab}/create`)}
        />

        <PhvbMagTable
          activeTab={activeTab}
          items={processedItems}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectItem={(item) => navigate(`/tab/${activeTab}/item/${item.Id}`)}
        />
      </main>

      <PhvbMagDrawer item={selectedItem} onClose={() => navigate(`/tab/${activeTab}`)} />
      <PhvbMagCreateModal
        isOpen={isCreateRoute}
        isSaving={isSaving}
        isLoadingApprovers={isLoadingApprovers}
        defaultValues={defaultRequestForm}
        documentTypes={DOCUMENT_TYPE_OPTIONS}
        departments={departmentOptions}
        siteContext={siteContext}
        approvers={approverUsers}
        onClose={() => navigate(`/tab/${activeTab}`)}
        onSubmit={handleCreateRequest}
      />
    </div>
  );
}

export default function PhvbMag(props: IPhvbMagProps): React.ReactElement {
  return (
    <HashRouter>
      <Routes>
        <Route path="/tab/:tabName" element={<PhvbMagInner {...props} />} />
        <Route path="/tab/:tabName/item/:itemId" element={<PhvbMagInner {...props} />} />
        <Route path="/tab/:tabName/create" element={<PhvbMagInner {...props} />} />
        <Route path="*" element={<Navigate to="/tab/ViecCanLam" replace />} />
      </Routes>
      <ToastContainer />
    </HashRouter>
  );
}