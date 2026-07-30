import { useEffect, useState } from 'react';
import { hasSharePointSiteContext } from '../config/PhvbMag.configuration';
import type { IHomeCategoryItem, IPhvbSiteContext } from '../models/PhvbMag.models';
import { SITE_CONTEXT_ERROR_MESSAGE } from '../services/PhvbMag.error';
import { phvbHomeCategoriesService } from '../services/PhvbMagHomeCategories.service';

interface IUsePhvbHomeCategoriesOptions {
  siteContext: IPhvbSiteContext;
  enabled?: boolean;
}

interface IUsePhvbHomeCategoriesResult {
  categories: IHomeCategoryItem[];
  isLoading: boolean;
  errorMessage?: string;
}

export function usePhvbHomeCategories(
  options: IUsePhvbHomeCategoriesOptions
): IUsePhvbHomeCategoriesResult {
  const { siteContext, enabled = true } = options;
  const [categories, setCategories] = useState<IHomeCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    if (!hasSharePointSiteContext(siteContext)) {
      setCategories([]);
      setErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadCategories = async (): Promise<void> => {
      setIsLoading(true);

      try {
        const items = await phvbHomeCategoriesService.loadHomeCategories(siteContext);

        if (!isMounted) {
          return;
        }

        setCategories(items);
        setErrorMessage(undefined);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setCategories([]);
        setErrorMessage(phvbHomeCategoriesService.getRuntimeErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCategories().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [enabled, siteContext]);

  return {
    categories,
    isLoading,
    errorMessage
  };
}
