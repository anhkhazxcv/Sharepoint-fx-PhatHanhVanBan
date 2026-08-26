import { TRANG_THAI_THUC_HIEN_VALUES } from '../config/PhvbMag.configuration';
import {
  assertHistoryChoicesMatch,
  findHistoryChoiceMismatches
} from './PhvbMagHistoryChoices.utils';

describe('PhvbMagHistoryChoices', () => {
  it('passes when SharePoint choices match the TypeScript dictionary', () => {
    expect(() => assertHistoryChoicesMatch(TRANG_THAI_THUC_HIEN_VALUES)).not.toThrow();
  });

  it('reports missing and extra choices', () => {
    const actualChoices: string[] = TRANG_THAI_THUC_HIEN_VALUES
      .filter(value => value !== 'Ban hành văn bản');
    actualChoices.push('Ban hành');
    const mismatch = findHistoryChoiceMismatches(actualChoices);

    expect(mismatch.missingInList).toEqual(['Ban hành văn bản']);
    expect(mismatch.extraInList).toEqual(['Ban hành']);
    expect(() => assertHistoryChoicesMatch(actualChoices)).toThrow('TrangThai_ThucHien Choice lệch từ điển');
  });
});
