import { Animated, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, FontSize, Typography } from '../constants/Theme';
import { useCountUp } from '../utils/motion';
import { formatCurrency } from '../utils/currency';

/**
 * A figure and what it means. No card.
 *
 * This is the deliberate replacement for wrapping every number in a white
 * rounded rectangle. Four identical cards in a 2x2 grid tell the reader that
 * all four numbers matter equally, which is almost never true. Here, size and
 * position carry the hierarchy instead: one `hero` figure leads, `small` ones
 * support it.
 *
 * `animate` counts the value up, but ONLY from a figure that has already
 * arrived from the backend -- it reveals a known number, it never stands in for
 * one still loading.
 */
export default function Metric({
  label,
  value,
  currency = false,
  caption,
  size = 'medium', // hero | medium | small
  tone = 'default', // default | positive | warning | inverse
  animate = false,
  icon,
  onPress,
  style,
}) {
  const numeric = typeof value === 'number';
  const counted = useCountUp(numeric ? value : 0, { enabled: animate && numeric });

  let shown = value;
  if (numeric) {
    const current = animate ? counted : value;
    shown = currency ? formatCurrency(Math.round(current)) : Math.round(current).toString();
  }

  const valueStyle = [
    styles.value,
    size === 'hero' && styles.valueHero,
    size === 'small' && styles.valueSmall,
    tone === 'positive' && { color: Colors.success },
    tone === 'warning' && { color: Colors.warning },
    tone === 'inverse' && { color: Colors.textOnPrimary },
  ];

  const body = (
    <View style={[styles.wrap, style]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, tone === 'inverse' && styles.labelInverse]}>{label}</Text>
        {!!icon && (
          <Ionicons
            name={icon}
            size={14}
            color={tone === 'inverse' ? Colors.accentSoft : Colors.textMuted}
          />
        )}
      </View>

      <Text style={valueStyle} numberOfLines={1} adjustsFontSizeToFit>
        {shown}
      </Text>

      {!!caption && (
        <Text style={[styles.caption, tone === 'inverse' && styles.captionInverse]}>
          {caption}
        </Text>
      )}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${shown}`}
      style={({ pressed }) => [pressed && styles.pressed, style]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    ...Typography.sectionLabel,
    fontSize: 11,
  },
  labelInverse: {
    color: Colors.accentSoft,
  },
  value: {
    fontSize: FontSize.display,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.8,
  },
  valueHero: {
    fontSize: FontSize.hero,
    letterSpacing: -1.4,
  },
  valueSmall: {
    fontSize: FontSize.title,
    letterSpacing: -0.3,
  },
  caption: {
    ...Typography.caption,
    marginTop: 2,
  },
  captionInverse: {
    color: Colors.accentSoft,
  },
  pressed: {
    opacity: 0.7,
  },
});
