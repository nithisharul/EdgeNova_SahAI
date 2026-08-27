import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize } from '../constants/Theme';

/**
 * Small pill used for repayment status, risk level, ledger integrity, etc.
 * Tone drives the colour so screens stay free of hardcoded hex values.
 */
const TONES = {
  success: { bg: Colors.successSoft, fg: Colors.success },
  warning: { bg: Colors.warningSoft, fg: Colors.warning },
  error: { bg: Colors.errorSoft, fg: Colors.error },
  info: { bg: Colors.infoSoft, fg: Colors.info },
  neutral: { bg: Colors.surfaceMuted, fg: Colors.textSecondary },
  accent: { bg: Colors.accentSoft, fg: Colors.secondary },
};

export default function StatusBadge({ label, tone = 'neutral', icon, size = 'md', style }) {
  const palette = TONES[tone] || TONES.neutral;
  const small = size === 'sm';

  return (
    <View style={[styles.badge, small && styles.badgeSmall, { backgroundColor: palette.bg }, style]}>
      {!!icon && <Ionicons name={icon} size={small ? 11 : 13} color={palette.fg} />}
      <Text style={[styles.label, small && styles.labelSmall, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 1,
    borderRadius: Radius.pill,
  },
  badgeSmall: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  label: {
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  labelSmall: {
    fontSize: 11,
  },
});
