import { HttpClient, MSGraphClientFactory, SPHttpClient } from '@microsoft/sp-http';

export interface IPhvbMagProps {
  userDisplayName: string;
  userEmail: string;
  msGraphClientFactory: MSGraphClientFactory;
  spHttpClient: SPHttpClient;
  httpClient: HttpClient;
  currentWebUrl: string;
  siteCollectionUrl: string;
  sourceSiteUrl?: string;
  listTitle?: string;
  endPointSendMail?: string;
}

