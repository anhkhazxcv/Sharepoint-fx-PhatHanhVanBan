import { useCallback, useEffect, useRef, useState } from 'react';
import { hasSharePointSiteContext, type HomeCategoryGroupKey } from '../config/PhvbMag.configuration';
import type { IHomeCategoryItem, IPhvbSiteContext } from '../models/PhvbMag.models';
import { SITE_CONTEXT_ERROR_MESSAGE } from '../services/PhvbMag.error';
import { phvbHomeCategoriesService } from '../services/PhvbMagHomeCategories.service';

interface IUsePhvbHomeCategoriesOptions {
  siteContext: IPhvbSiteContext;
  group: HomeCategoryGroupKey;
  enabled?: boolean;
}

interface IUsePhvbHomeCategoriesResult {
  categories: IHomeCategoryItem[];
  isLoading: boolean;
  errorMessage?: string;
  loadCategories: () => Promise<void>;
}

export function usePhvbHomeCategories(
  options: IUsePhvbHomeCategoriesOptions
): IUsePhvbHomeCategoriesResult {
  const { siteContext, group, enabled = true } = options;
  const [categories, setCategories] = useState<IHomeCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadCategories = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    if (!hasSharePointSiteContext(siteContext)) {
      setCategories([]);
      setErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const items = await phvbHomeCategoriesService.loadHomeCategories(siteContext, group);

      if (!mountedRef.current) {
        return;
      }

      setCategories(items);
      setErrorMessage(undefined);
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setCategories([]);
      setErrorMessage(phvbHomeCategoriesService.getRuntimeErrorMessage(error));
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, siteContext, group]);

  return {
    categories,
    isLoading,
    errorMessage,
    loadCategories
  };
}
