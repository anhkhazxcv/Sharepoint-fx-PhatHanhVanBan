import { PHVB_ROLE_LIST_TITLE } from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { toRuntimeMessage } from './PhvbMag.error';
import type { IPhvbRoleEntry, IPhvbSiteContext } from '../models/PhvbMag.models';

interface ISharePointRoleItem {
  Title?: string;
  Email?: string;
}

let cachedRoles: IPhvbRoleEntry[] | undefined;
let cachePromise: Promise<IPhvbRoleEntry[]> | undefined;

function mapRoleItem(item: ISharePointRoleItem): IPhvbRoleEntry | undefined {
  const role = (item.Title || '').trim();
  const email = (item.Email || '').trim();

  if (!role || !email) {
    return undefined;
  }

  return { role, email };
}

export class PhvbRoleService {
  public async loadRoles(context: IPhvbSiteContext): Promise<IPhvbRoleEntry[]> {
    if (cachedRoles) {
      return cachedRoles.slice();
    }

    if (!cachePromise) {
      cachePromise = this.fetchRoles(context)
        .then(roles => {
          cachedRoles = roles;
          return roles;
        });
    }

    const roles = await cachePromise;
    cachePromise = undefined;
    return roles.slice();
  }

  private async fetchRoles(context: IPhvbSiteContext): Promise<IPhvbRoleEntry[]> {
    const items = await phvbRepository.fetchItems({
      ...context,
      listTitle: PHVB_ROLE_LIST_TITLE,
      selectFields: ['Title', 'Email'],
      top: 500,
      orderBy: 'Title asc'
    }) as ISharePointRoleItem[];

    return items
      .map(mapRoleItem)
      .filter((entry): entry is IPhvbRoleEntry => Boolean(entry));
  }

  public clearCache(): void {
    cachedRoles = undefined;
    cachePromise = undefined;
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, PHVB_ROLE_LIST_TITLE);
  }
}

export const phvbRoleService = new PhvbRoleService();
