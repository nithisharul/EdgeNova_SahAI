import { Platform } from 'react-native';
import Colors from './Colors';

/** 8px rhythmic spacing scale used across the app. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

/** Cards use the larger radii, buttons and inputs the smaller ones. */
export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
};

export const FontSize = {
  caption: 12,
  small: 14,
  body: 16,
  subtitle: 18,
  title: 22,
  heading: 28,
  display: 36,
};

/**
 * Shadows should read as a soft diffusion of light, never a harsh drop shadow.
 * Android only supports elevation, so both are provided.
 */
export const Shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#102D1B',
      shadowOpacity: 0.07,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {
      boxShadow: '0px 4px 16px rgba(16, 45, 27, 0.07)',
    },
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#102D1B',
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 6 },
    default: {
      boxShadow: '0px 8px 22px rgba(16, 45, 27, 0.16)',
    },
  }),
};

/** Reusable text styles so headings stay consistent between screens. */
export const Typography = {
  display: {
    fontSize: FontSize.display,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.8,
  },
  heading: {
    fontSize: FontSize.heading,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '600',
    color: Colors.text,
  },
  body: {
    fontSize: FontSize.body,
    fontWeight: '400',
    color: Colors.text,
  },
  bodySmall: {
    fontSize: FontSize.small,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  label: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: FontSize.caption,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  /** Uppercase section label used above data groups. */
  sectionLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
};

/** Base card surface reused by most components. */
export const CardBase = {
  backgroundColor: Colors.card,
  borderRadius: Radius.xl,
  borderWidth: 1,
  borderColor: Colors.border,
  padding: Spacing.lg,
};

export default { Spacing, Radius, FontSize, Shadow, Typography, CardBase };
