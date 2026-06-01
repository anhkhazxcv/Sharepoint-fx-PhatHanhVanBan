import { SPHttpClient } from '@microsoft/sp-http';

export interface IPhvbMagProps {
  userDisplayName: string;
  userEmail: string;
  spHttpClient: SPHttpClient;
  currentWebUrl: string;
  siteCollectionUrl: string;
  sourceSiteUrl?: string;
  listTitle?: string;
}

