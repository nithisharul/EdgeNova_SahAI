import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography, CardBase, Shadow } from '../constants/Theme';

/**
 * Dashboard tile: small label on top, large value below.
 *
 * `delta` renders the little green chip used for week-on-week movement.
 * `size="large"` is for the full width hero tile, "small" for grid pairs.
 */
export default function MetricCard({
  label,
  value,
  caption,
  domain,
  delta,
  deltaTone = 'success',
  icon,
  size = 'small',
  onPress,
  style,
}) {
  const isLarge = size === 'large';

  const body = (
    <>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {!!icon && <Ionicons name={icon} size={18} color={Colors.accent} />}
      </View>

      {!!domain && <Text style={styles.domain}>{domain}</Text>}

      <View style={isLarge ? styles.valueRowLarge : styles.valueColumn}>
        <Text style={isLarge ? styles.valueLarge : styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {!!delta && (
          <View style={[styles.deltaChip, deltaTone === 'error' && styles.deltaChipError]}>
            <Text style={[styles.deltaText, deltaTone === 'error' && styles.deltaTextError]}>
              {delta}
            </Text>
          </View>
        )}
      </View>

      {!!caption && <Text style={styles.caption}>{caption}</Text>}
    </>
  );

  if (!onPress) {
    return <View style={[styles.card, style]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...CardBase,
    ...Shadow.card,
    gap: Spacing.sm,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  label: {
    ...Typography.sectionLabel,
    flexShrink: 1,
  },
  valueColumn: {
    gap: Spacing.xs,
  },
  valueRowLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  value: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.4,
  },
  valueLarge: {
    fontSize: FontSize.display,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -1,
  },
  deltaChip: {
    backgroundColor: Colors.successSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  deltaChipError: {
    backgroundColor: Colors.errorSoft,
  },
  deltaText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.success,
  },
  deltaTextError: {
    color: Colors.error,
  },
  caption: {
    ...Typography.caption,
  },
  /** Marks a tile as belonging to the field side or the fund side. */
  domain: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: -Spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
});
