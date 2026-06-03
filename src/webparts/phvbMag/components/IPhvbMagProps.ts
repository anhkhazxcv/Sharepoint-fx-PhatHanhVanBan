import { MSGraphClientFactory, SPHttpClient } from '@microsoft/sp-http';

export interface IPhvbMagProps {
  userDisplayName: string;
  userEmail: string;
  msGraphClientFactory: MSGraphClientFactory;
  spHttpClient: SPHttpClient;
  currentWebUrl: string;
  siteCollectionUrl: string;
  sourceSiteUrl?: string;
  listTitle?: string;
}

