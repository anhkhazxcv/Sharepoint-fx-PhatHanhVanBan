import type { IPhvbLogContext, IPhvbSiteContext } from '../models/PhvbMag.models';
import { maskApiKeySuffix } from './PhvbMagBanHanhPublish.utils';
import type { ShortUrlApiKeySource } from './PhvbMagShortUrl.utils';
import { phvbLogService, serializeLogPayload } from '../services/PhvbMagLog.service';

type AuditStepStatus = 'success' | 'failed';

interface IAuditBaseContext {
  siteContext: IPhvbSiteContext;
  logContext: IPhvbLogContext;
  idYeuCau: string;
}

export class BanHanhPublishAuditLogger {
  private readonly completedSteps: string[] = [];

  public constructor(
    private readonly base: IAuditBaseContext,
    private readonly flowRunId: string
  ) {}

  public async logStart(mainDocumentId?: number): Promise<void> {
    await this.write('BanHanh_Publish_Start', {
      idYeuCau: this.base.idYeuCau,
      mainDocumentId,
      userEmail: this.base.logContext.userEmail
    });
    this.completedSteps.push('start');
  }

  public async logMarkMainDocument(payload: Record<string, unknown>, status: AuditStepStatus, error?: string): Promise<void> {
    await this.write('BanHanh_MarkMainDocument', { ...payload, status, error });
    this.trackStep('mark_main_document', status);
  }

  public async logCreateTargetFolder(payload: Record<string, unknown>, status: AuditStepStatus, error?: string): Promise<void> {
    await this.write('BanHanh_CreateTargetFolder', { ...payload, status, error });
    this.trackStep('create_target_folder', status);
  }

  public async logCopyFile(payload: Record<string, unknown>, status: AuditStepStatus, error?: string): Promise<void> {
    await this.write('BanHanh_CopyFile', { ...payload, status, error });
    if (status === 'success') {
      this.completedSteps.push(`copy:${String(payload.fileName || payload.itemId || '')}`);
    }
  }

  public async logSecureFormFolder(payload: Record<string, unknown>, status: AuditStepStatus, error?: string): Promise<void> {
    await this.write('BanHanh_SecureFormFolder', { ...payload, status, error });
    this.trackStep('secure_form_folder', status);
  }

  public async logArchiveOldFolder(payload: Record<string, unknown>, status: AuditStepStatus, error?: string): Promise<void> {
    await this.write('BanHanh_ArchiveOldFolder', { ...payload, status, error });
    this.trackStep('archive_old_folder', status);
  }

  public async logCreateShortUrl(
    title: 'BanHanh_CreateShortUrl_LinkFile' | 'BanHanh_CreateShortUrl_LinkTatCaTaiLieu',
    payload: Record<string, unknown>,
    status: AuditStepStatus,
    error?: string
  ): Promise<void> {
    await this.write(title, { ...payload, status, error });
    this.trackStep(title, status);
  }

  public async logUpdateMetadata(payload: Record<string, unknown>, status: AuditStepStatus, error?: string): Promise<void> {
    await this.write('BanHanh_UpdateMetadata', { ...payload, status, error });
    if (status === 'success') {
      this.completedSteps.push(`metadata:${String(payload.fileName || '')}`);
    }
  }

  public async logUpdateRelease(payload: Record<string, unknown>, status: AuditStepStatus, error?: string): Promise<void> {
    await this.write('BanHanh_UpdateRelease', { ...payload, status, error });
    this.trackStep('update_release', status);
  }

  public async logSendMail(payload: Record<string, unknown>, status: AuditStepStatus, error?: string): Promise<void> {
    await this.write('BanHanh_SendMail', { ...payload, status, error });
    this.trackStep('send_mail', status);
  }

  public async logSuccess(summary: Record<string, unknown>): Promise<void> {
    await this.write('BanHanh_Publish_Success', {
      ...summary,
      stepsCompleted: [...this.completedSteps]
    });
  }

  public async logFailed(failedStep: string, error: unknown, extra?: Record<string, unknown>): Promise<void> {
    const message = error instanceof Error ? error.message : String(error || '');

    await this.write('BanHanh_Publish_Failed', {
      failedStep,
      error: message,
      stepsCompleted: [...this.completedSteps],
      ...extra
    });
  }

  public buildShortUrlAuditPayload(
    longUrl: string,
    shortUrl: string,
    apiKeySource: ShortUrlApiKeySource,
    apiKey: string,
    rawResponse?: string
  ): Record<string, unknown> {
    return {
      longUrl,
      shortUrl,
      apiKeySource,
      apiKeySuffix: maskApiKeySuffix(apiKey),
      rawResponse
    };
  }

  private trackStep(step: string, status: AuditStepStatus): void {
    if (status === 'success') {
      this.completedSteps.push(step);
    }
  }

  private async write(title: string, payload: Record<string, unknown>): Promise<void> {
    await phvbLogService.writeAuditLog(this.base.siteContext, {
      title,
      userEmail: this.base.logContext.userEmail,
      screenName: this.base.logContext.screenName,
      actionName: this.base.logContext.actionName,
      itemId: this.base.idYeuCau,
      flowRunId: this.flowRunId,
      requestPayload: serializeLogPayload(payload)
    }).catch(() => undefined);
  }
}

export function createBanHanhPublishAuditLogger(
  siteContext: IPhvbSiteContext,
  logContext: IPhvbLogContext,
  idYeuCau: string
): BanHanhPublishAuditLogger {
  const flowRunId = logContext.flowRunId || '';

  return new BanHanhPublishAuditLogger(
    {
      siteContext,
      logContext,
      idYeuCau
    },
    flowRunId
  );
}
