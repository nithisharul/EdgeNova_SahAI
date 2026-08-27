import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography, Shadow } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import StatusBadge from './StatusBadge';

/**
 * One row in a transaction list.
 *
 * The type drives the icon and whether the amount reads as money in or out,
 * so callers only pass the raw positive amount plus a type.
 */
const TYPES = {
  savings: { icon: 'arrow-down-circle', label: 'Savings Deposit', incoming: true },
  disbursement: { icon: 'arrow-up-circle', label: 'Loan Disbursement', incoming: false },
  repayment: { icon: 'refresh-circle', label: 'Loan Repayment', incoming: true },
  expense: { icon: 'receipt', label: 'Group Expense', incoming: false },
};

export default function TransactionCard({
  type = 'savings',
  amount,
  member,
  date,
  status,
  statusTone = 'success',
  description,
  onPress,
  style,
}) {
  const meta = TYPES[type] || TYPES.savings;
  const signedAmount = meta.incoming ? Math.abs(amount) : -Math.abs(amount);

  const body = (
    <>
      <View style={[styles.iconWrap, meta.incoming ? styles.iconIn : styles.iconOut]}>
        <Ionicons
          name={meta.icon}
          size={20}
          color={meta.incoming ? Colors.success : Colors.error}
        />
      </View>

      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {description || meta.label}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[member, date].filter(Boolean).join(' \u00B7 ')}
        </Text>
        {!!status && <StatusBadge label={status} tone={statusTone} style={styles.badge} />}
      </View>

      <Text style={[styles.amount, meta.incoming ? styles.amountIn : styles.amountOut]}>
        {formatCurrency(signedAmount, { showSign: true })}
      </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.card,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconIn: {
    backgroundColor: Colors.successSoft,
  },
  iconOut: {
    backgroundColor: Colors.errorSoft,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.text,
  },
  meta: {
    ...Typography.caption,
  },
  badge: {
    marginTop: Spacing.xs,
  },
  amount: {
    fontSize: FontSize.small,
    fontWeight: '700',
  },
  amountIn: {
    color: Colors.success,
  },
  amountOut: {
    color: Colors.error,
  },
  pressed: {
    opacity: 0.7,
  },
});
