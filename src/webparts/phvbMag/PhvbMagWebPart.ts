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
import { ISSUANCE_LIBRARY_TITLE, SHORT_URL_DEFAULT_ENDPOINT } from './config/PhvbMag.configuration';
import PhvbMag from './components/PhvbMag';
import { IPhvbMagProps } from './components/IPhvbMagProps';

export interface IPhvbMagWebPartProps {
  sourceSiteUrl: string;
  listTitle: string;
  issuanceLibraryTitle?: string;
  endPointSendMail?: string;
  endPointShortUrl?: string;
  roleGroupID?: string;
}

const PHVB_MIN_SHELL_HEIGHT_PX = 200;
// Bounded, self-terminating recheck schedule to catch SharePoint's own
// minimal page chrome (suite header bar, tenant/MOTD banners) settling
// shortly after this web part's first paint, which shifts our top offset
// with no other trigger to recompute.
const PHVB_SETTLE_RECHECK_DELAYS_MS = [100, 300, 600, 1000, 1600, 2500];

// Phải khớp $bp-mobile trong _PhvbMag.design-tokens.scss và
// PHVB_VIEWPORT_BREAKPOINTS.mobile trong hooks/usePhvbViewport.ts.
const PHVB_MOBILE_BREAKPOINT_PX = 768;

const PHVB_TEXT_ENTRY_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

// iOS Safari co window.innerHeight khi bàn phím ảo mở. Nếu vẫn đo lúc đó thì
// shell tụt xuống còn ~40% và layout sập ngay giữa lúc người dùng đang gõ
// (rõ nhất ở composer bình luận trong bottom sheet). Giữ nguyên chiều cao
// đang có cho tới khi input mất focus.
function isVirtualKeyboardLikelyOpen(root: HTMLElement): boolean {
  if (window.innerWidth > PHVB_MOBILE_BREAKPOINT_PX) {
    return false;
  }

  const active = document.activeElement;

  if (!active || !root.contains(active)) {
    return false;
  }

  if (PHVB_TEXT_ENTRY_TAGS.indexOf(active.tagName) !== -1) {
    return true;
  }

  return (active as HTMLElement).isContentEditable === true;
}

// Tìm ancestor gần nhất có overflow cuộn thật (vd. contentScrollRegion của
// SharePoint AppChrome shell) — đây mới là ranh giới đáy thật sự của không
// gian dành cho web part, khác với viewport khi trang dùng layout kiểu này.
function findScrollBoundaryAncestor(el: HTMLElement): HTMLElement | undefined {
  let node = el.parentElement;
  let depth = 0;

  while (node && node !== document.body && depth < 12) {
    const overflowY = window.getComputedStyle(node).overflowY;

    if (overflowY === 'auto' || overflowY === 'scroll') {
      return node;
    }

    node = node.parentElement;
    depth += 1;
  }

  return undefined;
}

export default class PhvbMagWebPart extends BaseClientSideWebPart<IPhvbMagWebPartProps> {
  private _resizeObserver: ResizeObserver | undefined;
  private _bodyResizeObserver: ResizeObserver | undefined;
  private _windowResizeHandler: (() => void) | undefined;
  private _focusOutHandler: (() => void) | undefined;
  private _settleRecheckTimeouts: number[] = [];

  protected get propertiesMetadata(): IWebPartPropertiesMetadata {
    return {};
  }

  protected onInit(): Promise<void> {
    if (!this.properties.sourceSiteUrl) {
      this.properties.sourceSiteUrl = 'https://masterisegroup.sharepoint.com/sites/test';
      this.properties.endPointSendMail = 'https://defaultabd5926f9a1b41379332b3f4e80959.23.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/22/workflows/f76236a31fed47b1bdcf450d97c818c8/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=pzUned3r2JuDD3ZMNoYnRgQubspNIv0swynsil6UxMk';
      this.properties.endPointShortUrl = SHORT_URL_DEFAULT_ENDPOINT;
    }

    if (!(this.properties.roleGroupID || '').trim()) {
      this.properties.roleGroupID = '10';
    }

    if (!(this.properties.issuanceLibraryTitle || '').trim()) {
      this.properties.issuanceLibraryTitle = ISSUANCE_LIBRARY_TITLE;
    }

    this.ensureTypographyFontLoaded();

    return super.onInit().then(() => {
      this._setupAvailableHeightTracking();
    });
  }

  private _setupAvailableHeightTracking(): void {
    this._recheckAvailableHeight();

    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => {
        this._recheckAvailableHeight();
      });
      this._resizeObserver.observe(this.domElement);

