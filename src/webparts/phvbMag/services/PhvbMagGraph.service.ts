import { MSGraphClientFactory, MSGraphClientV3 } from '@microsoft/sp-http';
import type { IPhvbCurrentUserProfile, IPhvbDirectoryUser } from '../models/PhvbMag.models';

interface IGraphUserItem {
  id?: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  department?: string;
  jobTitle?: string;
  accountEnabled?: boolean;
  userType?: string;
}

interface IGraphUsersResponse {
  value?: IGraphUserItem[];
  '@odata.nextLink'?: string;
}

interface IGraphMeResponse {
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  department?: string;
}

const INTERNAL_TENANT_USERS_PATH =
  '/users?$select=id,displayName,mail,userPrincipalName,department,jobTitle,accountEnabled,userType&$filter=userType eq \'Member\'&$top=999';

function normalizeEmail(item: IGraphUserItem | IGraphMeResponse): string {
  return (item.mail || item.userPrincipalName || '').trim();
}

function isInternalDirectoryUser(item: IGraphUserItem): boolean {
  if (item.userType === 'Guest') {
    return false;
  }

  const upn = (item.userPrincipalName || '').toLowerCase();

  if (upn.indexOf('#ext#') > -1) {
    return false;
  }

  return item.userType === 'Member' || !item.userType;
}

function mapDirectoryUser(item: IGraphUserItem): IPhvbDirectoryUser | undefined {
  if (!isInternalDirectoryUser(item)) {
    return undefined;
  }

  const email = normalizeEmail(item);
  const displayName = item.displayName ? item.displayName.trim() : '';

  if (!item.id || !email || !displayName || item.accountEnabled === false) {
    return undefined;
  }

  return {
    id: item.id,
    displayName,
    email,
    department: item.department,
    jobTitle: item.jobTitle
  };
}

function extractNextRequestPath(nextLink?: string): string | undefined {
  if (!nextLink) {
    return undefined;
  }

  const marker = '/v1.0';
  const markerIndex = nextLink.indexOf(marker);

  if (markerIndex > -1) {
    return nextLink.substring(markerIndex + marker.length);
  }

  return nextLink;
}

function sortDirectoryUsers(users: IPhvbDirectoryUser[]): IPhvbDirectoryUser[] {
  return users.slice().sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export class PhvbMagGraphService {
  private async getClient(msGraphClientFactory: MSGraphClientFactory): Promise<MSGraphClientV3> {
    return msGraphClientFactory.getClient('3');
  }

  public async loadCurrentUserProfile(msGraphClientFactory: MSGraphClientFactory): Promise<IPhvbCurrentUserProfile> {
    const client = await this.getClient(msGraphClientFactory);
    const response = await client
      .api('/me')
      .version('v1.0')
      .select('displayName,mail,userPrincipalName,department')
      .get() as IGraphMeResponse;

    return {
      displayName: response.displayName || '',
      email: normalizeEmail(response),
      department: response.department
    };
  }

  public async loadInternalTenantUsers(msGraphClientFactory: MSGraphClientFactory): Promise<IPhvbDirectoryUser[]> {
    const client = await this.getClient(msGraphClientFactory);
    const usersByEmail: Record<string, IPhvbDirectoryUser> = {};
    let nextRequestPath: string | undefined = INTERNAL_TENANT_USERS_PATH;

    while (nextRequestPath) {
      const response = await client.api(nextRequestPath).version('v1.0').get() as IGraphUsersResponse;
      const items = response.value || [];

      for (let index = 0; index < items.length; index += 1) {
        const mappedUser = mapDirectoryUser(items[index]);
        if (mappedUser) {
          usersByEmail[mappedUser.email.toLowerCase()] = mappedUser;
        }
      }

      nextRequestPath = extractNextRequestPath(response['@odata.nextLink']);
    }

    const directoryUsers = Object.keys(usersByEmail).map(key => usersByEmail[key]);
    return sortDirectoryUsers(directoryUsers);
  }
}

export const phvbMagGraphService = new PhvbMagGraphService();
