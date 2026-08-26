import { useEffect, useState } from 'react';
import type { MSGraphClientFactory } from '@microsoft/sp-http';
import { phvbMagGraphService } from '../services/PhvbMagGraph.service';

interface IUsePhvbUserPhotoOptions {
  msGraphClientFactory: MSGraphClientFactory;
}

interface IUsePhvbUserPhotoResult {
  photoUrl?: string;
  isLoading: boolean;
}

export function usePhvbUserPhoto(options: IUsePhvbUserPhotoOptions): IUsePhvbUserPhotoResult {
  const { msGraphClientFactory } = options;
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const loadPhoto = async (): Promise<void> => {
      setIsLoading(true);

      try {
        const result = await phvbMagGraphService.loadCurrentUserPhoto(msGraphClientFactory);

        if (isMounted) {
          setPhotoUrl(result);
        }
      } catch {
        if (isMounted) {
          setPhotoUrl(undefined);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPhoto().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [msGraphClientFactory]);

  return {
    photoUrl,
    isLoading
  };
}
