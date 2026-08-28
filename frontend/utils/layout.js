import { useWindowDimensions } from 'react-native';
import { Layout } from '../constants/Theme';

/**
 * Where we are on the size spectrum.
 *
 * Expo Web is a real website, not a phone screenshot pinned to the middle of a
 * 1440px monitor. Screens use `isDesktop` to switch from one column to two, and
 * `maxWidth` to pick a sensible reading measure instead of stretching a form
 * across the full window.
 */
export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= Layout.breakpoint;

  return {
    width,
    height,
    isDesktop,
    isCompact: width < 420,
    /** Pick the right measure for the kind of content on screen. */
    maxWidth: (kind = 'content') => {
      if (!isDesktop) return '100%';
      if (kind === 'narrow') return Layout.narrow;
      if (kind === 'wide') return Layout.wide;
      return Layout.content;
    },
  };
}

export default { useBreakpoint };
