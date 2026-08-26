import { TRANG_THAI_THUC_HIEN_VALUES } from '../config/PhvbMag.configuration';

export interface IHistoryChoiceMismatch {
  missingInList: string[];
  extraInList: string[];
}

export function findHistoryChoiceMismatches(actualChoices: ReadonlyArray<string>): IHistoryChoiceMismatch {
  const expected = TRANG_THAI_THUC_HIEN_VALUES.slice();
  const actual = actualChoices.map(value => (value || '').trim()).filter(Boolean);
  const expectedSet = new Set<string>(expected);
  const actualSet = new Set(actual);

  return {
    missingInList: expected.filter(value => !actualSet.has(value)),
    extraInList: actual.filter(value => !expectedSet.has(value))
  };
}

export function assertHistoryChoicesMatch(actualChoices: ReadonlyArray<string>): void {
  const mismatch = findHistoryChoiceMismatches(actualChoices);

  if (mismatch.missingInList.length === 0 && mismatch.extraInList.length === 0) {
    return;
  }

  throw new Error(
    `TrangThai_ThucHien Choice lệch từ điển: thiếu [${mismatch.missingInList.join(', ')}]; thừa [${mismatch.extraInList.join(', ')}].`
  );
}
