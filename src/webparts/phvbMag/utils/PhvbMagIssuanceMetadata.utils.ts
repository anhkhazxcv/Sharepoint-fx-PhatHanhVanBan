import type { IVanBanItem } from '../models/PhvbMag.models';
import { toSharePointDateOnlyFieldValue } from './PhvbMagDateTime.utils';

export interface IListFormValue {
  FieldName: string;
  FieldValue: string;
}

function resolveIssuanceContact(release: IVanBanItem): string {
  return (release.LienHe || release.NguoiTao || release.EmailNguoiTao || '').trim();
}

export function buildIssuanceMetadataValues(release: IVanBanItem): IListFormValue[] {
  const publishDate = toSharePointDateOnlyFieldValue(new Date());
  const hieuLucTu = toSharePointDateOnlyFieldValue(release.HieuLucTu) || publishDate;
  const hieuLucDen = toSharePointDateOnlyFieldValue(release.HieuLucDen);
  const values: IListFormValue[] = [
    { FieldName: 'TomTatVanban', FieldValue: (release.TomTatNoiDung || '').trim() },
    { FieldName: 'NgayPhatHanh', FieldValue: publishDate },
    { FieldName: 'HieuLucTu', FieldValue: hieuLucTu },
    { FieldName: 'LienHe', FieldValue: resolveIssuanceContact(release) }
  ];

  if (hieuLucDen) {
    values.splice(3, 0, { FieldName: 'HieuLucDen', FieldValue: hieuLucDen });
  }

  return values;
}

export function buildMetadataAuditFields(metadataValues: IListFormValue[]): Record<string, string> {
  const fields: Record<string, string> = {};

  metadataValues.forEach(entry => {
    fields[entry.FieldName] = entry.FieldValue;
  });

  return fields;
}
