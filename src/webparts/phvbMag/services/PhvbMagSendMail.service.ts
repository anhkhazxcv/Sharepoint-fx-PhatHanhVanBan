import { HttpClient } from '@microsoft/sp-http';
import { SEND_MAIL_TYPE } from '../config/PhvbMag.configuration';
import type { IPhvbLogContext, IPhvbSiteContext, ISendMailPayload, ISendMailRequest } from '../models/PhvbMag.models';
import { isXacNhanBanHanhType } from '../utils/PhvbMagSendMail.utils';
import { resolveMailContent } from '../utils/PhvbMagMailContent.utils';
import { buildApiLogParams, phvbLogService, serializeLogPayload } from './PhvbMagLog.service';
import { phvbMailContentConfigService } from './PhvbMagMailContentConfig.service';

const LOG_PREFIX = '[PhvbSendMail]';

function resolveEndpoint(context: IPhvbSiteContext): string {
  return (context.endPointSendMail || '').trim();
}

function requiresSoVanBan(typeSendMail: string): boolean {
  return (
    typeSendMail === SEND_MAIL_TYPE.XAC_NHAN_CAP_SO ||
    typeSendMail === SEND_MAIL_TYPE.YEU_CAU_BAN_HANH ||
    isXacNhanBanHanhType(typeSendMail) ||
    typeSendMail === SEND_MAIL_TYPE.TRA_LAI_ADMIN_BAN_HANH
  );
}

function requiresBanHanhEmailContent(typeSendMail: string): boolean {
  return isXacNhanBanHanhType(typeSendMail);
}

function getMissingPayloadFields(request: ISendMailRequest): string[] {
  const missing: string[] = [];

  if (!(request.NguoiThucHien || '').trim()) {
    missing.push('NguoiThucHien');
  }

  if (!(request.TypeSendMail || '').trim()) {
    missing.push('TypeSendMail');
  }

  if (!(request.EmailTo || '').trim()) {
    missing.push('EmailTo');
  }

  if (!(request.IDYeuCau || '').trim()) {
    missing.push('IDYeuCau');
  }

  if (!(request.TenVanBan || '').trim()) {
    missing.push('TenVanBan');
  }

  if (!(request.TomTatNoiDung || '').trim()) {
    missing.push('TomTatNoiDung');
  }

  return missing;
}

export class PhvbSendMailService {
  public async sendMail(
    context: IPhvbSiteContext,
    request: ISendMailRequest,
    logContext?: IPhvbLogContext
  ): Promise<void> {
    console.log(`${LOG_PREFIX} sendMail called`, {
      TypeSendMail: request.TypeSendMail,
      EmailTo: request.EmailTo,
      IDYeuCau: request.IDYeuCau,
      hasEndpoint: Boolean((context.endPointSendMail || '').trim())
    });

    const endpoint = resolveEndpoint(context);

    if (!endpoint) {
      console.warn(`${LOG_PREFIX} skip: empty_endpoint`, {
        endPointSendMail: context.endPointSendMail
      });
      return;
    }

    const missingFields = getMissingPayloadFields(request);

    if (missingFields.length > 0) {
      console.warn(`${LOG_PREFIX} skip: invalid_payload`, {
        missingFields,
        request
      });
      return;
    }

    if (requiresSoVanBan(request.TypeSendMail) && !(request.SoVanBan || '').trim()) {
      console.warn(`${LOG_PREFIX} skip: missing_so_van_ban`, {
        TypeSendMail: request.TypeSendMail,
        SoVanBan: request.SoVanBan
      });
      return;
    }

    if (!(request.Subject || '').trim() || !(request.Body || '').trim()) {
      const contentConfig = await phvbMailContentConfigService.getMailContentByType(context, request.TypeSendMail);

      if (contentConfig) {
        const resolved = resolveMailContent(
          { subject: contentConfig.subject, body: contentConfig.body },
          request
        );
        request = { ...request, Subject: resolved.subject, Body: resolved.body };
      } else {
        console.warn(`${LOG_PREFIX} no_mail_content_config_found`, { TypeSendMail: request.TypeSendMail });
      }
    }

    if (
      requiresBanHanhEmailContent(request.TypeSendMail) &&
      (!(request.Subject || '').trim() || !(request.Body || '').trim())
    ) {
      console.warn(`${LOG_PREFIX} skip: missing_ban_hanh_email_content`, {
        TypeSendMail: request.TypeSendMail,
        Subject: request.Subject,
        hasBody: Boolean((request.Body || '').trim())
      });
      return;
    }

    const wirePayload: ISendMailPayload = {
      EmailTo: request.EmailTo,
      Subject: request.Subject || '',
      Body: request.Body || ''
    };

    console.log(`${LOG_PREFIX} posting`, {
      endpoint,
      TypeSendMail: request.TypeSendMail,
      EmailTo: request.EmailTo,
      IDYeuCau: request.IDYeuCau
    });

    try {
      const response = await context.httpClient.post(endpoint, HttpClient.configurations.v1, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(wirePayload, (_key, value) => (value === undefined ? null : value))
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Send mail failed with status ${response.status}: ${details}`);
      }

      console.log(`${LOG_PREFIX} success`, {
        TypeSendMail: request.TypeSendMail,
        status: response.status
      });
    } catch (error) {
      console.error(`${LOG_PREFIX} failed`, {
        TypeSendMail: request.TypeSendMail,
        endpoint,
        error
      });

      phvbLogService.logApiError(
        buildApiLogParams(context, logContext, {
          httpMethod: 'POST',
          requestUrl: endpoint,
          requestPayload: serializeLogPayload(request)
        }),
        error
      );

      throw error instanceof Error ? error : new Error('Gửi mail thất bại.');
    }
  }
}

export const phvbSendMailService = new PhvbSendMailService();
