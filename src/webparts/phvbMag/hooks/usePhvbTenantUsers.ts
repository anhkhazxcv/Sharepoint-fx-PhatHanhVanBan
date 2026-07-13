import { useEffect, useState } from 'react';
import type { MSGraphClientFactory } from '@microsoft/sp-http';
import type { IPhvbDirectoryUser } from '../models/PhvbMag.models';
import { phvbMagGraphService } from '../services/PhvbMagGraph.service';

interface IUsePhvbTenantUsersOptions {
  msGraphClientFactory: MSGraphClientFactory;
}

interface IUsePhvbTenantUsersResult {
  tenantUsers: IPhvbDirectoryUser[];
  isLoading: boolean;
  errorMessage?: string;
  currentUserDepartment?: string;
}

export function usePhvbTenantUsers(options: IUsePhvbTenantUsersOptions): IUsePhvbTenantUsersResult {
  const { msGraphClientFactory } = options;
  const [tenantUsers, setTenantUsers] = useState<IPhvbDirectoryUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [currentUserDepartment, setCurrentUserDepartment] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const loadTenantUsers = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const [currentUserProfile, directoryUsers] = await Promise.all([
          phvbMagGraphService.loadCurrentUserProfile(msGraphClientFactory),
          phvbMagGraphService.loadInternalTenantUsers(msGraphClientFactory)
        ]);

        if (!isMounted) {
          return;
        }

        setCurrentUserDepartment(currentUserProfile.department || '');
        setTenantUsers(directoryUsers);
      } catch {
        if (!isMounted) {
          return;
        }

        setTenantUsers([]);
        setCurrentUserDepartment(undefined);
        setErrorMessage('Không tải được Microsoft Graph. Hãy kiểm tra quyền User.Read và User.Read.All của ứng dụng.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTenantUsers().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [msGraphClientFactory]);

  return {
    tenantUsers,
    isLoading,
    errorMessage,
    currentUserDepartment
  };
}
