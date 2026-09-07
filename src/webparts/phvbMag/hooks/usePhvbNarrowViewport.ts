import { useEffect, useState } from 'react';

/**
 * Mirrors the 1180px breakpoint in _PhvbMag.animations.scss where .libraryMain
 * stacks vertically — below it the library preview falls back to the overlay.
 */
export const LIBRARY_NARROW_BREAKPOINT_PX = 1180;

const NARROW_MEDIA_QUERY = `(max-width: ${LIBRARY_NARROW_BREAKPOINT_PX}px)`;

function readMatches(): boolean {
  try {
    return window.matchMedia(NARROW_MEDIA_QUERY).matches;
  } catch {
    return false;
  }
}

export function usePhvbNarrowViewport(): boolean {
  const [isNarrow, setIsNarrow] = useState<boolean>(readMatches);

  useEffect(() => {
    let mediaQueryList: MediaQueryList;

    try {
      mediaQueryList = window.matchMedia(NARROW_MEDIA_QUERY);
    } catch {
      return undefined;
    }

    const handleChange = (): void => setIsNarrow(mediaQueryList.matches);

    handleChange();

    // addListener is the Safari < 14 fallback for addEventListener('change').
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
      return () => mediaQueryList.removeEventListener('change', handleChange);
    }

    mediaQueryList.addListener(handleChange);
    return () => mediaQueryList.removeListener(handleChange);
  }, []);

  return isNarrow;
}
