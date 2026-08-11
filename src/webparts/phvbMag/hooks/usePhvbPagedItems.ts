import * as React from 'react';

export const PAGE_SIZE_OPTIONS: ReadonlyArray<number> = [10, 20, 50];

export interface IPhvbPagedItemsResult<T> {
  pageSize: number;
  setPageSize: (size: number) => void;
  pagedItems: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  rangeStart: number;
  rangeEnd: number;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
}

export function usePhvbPagedItems<T>(
  items: T[],
  resetDeps: React.DependencyList
): IPhvbPagedItemsResult<T> {
  const [pageSize, setPageSizeState] = React.useState<number>(20);
  const [page, setPage] = React.useState<number>(1);

  React.useEffect(() => {
    setPage(1);
  }, resetDeps);

  const setPageSize = (size: number): void => {
    setPageSizeState(size);
    setPage(1);
  };

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = page > totalPages ? totalPages : page;
  const pagedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = totalItems === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  return {
    pageSize,
    setPageSize,
    pagedItems,
    totalItems,
    totalPages,
    currentPage,
    rangeStart,
    rangeEnd,
    goToPreviousPage: () => setPage(currentPage - 1),
    goToNextPage: () => setPage(currentPage + 1)
  };
}
