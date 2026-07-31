import { useEffect, useMemo, useState } from 'react';
import { hasSharePointSiteContext } from '../config/PhvbMag.configuration';
import type { ILabelCustomSnapshot, IPhvbSiteContext, IWorkflowFilterOptions } from '../models/PhvbMag.models';
import { phvbBanHanhConfigService } from '../services/PhvbMagBanHanhConfig.service';
import { createEmptyLabelCustomSnapshot } from '../utils/PhvbMagBanHanhNotify.utils';

const EMPTY_WORKFLOW_FILTERS: IWorkflowFilterOptions = {
  status: [],
  loaiVB: [],
  phongBan: [],
  namTaoYeuCau: []
};

interface IUsePhvbLabelCustomConfigOptions {
  siteContext: IPhvbSiteContext;
  enabled?: boolean;
}

interface IUsePhvbLabelCustomConfigResult {
  snapshot: ILabelCustomSnapshot;
  workflowFilters: IWorkflowFilterOptions;
  recentPublishedWindowDays: number;
  isLoading: boolean;
}

export function usePhvbLabelCustomConfig(
  options: IUsePhvbLabelCustomConfigOptions
): IUsePhvbLabelCustomConfigResult {
  const { siteContext, enabled = true } = options;
  const [snapshot, setSnapshot] = useState<ILabelCustomSnapshot>(() => createEmptyLabelCustomSnapshot());
  const [isLoading, setIsLoading] = useState<boolean>(enabled);

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    if (!hasSharePointSiteContext(siteContext)) {
      setSnapshot(createEmptyLabelCustomSnapshot());
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadSnapshot = async (): Promise<void> => {
      setIsLoading(true);

      try {
        const nextSnapshot = await phvbBanHanhConfigService.getLabelCustomSnapshot(siteContext);

        if (!isMounted) {
          return;
        }

        setSnapshot(nextSnapshot);
      } catch {
        if (!isMounted) {
          return;
        }

        setSnapshot(createEmptyLabelCustomSnapshot());
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSnapshot().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [enabled, siteContext]);

  const workflowFilters = useMemo(
    () => snapshot.workflowFilters,
    [snapshot]
  );

  return {
    snapshot,
    workflowFilters: workflowFilters || EMPTY_WORKFLOW_FILTERS,
    recentPublishedWindowDays: snapshot.recentPublishedWindowDays,
    isLoading
  };
}