      // Catches page-chrome shifts (suite header bar, tenant/MOTD banners) that
      // resize `document.body` without resizing `this.domElement` itself, at any
      // point in the web part's lifetime — not just the initial settle window.
      this._bodyResizeObserver = new ResizeObserver(() => {
        this._recheckAvailableHeight();
      });
      this._bodyResizeObserver.observe(document.body);
    }

    this._windowResizeHandler = (): void => {
      this._recheckAvailableHeight();
    };
    window.addEventListener('resize', this._windowResizeHandler);

    // Khi bàn phím ảo đóng lại, 'resize' thường bắn ra trước khi activeElement
    // nhả focus, nên lần đo đó vẫn bị isVirtualKeyboardLikelyOpen chặn. Đo lại
    // lúc focus rời khỏi input để lấy lại chiều cao đầy đủ.
    this._focusOutHandler = (): void => {
      this._recheckAvailableHeight();
    };
    this.domElement.addEventListener('focusout', this._focusOutHandler);
  }

  // Đo lại ngay + hẹn giờ đo thêm vài lần trong ~2.5s tới — dùng cho MỌI nguồn
  // trigger (mount, resize, ResizeObserver), không chỉ lúc mount. Cần thiết vì
  // khi kéo cửa sổ sang màn hình khác DPI scaling, layout/chrome xung quanh có
  // thể chưa ổn định ngay tại thời điểm resize event bắn ra.
  private _recheckAvailableHeight(): void {
    this._updateAvailableHeight();
    this._scheduleSettleRechecks();
  }

  private _scheduleSettleRechecks(): void {
    this._clearSettleRecheckTimeouts();

    PHVB_SETTLE_RECHECK_DELAYS_MS.forEach(delayMs => {
      const timeoutId = window.setTimeout(() => this._updateAvailableHeight(), delayMs);
      this._settleRecheckTimeouts.push(timeoutId);
    });
  }

  private _clearSettleRecheckTimeouts(): void {
    this._settleRecheckTimeouts.forEach(id => window.clearTimeout(id));
    this._settleRecheckTimeouts = [];
  }

  private _updateAvailableHeight(): void {
    try {
      if (isVirtualKeyboardLikelyOpen(this.domElement)) {
        return;
      }

      const top = this.domElement.getBoundingClientRect().top;
      const boundary = findScrollBoundaryAncestor(this.domElement);
      // Ưu tiên cạnh đáy của vùng cuộn thật (contentScrollRegion...) — chỉ
      // fallback về window.innerHeight khi không có ancestor nào như vậy
      // (trang layout kiểu cũ, không dùng AppChrome shell).
      const bottomEdge = boundary ? boundary.getBoundingClientRect().bottom : window.innerHeight;
      const availableHeight = Math.max(PHVB_MIN_SHELL_HEIGHT_PX, Math.floor(bottomEdge - top));

      this.domElement.style.height = `${availableHeight}px`;
      this.domElement.style.setProperty('--phvb-available-height', `${availableHeight}px`);
    } catch {
      // Defensive: never leave the element stranded on a stale/bad inline
      // height. The CSS fallback (auto/none) degrades safely if this never
      // successfully runs.
    }
  }

  private ensureTypographyFontLoaded(): void {
    const fontHref = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap';
    const existingLink = document.querySelector(`link[data-phvb-font="plus-jakarta-sans"]`);

    if (existingLink) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontHref;
    link.setAttribute('data-phvb-font', 'plus-jakarta-sans');
    document.head.appendChild(link);
  }

  public render(): void {
    const element: React.ReactElement<IPhvbMagProps> = React.createElement(
      PhvbMag,
      {
        userDisplayName: this.context.pageContext.user.displayName,
        userEmail: this.context.pageContext.user.email,
        msGraphClientFactory: this.context.msGraphClientFactory,
        spHttpClient: this.context.spHttpClient,
        httpClient: this.context.httpClient,
        currentWebUrl: this.context.pageContext.web.absoluteUrl,
        siteCollectionUrl: this.context.pageContext.site.absoluteUrl,
        sourceSiteUrl: this.properties.sourceSiteUrl,
        listTitle: this.properties.listTitle,
        issuanceLibraryTitle: this.properties.issuanceLibraryTitle,
        endPointSendMail: this.properties.endPointSendMail,
        endPointShortUrl: this.properties.endPointShortUrl,
        roleGroupID: this.properties.roleGroupID
      }
    );

    ReactDom.render(element, this.domElement);
    this._updateAvailableHeight();
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
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;

    this._bodyResizeObserver?.disconnect();
    this._bodyResizeObserver = undefined;

    if (this._windowResizeHandler) {
      window.removeEventListener('resize', this._windowResizeHandler);
      this._windowResizeHandler = undefined;
    }

    if (this._focusOutHandler) {
      this.domElement.removeEventListener('focusout', this._focusOutHandler);
      this._focusOutHandler = undefined;
    }

    this._clearSettleRecheckTimeouts();

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
                }),
                PropertyPaneTextField('issuanceLibraryTitle', {
                  label: 'Issuance library title',
                  description: 'Document library for Thư viện tài liệu. Default: VanBanBanHanh_Ver02.'
                }),
                PropertyPaneTextField('endPointSendMail', {
                  label: 'EndPoint Send Mail',
                  description: 'URL API gửi email workflow (POST JSON). Để trống nếu chưa cấu hình.'
                }),
                PropertyPaneTextField('endPointShortUrl', {
                  label: 'EndPoint Short URL',
                  description: 'URL API tạo short link (POST JSON). Mặc định masterisehomes short-urls.'
                }),
                PropertyPaneTextField('roleGroupID', {
                  label: 'Role Group ID',
                  description: 'SharePoint group ID được gán quyền Read cho thư mục Biểu Mẫu khi ban hành.'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
