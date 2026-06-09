/**
 * Web Part IDs:
 * - PROD: 7db6d7b3-dbe0-48ec-9506-6d58e071d506
 * - UAT:  7db6d7b3-dbe0-48ec-9506-6d58e071d502
 */
/**
 * Solution IDs:
 * - PROD: 869587ed-8ad3-42bd-82c1-ad961ba436c1
 * - UAT:  869587ed-8ad3-42bd-82c1-ad961ba436c2
 */
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart, IWebPartPropertiesMetadata } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import * as strings from 'PhvbMagWebPartStrings';
import PhvbMag from './components/PhvbMag';
import { IPhvbMagProps } from './components/IPhvbMagProps';

export interface IPhvbMagWebPartProps {
  sourceSiteUrl: string;
  listTitle: string;
}

export default class PhvbMagWebPart extends BaseClientSideWebPart<IPhvbMagWebPartProps> {
  protected get propertiesMetadata(): IWebPartPropertiesMetadata {
    return {};
  }

  protected onInit(): Promise<void> {
    if (!this.properties.sourceSiteUrl) {
      this.properties.sourceSiteUrl = 'https://masterisegroup.sharepoint.com/sites/test';
      //this.properties.sourceSiteUrl = 'https://masterisegroup.sharepoint.com';
    }

    return super.onInit();
  }

  public render(): void {
    const element: React.ReactElement<IPhvbMagProps> = React.createElement(
      PhvbMag,
      {
        userDisplayName: this.context.pageContext.user.displayName,
        userEmail: this.context.pageContext.user.email,
        msGraphClientFactory: this.context.msGraphClientFactory,
        spHttpClient: this.context.spHttpClient,
        currentWebUrl: this.context.pageContext.web.absoluteUrl,
        siteCollectionUrl: this.context.pageContext.site.absoluteUrl,
        sourceSiteUrl: this.properties.sourceSiteUrl,
        listTitle: this.properties.listTitle
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    const {
      semanticColors
    } = currentTheme;

    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('sourceSiteUrl', {
                  label: 'SharePoint source site URL',
                  description: 'Optional. Leave empty to try current web first, then site collection.'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
