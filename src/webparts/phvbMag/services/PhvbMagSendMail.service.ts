import { HttpClient } from '@microsoft/sp-http';
import { SEND_MAIL_TYPE } from '../config/PhvbMag.configuration';
import type { IPhvbLogContext, IPhvbSiteContext, ISendMailPayload } from '../models/PhvbMag.models';
import { buildApiLogParams, phvbLogService, serializeLogPayload } from './PhvbMagLog.service';

const LOG_PREFIX = '[PhvbSendMail]';

function resolveEndpoint(context: IPhvbSiteContext): string {
  return (context.endPointSendMail || '').trim();
}

function requiresSoVanBan(typeSendMail: string): boolean {
  return (
    typeSendMail === SEND_MAIL_TYPE.XAC_NHAN_CAP_SO ||
    typeSendMail === SEND_MAIL_TYPE.YEU_CAU_BAN_HANH
  );
}

function getMissingPayloadFields(payload: ISendMailPayload): string[] {
  const missing: string[] = [];

  if (!(payload.NguoiThucHien || '').trim()) {
    missing.push('NguoiThucHien');
  }

  if (!(payload.TypeSendMail || '').trim()) {
    missing.push('TypeSendMail');
  }

  if (!(payload.EmailTo || '').trim()) {
    missing.push('EmailTo');
  }

  if (!(payload.IDYeuCau || '').trim()) {
    missing.push('IDYeuCau');
  }

  if (!(payload.TenVanBan || '').trim()) {
    missing.push('TenVanBan');
  }

  if (!(payload.TomTatNoiDung || '').trim()) {
    missing.push('TomTatNoiDung');
  }

  return missing;
}

export class PhvbSendMailService {
  public async sendMail(
    context: IPhvbSiteContext,
    payload: ISendMailPayload,
    logContext?: IPhvbLogContext
  ): Promise<void> {
    console.log(`${LOG_PREFIX} sendMail called`, {
      TypeSendMail: payload.TypeSendMail,
      EmailTo: payload.EmailTo,
      IDYeuCau: payload.IDYeuCau,
      hasEndpoint: Boolean((context.endPointSendMail || '').trim())
    });

    const endpoint = resolveEndpoint(context);

    if (!endpoint) {
      console.warn(`${LOG_PREFIX} skip: empty_endpoint`, {
        endPointSendMail: context.endPointSendMail
      });
      return;
    }

    const missingFields = getMissingPayloadFields(payload);

    if (missingFields.length > 0) {
      console.warn(`${LOG_PREFIX} skip: invalid_payload`, {
        missingFields,
        payload
      });
      return;
    }

    if (requiresSoVanBan(payload.TypeSendMail) && !(payload.SoVanBan || '').trim()) {
      console.warn(`${LOG_PREFIX} skip: missing_so_van_ban`, {
        TypeSendMail: payload.TypeSendMail,
        SoVanBan: payload.SoVanBan
      });
      return;
    }

    console.log(`${LOG_PREFIX} posting`, {
      endpoint,
      TypeSendMail: payload.TypeSendMail,
      EmailTo: payload.EmailTo,
      IDYeuCau: payload.IDYeuCau
    });

    try {
      const response = await context.httpClient.post(endpoint, HttpClient.configurations.v1, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload, (_key, value) => (value === undefined ? null : value))
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Send mail failed with status ${response.status}: ${details}`);
      }

      console.log(`${LOG_PREFIX} success`, {
        TypeSendMail: payload.TypeSendMail,
        status: response.status
      });
    } catch (error) {
      console.error(`${LOG_PREFIX} failed`, {
        TypeSendMail: payload.TypeSendMail,
        endpoint,
        error
      });

      phvbLogService.logApiError(
        buildApiLogParams(context, logContext, {
          httpMethod: 'POST',
          requestUrl: endpoint,
          requestPayload: serializeLogPayload(payload)
        }),
        error
      );

      throw error instanceof Error ? error : new Error('Gửi mail thất bại.');
    }
  }
}

export const phvbSendMailService = new PhvbSendMailService();
