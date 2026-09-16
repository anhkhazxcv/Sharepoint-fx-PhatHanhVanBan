import type { IPhvbLogContext, IPhvbSiteContext } from '../models/PhvbMag.models';
import { clipSharePointNote, phvbLogService, serializeLogPayload, SHAREPOINT_NOTE_MAX_CHARS } from '../services/PhvbMagLog.service';

type AuditStepStatus = 'success' | 'failed';

export interface IBanHanhAuditStep {
  step: string;
  file?: string;
  status: AuditStepStatus;
  url?: string;
  payload?: Record<string, unknown>;
  error?: string;
}

interface IAuditBaseContext {
  siteContext: IPhvbSiteContext;
  logContext: IPhvbLogContext;
  idYeuCau: string;
}

interface IBanHanhAuditHeader {
  idYeuCau: string;
  loaiYeuCau?: string;
  mainDocumentId?: number;
  tomTatNoiDung?: string;
}

export class BanHanhPublishAuditLogger {
  private readonly steps: IBanHanhAuditStep[] = [];
  private header: IBanHanhAuditHeader;

  public constructor(
    private readonly base: IAuditBaseContext,
    private readonly flowRunId: string
  ) {
    this.header = { idYeuCau: base.idYeuCau };
  }

  public async logStart(mainDocumentId?: number): Promise<void> {
    this.header.mainDocumentId = mainDocumentId;
  }

  public setHeader(partial: Partial<IBanHanhAuditHeader>): void {
    this.header = {
      ...this.header,
      ...partial,
      idYeuCau: this.base.idYeuCau
    };
  }

  public appendStep(entry: IBanHanhAuditStep): void {
    this.steps.push(entry);
  }

  public async logMarkMainDocument(payload: Record<string, unknown>, status: AuditStepStatus, error?: string, url?: string): Promise<void> {
    this.appendStep({
      step: 'mark_main_document',
      status,
      url,
      payload,
      error
    });
  }

  public async logCreateTargetFolder(payload: Record<string, unknown>, status: AuditStepStatus, error?: string, url?: string): Promise<void> {
    this.appendStep({
      step: 'create_target_folder',
      status,
      url,
      payload,
      error
    });
  }

  public async logCopyFile(payload: Record<string, unknown>, status: AuditStepStatus, error?: string, url?: string): Promise<void> {
    const storedPayload: Record<string, unknown> = {
      sourcePath: payload.sourcePath,
      targetPath: payload.targetPath
    };

    if (payload.isFormAttachment === true) {
      storedPayload.isFormAttachment = true;
    }

    this.appendStep({
      step: 'copy',
      file: String(payload.fileName || ''),
      status,
      url,
      payload: storedPayload,
      error
    });
  }

  public async logMoveFile(payload: Record<string, unknown>, status: AuditStepStatus, error?: string, url?: string): Promise<void> {
    this.appendStep({
      step: 'move',
      file: String(payload.fileName || ''),
      status,
      url,
      payload: {
        sourcePath: payload.sourcePath,
        targetPath: payload.targetPath
      },
      error
    });
  }

  public async logSecureFormFolder(payload: Record<string, unknown>, status: AuditStepStatus, error?: string, url?: string): Promise<void> {
    this.appendStep({
      step: 'secure_form_folder',
      status,
      url,
      payload,
      error
    });
  }

  public async logArchiveOldFolder(payload: Record<string, unknown>, status: AuditStepStatus, error?: string, url?: string): Promise<void> {
    this.appendStep({
      step: 'archive',
      status,
      url,
      payload,
      error
    });
  }

  public async logCreateShortUrl(
    title: 'BanHanh_CreateShortUrl_LinkFile' | 'BanHanh_CreateShortUrl_LinkTatCaTaiLieu',
    payload: Record<string, unknown>,
    status: AuditStepStatus,
    error?: string,
    url?: string
  ): Promise<void> {
    this.appendStep({
      step: 'short_url',
      status,
      url,
      payload: {
        kind: title === 'BanHanh_CreateShortUrl_LinkFile' ? 'linkFile' : 'linkTatCaTaiLieu',
        longUrl: payload.longUrl,
        shortUrl: payload.shortUrl
      },
      error
    });
  }

  public async logUpdateMetadata(payload: Record<string, unknown>, status: AuditStepStatus, error?: string, url?: string): Promise<void> {
    const storedPayload: Record<string, unknown> = {
      formValues: payload.formValues
    };

    if (payload.isFormAttachment === true) {
      storedPayload.isFormAttachment = true;
    }

    this.appendStep({
      step: 'stamp',
      file: payload.isFolder ? 'folder' : String(payload.fileName || ''),
      status,
      url,
      payload: storedPayload,
      error
    });
  }

  public async logUpdateRelease(payload: Record<string, unknown>, status: AuditStepStatus, error?: string, url?: string): Promise<void> {
    this.appendStep({
      step: 'update_release',
      status,
      url,
      payload,
      error
    });
  }

