import { HttpClient } from '@microsoft/sp-http';
import {
  SHORT_URL_CODE_LENGTH,
  SHORT_URL_DEFAULT_ENDPOINT,
  SHORT_URL_TAGS
} from '../config/PhvbMag.configuration';
import type { IPhvbLogContext, IPhvbSiteContext } from '../models/PhvbMag.models';
import { buildApiLogParams, phvbLogService, serializeLogPayload } from './PhvbMagLog.service';

interface IShortUrlResponseBody {
  shortUrl?: string;
}

function resolveEndpoint(context: IPhvbSiteContext): string {
  return (context.endPointShortUrl || SHORT_URL_DEFAULT_ENDPOINT).trim();
}

export class PhvbShortUrlService {
  public async createShortUrl(
    context: IPhvbSiteContext,
    longUrl: string,
    apiKey: string,
    logContext?: IPhvbLogContext
  ): Promise<string> {
    const endpoint = resolveEndpoint(context);
    const normalizedLongUrl = (longUrl || '').trim();
    const normalizedApiKey = (apiKey || '').trim();

    if (!endpoint) {
      throw new Error('Chưa cấu hình endpoint short URL (endPointShortUrl).');
    }

    if (!normalizedLongUrl) {
      throw new Error('Thiếu longUrl để tạo short link.');
    }

    if (!normalizedApiKey) {
      throw new Error('Thiếu API key để tạo short link.');
    }

    const requestBody = {
      longUrl: normalizedLongUrl,
      tags: [...SHORT_URL_TAGS],
      shortCodeLength: SHORT_URL_CODE_LENGTH,
      forwardQuery: true
    };

    try {
      const response = await context.httpClient.post(endpoint, HttpClient.configurations.v1, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Api-Key': normalizedApiKey
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      let responseBody: IShortUrlResponseBody = {};

      if (responseText) {
        try {
          responseBody = JSON.parse(responseText) as IShortUrlResponseBody;
        } catch {
          responseBody = {};
        }
      }

      if (!response.ok) {
        throw new Error(`Short URL failed with status ${response.status}: ${responseText}`);
      }

      const shortUrl = (responseBody.shortUrl || '').trim();

      if (!shortUrl) {
        throw new Error(`Short URL response missing shortUrl field: ${responseText}`);
      }

      return shortUrl;
    } catch (error) {
      phvbLogService.logApiError(
        buildApiLogParams(context, logContext, {
          httpMethod: 'POST',
          requestUrl: endpoint,
          requestPayload: serializeLogPayload({
            longUrl: normalizedLongUrl,
            tags: SHORT_URL_TAGS,
            shortCodeLength: SHORT_URL_CODE_LENGTH
          })
        }),
        error
      );

      throw error instanceof Error ? error : new Error('Tạo short URL thất bại.');
    }
  }
}

export const phvbShortUrlService = new PhvbShortUrlService();
