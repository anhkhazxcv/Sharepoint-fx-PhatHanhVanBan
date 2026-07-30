import type { IBanHanhLibraryItem } from '../models/PhvbMag.models';

export function joinHydratedLibraryDocuments<TItem, TDisplay>(
  items: TItem[],
  documents: IBanHanhLibraryItem[],
  getLibraryItemId: (item: TItem) => number,
  buildDisplayItem: (item: TItem, document?: IBanHanhLibraryItem) => TDisplay
): TDisplay[] {
  const documentById: Record<number, IBanHanhLibraryItem> = {};
  documents.forEach((document: IBanHanhLibraryItem) => {
    documentById[document.id] = document;
  });

  return items.map((item: TItem) => {
    const document = documentById[getLibraryItemId(item)];
    return buildDisplayItem(item, document);
  });
}
