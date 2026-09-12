import { useEffect, useState } from 'react';

/**
 * Nguồn sự thật cho breakpoint. Mirror bằng tay trong
 * _PhvbMag.design-tokens.scss ($bp-mobile / $bp-tablet / $bp-narrow) — SCSS
 * không đọc được constant TS nên hai bên phải sửa cùng lúc.
 */
export const PHVB_VIEWPORT_BREAKPOINTS = {
  // Dưới ngưỡng này web part đổi sang mobile chrome (app bar + bottom nav).
  mobile: 768,
  tablet: 1024,
  // Ngưỡng library bỏ preview pane — giá trị lịch sử, giữ nguyên.
  narrow: 1180
} as const;

export type PhvbViewportTier = keyof typeof PHVB_VIEWPORT_BREAKPOINTS;

/** Giữ tên cũ để không phải sửa call-site đang dùng. */
export const LIBRARY_NARROW_BREAKPOINT_PX = PHVB_VIEWPORT_BREAKPOINTS.narrow;

function buildQuery(tier: PhvbViewportTier): string {
  return `(max-width: ${PHVB_VIEWPORT_BREAKPOINTS[tier]}px)`;
}

function readMatches(tier: PhvbViewportTier): boolean {
  try {
    return window.matchMedia(buildQuery(tier)).matches;
  } catch {
    return false;
  }
}

/**
 * True khi viewport hẹp hơn (hoặc bằng) breakpoint của tier.
 *
 * Đo theo viewport chứ không theo bề rộng web part: SharePoint page chrome đã
 * được ẩn trên mobile nên hai giá trị này trùng nhau, và matchMedia rẻ hơn
 * ResizeObserver cho một quyết định nhị phân.
 */
export function usePhvbViewport(tier: PhvbViewportTier): boolean {
  const [matches, setMatches] = useState<boolean>(() => readMatches(tier));

  useEffect(() => {
    let mediaQueryList: MediaQueryList;

    try {
      mediaQueryList = window.matchMedia(buildQuery(tier));
    } catch {
      return undefined;
    }

    const handleChange = (): void => setMatches(mediaQueryList.matches);

    handleChange();

    // addListener là fallback cho Safari < 14.
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
      return () => mediaQueryList.removeEventListener('change', handleChange);
    }

    mediaQueryList.addListener(handleChange);
    return () => mediaQueryList.removeListener(handleChange);
  }, [tier]);

  return matches;
}

/** Web part đang chạy ở khổ điện thoại → dùng mobile chrome. */
export function usePhvbIsMobile(): boolean {
  return usePhvbViewport('mobile');
}

/**
 * Mirrors the 1180px breakpoint in _PhvbMag.animations.scss where .libraryMain
 * stacks vertically — below it the library preview falls back to the overlay.
 */
export function usePhvbNarrowViewport(): boolean {
  return usePhvbViewport('narrow');
}
