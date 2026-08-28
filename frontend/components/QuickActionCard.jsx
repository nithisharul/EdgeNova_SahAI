import { Text, StyleSheet, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, CardBase, Shadow, FontSize } from '../constants/Theme';

/**
 * Tappable shortcut tile in the dashboard's Quick Actions grid.
 *
 * Always interactive, so it carries a clear affordance: a tinted icon chip,
 * a bold label and a trailing arrow. Tap target stays above 44pt.
 */

const TONES = {
  field: { fg: Colors.secondary, bg: Colors.accentSoft },
  fund: { fg: Colors.primary, bg: Colors.surfaceAlt },
  warning: { fg: Colors.warning, bg: Colors.warningSoft },
  info: { fg: Colors.info, bg: Colors.infoSoft },
};

export default function QuickActionCard({
  label,
  caption,
  icon = 'ellipse-outline',
  tone = 'field',
  onPress,
  style,
}) {
  const palette = TONES[tone] ?? TONES.field;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={caption ? `${label}. ${caption}` : label}
      style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconChip, { backgroundColor: palette.bg }]}>
          <Ionicons name={icon} size={20} color={palette.fg} />
        </View>
        <Ionicons name="arrow-forward" size={15} color={Colors.textMuted} />
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        {!!caption && (
          <Text style={styles.caption} numberOfLines={2}>
            {caption}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...CardBase,
    ...Shadow.card,
    flex: 1,
    minWidth: 0,
    minHeight: 118,
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    gap: 2,
  },
  label: {
    fontSize: FontSize.small,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  caption: {
    ...Typography.caption,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.985 }],
  },
});
