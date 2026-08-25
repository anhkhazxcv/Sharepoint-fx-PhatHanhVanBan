import { CONFIG_MAIL_CONTENT_LIST_TITLE } from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { toRuntimeMessage } from './PhvbMag.error';
import type { IMailContentConfigItem, IPhvbSiteContext } from '../models/PhvbMag.models';

interface ISharePointMailContentItem {
  MaLoaiMail?: string;
  TieuDeMail?: string;
  NoiDungMail?: string;
}

let cachedMailContentConfig: IMailContentConfigItem[] | undefined;
let mailContentCachePromise: Promise<IMailContentConfigItem[]> | undefined;

function mapMailContentItem(item: ISharePointMailContentItem): IMailContentConfigItem | undefined {
  const mailType = (item.MaLoaiMail || '').trim();

  if (!mailType) {
    return undefined;
  }

  return {
    mailType,
    subject: (item.TieuDeMail || '').trim(),
    body: (item.NoiDungMail || '').trim()
  };
}

export class PhvbMailContentConfigService {
  public async loadMailContentConfig(context: IPhvbSiteContext): Promise<IMailContentConfigItem[]> {
    if (cachedMailContentConfig) {
      return cachedMailContentConfig.slice();
    }

    if (!mailContentCachePromise) {
      const requestPromise = this.fetchMailContentConfig(context).then(items => {
        cachedMailContentConfig = items;
        return items;
      });
      mailContentCachePromise = requestPromise;
    }

    const pendingPromise = mailContentCachePromise;
    const items = await pendingPromise;

    if (mailContentCachePromise === pendingPromise) {
      mailContentCachePromise = undefined;
    }

    return items.slice();
  }

  public async getMailContentByType(
    context: IPhvbSiteContext,
    mailType: string
  ): Promise<IMailContentConfigItem | undefined> {
    const configItems = await this.loadMailContentConfig(context);

    for (let index = 0; index < configItems.length; index += 1) {
      if (configItems[index].mailType === mailType) {
        return configItems[index];
      }
    }

    return undefined;
  }

  private async fetchMailContentConfig(context: IPhvbSiteContext): Promise<IMailContentConfigItem[]> {
    const items = await phvbRepository.fetchItems({
      ...context,
      listTitle: CONFIG_MAIL_CONTENT_LIST_TITLE,
      selectFields: ['MaLoaiMail', 'TieuDeMail', 'NoiDungMail'],
      top: 500
    }) as ISharePointMailContentItem[];

    return items
      .map(mapMailContentItem)
      .filter((entry): entry is IMailContentConfigItem => Boolean(entry));
  }

  public clearCache(): void {
    cachedMailContentConfig = undefined;
    mailContentCachePromise = undefined;
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, CONFIG_MAIL_CONTENT_LIST_TITLE);
  }
}

export const phvbMailContentConfigService = new PhvbMailContentConfigService();
