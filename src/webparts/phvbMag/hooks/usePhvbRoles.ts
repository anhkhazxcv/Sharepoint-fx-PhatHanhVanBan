import { useCallback, useEffect, useState } from 'react';
import { phvbRoleService } from '../services/PhvbMagRole.service';
import { userHasRole } from '../utils/PhvbMagRole.utils';
import type { IPhvbRoleEntry, IPhvbSiteContext } from '../models/PhvbMag.models';

interface IUsePhvbRolesOptions {
  siteContext: IPhvbSiteContext;
  userEmail?: string;
}

interface IUsePhvbRolesResult {
  roles: IPhvbRoleEntry[];
  isLoading: boolean;
  errorMessage?: string;
  hasRole: (role: string) => boolean;
}

export function usePhvbRoles(options: IUsePhvbRolesOptions): IUsePhvbRolesResult {
  const { siteContext, userEmail } = options;
  const [roles, setRoles] = useState<IPhvbRoleEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const loadRoles = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const nextRoles = await phvbRoleService.loadRoles(siteContext);

        if (isMounted) {
          setRoles(nextRoles);
        }
      } catch (error) {
        if (isMounted) {
          setRoles([]);
          setErrorMessage(phvbRoleService.getRuntimeErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRoles().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [siteContext]);

  const hasRole = useCallback((role: string): boolean => {
    return userHasRole(roles, userEmail, role);
  }, [roles, userEmail]);

  return {
    roles,
    isLoading,
    errorMessage,
    hasRole
  };
}