  public async logSendMail(payload: Record<string, unknown>, status: AuditStepStatus, error?: string, url?: string): Promise<void> {
    this.appendStep({
      step: 'send_mail',
      status,
      url,
      payload: {
        TypeSendMail: payload.TypeSendMail,
        EmailTo: payload.EmailTo,
        subject: payload.subject
      },
      error
    });
  }

  public async logSuccess(summary: Record<string, unknown>): Promise<void> {
    await this.flush('BanHanh_Publish_Success', summary);
  }

  public async logFailed(failedStep: string, error: unknown, extra?: Record<string, unknown>): Promise<void> {
    const message = error instanceof Error ? error.message : String(error || '');
    const failedFile = extra && extra.failedFile ? String(extra.failedFile) : this.findFailedFile();

    await this.flush('BanHanh_Publish_Failed', {
      failedStep,
      failedFile,
      error: message
    }, message);
  }

  public buildShortUrlAuditPayload(
    longUrl: string,
    shortUrl: string
  ): Record<string, unknown> {
    return {
      longUrl,
      shortUrl
    };
  }

  private findFailedFile(): string | undefined {
    for (let index = this.steps.length - 1; index >= 0; index -= 1) {
      const step = this.steps[index];
      if (step.status === 'failed' && step.file) {
        return step.file;
      }
    }

    return undefined;
  }

  private countSteps(stepName: string, formOnly?: boolean): number {
    let count = 0;

    for (let index = 0; index < this.steps.length; index += 1) {
      const step = this.steps[index];
      if (step.step !== stepName || step.status !== 'success') {
        continue;
      }

      if (formOnly) {
        if (step.payload && step.payload.isFormAttachment === true) {
          count += 1;
        }
        continue;
      }

      count += 1;
    }

    return count;
  }

  private buildFlushPayload(summary: Record<string, unknown>): Record<string, unknown> {
    return {
      idYeuCau: this.header.idYeuCau,
      loaiYeuCau: this.header.loaiYeuCau || summary.loaiYeuCau,
      mainDocumentId: this.header.mainDocumentId !== undefined ? this.header.mainDocumentId : summary.mainDocumentId,
      copyCount: this.countSteps('copy'),
      stampCount: this.countSteps('stamp'),
      formCount: this.countSteps('copy', true),
      tomTatNoiDung: this.header.tomTatNoiDung,
      linkFile: summary.linkFile,
      linkTatCaTaiLieu: summary.linkTatCaTaiLieu,
      failedStep: summary.failedStep,
      failedFile: summary.failedFile,
      error: summary.error,
      archived: summary.archived !== undefined
        ? summary.archived
        : Boolean(summary.expiredFolderServerRelativePath) || this.countSteps('archive') > 0,
      archivedMoveCount: summary.archivedMoveCount !== undefined
        ? summary.archivedMoveCount
        : this.countSteps('move'),
      hieuLucDenStampedCount: summary.hieuLucDenStampedCount,
      steps: this.steps.slice()
    };
  }

  private fitPayloadToNoteLimit(payload: Record<string, unknown>): Record<string, unknown> {
    let current = payload;
    let serialized = JSON.stringify(current);

    if (serialized.length <= SHAREPOINT_NOTE_MAX_CHARS) {
      return current;
    }

    const steps = ((current.steps as IBanHanhAuditStep[]) || []).slice();

    for (let index = 0; index < steps.length; index += 1) {
      if (steps[index].status !== 'success' || !steps[index].payload) {
        continue;
      }

      const nextStep: IBanHanhAuditStep = {
        step: steps[index].step,
        status: steps[index].status
      };

      if (steps[index].file) {
        nextStep.file = steps[index].file;
      }

      if (steps[index].url) {
        nextStep.url = steps[index].url;
      }

      steps[index] = nextStep;
      current = {
        ...current,
        truncated: true,
        steps
      };
      serialized = JSON.stringify(current);

      if (serialized.length <= SHAREPOINT_NOTE_MAX_CHARS) {
        return current;
      }
    }

    return {
      ...current,
      truncated: true,
      steps
    };
  }

  private async flush(title: string, summary: Record<string, unknown>, errorMessage?: string): Promise<void> {
    const payload = this.fitPayloadToNoteLimit(this.buildFlushPayload(summary));

    await this.write(title, payload, errorMessage);
  }

  private async write(title: string, payload: Record<string, unknown>, errorMessage?: string): Promise<void> {
    await phvbLogService.writeAuditLog(this.base.siteContext, {
      title,
      userEmail: this.base.logContext.userEmail,
      screenName: this.base.logContext.screenName,
      actionName: this.base.logContext.actionName,
      itemId: this.base.idYeuCau,
      flowRunId: this.flowRunId,
      errorMessage: errorMessage ? clipSharePointNote(errorMessage) : undefined,
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
