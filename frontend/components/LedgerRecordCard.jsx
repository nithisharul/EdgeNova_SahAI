import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography, Shadow } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import { formatDateTime } from '../utils/datetime';
import StatusBadge from './StatusBadge';

/**
 * One entry in the secure ledger list.
 *
 * Ledger-specific on purpose: it carries the record number and the integrity
 * result alongside the money, and turns red when the backend reports that a
 * record failed verification. Hashes are deliberately left off this card --
 * they live on the record detail screen where there is room for them.
 */
const KINDS = {
  savings: { icon: 'arrow-down-circle', incoming: true },
  disbursement: { icon: 'arrow-up-circle', incoming: false },
  repayment: { icon: 'refresh-circle', incoming: true },
  expense: { icon: 'receipt', incoming: false },
};

export default function LedgerRecordCard({ record, onPress, style }) {
  const { id, memberName, type, amount, timestamp, verified, kind, direction } = record;
  const meta = KINDS[kind] || KINDS.savings;
  const incoming = direction ? direction === 'in' : meta.incoming;
  const signedAmount = incoming ? Math.abs(amount) : -Math.abs(amount);

  const body = (
    <>
      <View style={styles.row}>
        <View style={[styles.iconWrap, incoming ? styles.iconIn : styles.iconOut]}>
          <Ionicons
            name={meta.icon}
            size={20}
            color={incoming ? Colors.success : Colors.error}
          />
        </View>

        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={1}>
            {type}
          </Text>
          <Text style={styles.member} numberOfLines={1}>
            {memberName}
          </Text>
        </View>

        <Text
          style={[styles.amount, incoming ? styles.amountIn : styles.amountOut]}
          numberOfLines={1}
        >
          {formatCurrency(signedAmount, { showSign: true })}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.timestamp} numberOfLines={1}>
          {formatDateTime(timestamp)}
        </Text>
        <View style={styles.footerRight}>
          <Text style={styles.recordId}>{id}</Text>
          <StatusBadge
            label={verified ? 'Verified' : 'Failed check'}
            tone={verified ? 'success' : 'error'}
            icon={verified ? 'checkmark-circle' : 'warning'}
            size="sm"
          />
        </View>
      </View>
    </>
  );

  if (!onPress) {
    return <View style={[styles.card, !verified && styles.cardFailed, style]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${type}, ${memberName}, ${formatCurrency(Math.abs(amount))}, record ${id}, ${
        verified ? 'verified' : 'failed integrity check'
      }`}
      style={({ pressed }) => [
        styles.card,
        !verified && styles.cardFailed,
        pressed && styles.pressed,
        style,
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  cardFailed: {
    borderColor: Colors.error,
    borderLeftColor: Colors.error,
    backgroundColor: Colors.errorSoft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.text,
  },
  member: {
    ...Typography.caption,
  },
  amount: {
    fontSize: FontSize.small,
    fontWeight: '700',
    flexShrink: 0,
  },
  amountIn: {
    color: Colors.success,
  },
  amountOut: {
    color: Colors.error,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timestamp: {
    ...Typography.caption,
    flexShrink: 1,
  },
  recordId: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
