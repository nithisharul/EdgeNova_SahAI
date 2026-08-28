import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, FontSize, Typography } from '../constants/Theme';

/**
 * One line in a passbook.
 *
 * The Fund half of the product is built from these rather than from cards: a
 * transaction list is a ledger, and a ledger is ruled lines, not a stack of
 * floating tiles. Rows share one container and one hairline rule, which is what
 * makes twenty of them scannable where twenty cards would not be.
 *
 * `amount` is rendered with an explicit sign taken from `direction`, never from
 * the number itself -- backend amounts are always positive and the direction
 * comes from the entry type.
 */
export default function DataRow({
  title,
  subtitle,
  meta,
  amount,
  direction, // 'in' | 'out' | undefined
  badge,
  onPress,
  highlighted = false,
  last = false,
  children,
}) {
  const body = (
    <View style={[styles.row, highlighted && styles.rowHighlighted, last && styles.rowLast]}>
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        {children}
      </View>

      <View style={styles.right}>
        {!!amount && (
          <Text
            style={[
              styles.amount,
              direction === 'in' && styles.amountIn,
              direction === 'out' && styles.amountOut,
            ]}
            numberOfLines={1}
          >
            {direction === 'in' ? '+ ' : direction === 'out' ? '- ' : ''}
            {amount}
          </Text>
        )}
        {!!meta && <Text style={styles.meta}>{meta}</Text>}
        {badge}
      </View>

      {!!onPress && (
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={styles.chev} />
      )}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => pressed && styles.pressed}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowHighlighted: {
    backgroundColor: Colors.errorSoft,
    borderBottomColor: Colors.error,
    paddingHorizontal: Spacing.md,
    marginHorizontal: -Spacing.md,
  },
  left: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.body,
    fontWeight: '600',
  },
  subtitle: {
    ...Typography.caption,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amount: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.text,
    // Tabular figures keep a column of rupee amounts aligned on the decimal.
    fontVariant: ['tabular-nums'],
  },
  amountIn: {
    color: Colors.success,
  },
  amountOut: {
    color: Colors.warning,
  },
  meta: {
    ...Typography.caption,
  },
  chev: {
    marginLeft: -Spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});
