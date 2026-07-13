import {
  CONFIG_LABEL_CUSTOM_LIST_TITLE,
  CONFIG_MAIL_BAN_HANH_LIST_TITLE
} from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { toRuntimeMessage } from './PhvbMag.error';
import type {
  ILabelCustomConfigItem,
  IMailBanHanhConfigItem,
  IPhvbSiteContext
} from '../models/PhvbMag.models';

interface ISharePointMailBanHanhItem {
  Title?: string;
  Email?: string;
}

interface ISharePointLabelCustomItem {
  Label?: string;
  Value?: string;
}

let cachedMailConfig: IMailBanHanhConfigItem[] | undefined;
let mailCachePromise: Promise<IMailBanHanhConfigItem[]> | undefined;
let cachedLabelConfig: ILabelCustomConfigItem[] | undefined;
let labelCachePromise: Promise<ILabelCustomConfigItem[]> | undefined;

function mapMailBanHanhItem(item: ISharePointMailBanHanhItem): IMailBanHanhConfigItem | undefined {
  const folder = (item.Title || '').trim();
  const email = (item.Email || '').trim();

  if (!folder || !email) {
    return undefined;
  }

  return { folder, email };
}

function mapLabelCustomItem(item: ISharePointLabelCustomItem): ILabelCustomConfigItem | undefined {
  const label = (item.Label || '').trim();
  const value = (item.Value || '').trim();

  if (!label) {
    return undefined;
  }

  return { label, value };
}

export class PhvbBanHanhConfigService {
  public async loadMailBanHanhConfig(context: IPhvbSiteContext): Promise<IMailBanHanhConfigItem[]> {
    if (cachedMailConfig) {
      return cachedMailConfig.slice();
    }

    if (!mailCachePromise) {
      const requestPromise = this.fetchMailBanHanhConfig(context).then(items => {
        cachedMailConfig = items;
        return items;
      });
      mailCachePromise = requestPromise;
    }

    const pendingPromise = mailCachePromise;
    const items = await pendingPromise;

    if (mailCachePromise === pendingPromise) {
      mailCachePromise = undefined;
    }

    return items.slice();
  }

  public async loadLabelCustomConfig(context: IPhvbSiteContext): Promise<ILabelCustomConfigItem[]> {
    if (cachedLabelConfig) {
      return cachedLabelConfig.slice();
    }

    if (!labelCachePromise) {
      const requestPromise = this.fetchLabelCustomConfig(context).then(items => {
        cachedLabelConfig = items;
        return items;
      });
      labelCachePromise = requestPromise;
    }

    const pendingPromise = labelCachePromise;
    const items = await pendingPromise;

    if (labelCachePromise === pendingPromise) {
      labelCachePromise = undefined;
    }

    return items.slice();
  }

  private async fetchMailBanHanhConfig(context: IPhvbSiteContext): Promise<IMailBanHanhConfigItem[]> {
    const items = await phvbRepository.fetchItems({
      ...context,
      listTitle: CONFIG_MAIL_BAN_HANH_LIST_TITLE,
      selectFields: ['Title', 'Email'],
      top: 500
    }) as ISharePointMailBanHanhItem[];

    const mapped = items
      .map(mapMailBanHanhItem)
      .filter((entry): entry is IMailBanHanhConfigItem => Boolean(entry));

    return mapped;
  }

  private async fetchLabelCustomConfig(context: IPhvbSiteContext): Promise<ILabelCustomConfigItem[]> {
    const items = await phvbRepository.fetchItems({
      ...context,
      listTitle: CONFIG_LABEL_CUSTOM_LIST_TITLE,
      selectFields: ['Label', 'Value'],
      top: 500
    }) as ISharePointLabelCustomItem[];

    const mapped = items
      .map(mapLabelCustomItem)
      .filter((entry): entry is ILabelCustomConfigItem => Boolean(entry));

    return mapped;
  }

  public clearCache(): void {
    cachedMailConfig = undefined;
    mailCachePromise = undefined;
    cachedLabelConfig = undefined;
    labelCachePromise = undefined;
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, CONFIG_MAIL_BAN_HANH_LIST_TITLE);
  }
}

export const phvbBanHanhConfigService = new PhvbBanHanhConfigService();
