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
  /** Section-to-section breathing room on editorial layouts. */
  section: 48,
};

/**
 * Radius hierarchy, smallest control to largest surface.
 *
 * The rule: the bigger the surface, the softer the corner. Using one radius
 * everywhere is what makes an interface read as generated -- every element
 * looks equally important because every element is shaped the same.
 *
 * `pill` is reserved for status and selection, NOT for buttons and headings.
 * See components/StatusBadge and components/SelectField.
 */
export const Radius = {
  sm: 8, // small controls, chips
  md: 10, // buttons
  input: 12, // text fields
  lg: 14,
  card: 16, // standard cards
  hero: 22, // hero panels, full-bleed sections
  pill: 999, // status only
};

export const FontSize = {
  caption: 12,
  small: 14,
  body: 16,
  subtitle: 18,
  title: 22,
  heading: 28,
  display: 36,
  /** Passbook/portfolio balances and the crop-match figure. */
  hero: 44,
};

/**
 * Motion.
 *
 * Durations are short on purpose. UI motion should read as the interface
 * settling, not as an effect being performed -- anything past ~350ms starts to
 * feel like waiting. `reveal` is for content arriving, `value` for a number
 * counting to a real figure, `state` for a badge or selection changing.
 */
export const Motion = {
  fast: 150,
  state: 220,
  reveal: 320,
  value: 900, // counting a balance up reads better slightly slower
  /** Stagger between siblings in a revealed list. */
  stagger: 60,
};

/**
 * Shadows should read as a soft diffusion of light, never a harsh drop shadow.
 * Android only supports elevation, so both are provided.
 */
export const Shadow = {
  /** Barely-there lift. Most surfaces need only this, or nothing at all. */
  subtle: Platform.select({
    ios: {
      shadowColor: '#102D1B',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 1 },
    default: { boxShadow: '0px 2px 10px rgba(16, 45, 27, 0.04)' },
  }),
  card: Platform.select({
    ios: {
      shadowColor: '#102D1B',
      shadowOpacity: 0.07,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: { boxShadow: '0px 4px 16px rgba(16, 45, 27, 0.07)' },
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#102D1B',
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 6 },
    default: { boxShadow: '0px 8px 22px rgba(16, 45, 27, 0.16)' },
  }),
};

/** Reusable text styles so headings stay consistent between screens. */
export const Typography = {
  hero: {
    fontSize: FontSize.hero,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -1.2,
  },
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
  /**
   * Step number on a sequenced form ("01 LOCATION"). Deliberately light --
   * it orders the page without competing with the step's own title.
   */
  stepNumber: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 1.6,
  },
};

/**
 * Base card surface.
 *
 * Reach for this LESS than feels natural. A card earns its place when it
 * groups things that belong together and separates them from things that do
 * not. A screen where everything is a card has told the reader nothing about
 * what matters -- prefer a plain section with a heading, or rows with hairline
 * separators, and keep the card for genuine containment.
 */
export const CardBase = {
  backgroundColor: Colors.card,
  borderRadius: Radius.card,
  borderWidth: 1,
  borderColor: Colors.border,
  padding: Spacing.lg,
};

/** A section that reads as part of the page rather than a floating object. */
export const SectionBase = {
  gap: Spacing.md,
};

/** Hairline used between rows in ledger, portfolio and member lists. */
export const Separator = {
  height: 1,
  backgroundColor: Colors.border,
};

/**
 * Layout widths.
 *
 * Desktop should not be a phone layout stranded in the middle of a 1440px
 * screen. `wide` is for list/ledger views that genuinely benefit from width,
 * `content` for reading and forms, `narrow` for a single focused task.
 */
export const Layout = {
  narrow: 480,
  content: 720,
  wide: 1080,
  /** Below this the app lays out in one column. */
  breakpoint: 900,
};

export default {
  Spacing,
  Radius,
  FontSize,
  Motion,
  Shadow,
  Typography,
  CardBase,
  SectionBase,
  Separator,
  Layout,
};
