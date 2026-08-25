import type { ISendMailRequest } from '../models/PhvbMag.models';
import { replaceAllTokens } from './PhvbMagBanHanhNotify.utils';

const MAIL_TOKEN_FIELDS: ReadonlyArray<keyof ISendMailRequest> = [
  'TenVanBan',
  'TomTatNoiDung',
  'IDYeuCau',
  'NguoiThucHien',
  'ApprovalStatus',
  'SoVanBan',
  'NguoiTao',
  'LinkYeuCau'
];

export function resolveMailContent(
  template: { subject: string; body: string },
  payload: ISendMailRequest
): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  MAIL_TOKEN_FIELDS.forEach(field => {
    const token = `{{${field}}}`;
    const value = (payload[field] as string) || '';
    subject = replaceAllTokens(subject, token, value);
    body = replaceAllTokens(body, token, value);
  });

  return { subject, body };
}
