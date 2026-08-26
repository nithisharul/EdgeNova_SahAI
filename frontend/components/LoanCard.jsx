import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography, Shadow } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import StatusBadge from './StatusBadge';

/** Repayment status drives the badge colour, matching MemberCard. */
const STATUS_TONES = {
  'On Track': 'success',
  Delayed: 'warning',
  Overdue: 'error',
  Closed: 'neutral',
};

/**
 * One active loan in the group's loan book: who holds it, how much is left
 * and whether repayments are on schedule.
 */
export default function LoanCard({ loan, onPress, style }) {
  const {
    member,
    principal = 0,
    remaining = 0,
    durationMonths,
    status,
    purpose,
  } = loan || {};

  const tone = STATUS_TONES[status] || 'neutral';
  const repaidRatio = principal > 0 ? Math.min(1, (principal - remaining) / principal) : 0;

  const body = (
    <>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.member} numberOfLines={1}>
            {member}
          </Text>
          {!!purpose && (
            <Text style={styles.purpose} numberOfLines={1}>
              {purpose}
              {durationMonths ? ` \u00B7 ${durationMonths} months` : ''}
            </Text>
          )}
        </View>
        {!!status && <StatusBadge label={status} tone={tone} size="sm" />}
      </View>

      <View style={styles.figures}>
        <View style={styles.figure}>
          <Text style={styles.figureLabel}>Loan Amount</Text>
          <Text style={styles.figureValue}>{formatCurrency(principal)}</Text>
        </View>
        <View style={styles.figure}>
          <Text style={styles.figureLabel}>Remaining</Text>
          <Text style={[styles.figureValue, styles.remaining]}>{formatCurrency(remaining)}</Text>
        </View>
      </View>

      {/* Repaid-so-far bar; purely a read-out of the two figures above. */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(repaidRatio * 100)}%` }]} />
      </View>
      <Text style={styles.trackCaption}>
        {formatCurrency(principal - remaining)} repaid of {formatCurrency(principal)}
      </Text>

      {!!onPress && (
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>View member</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.secondary} />
        </View>
      )}
    </>
  );

  if (!onPress) {
    return <View style={[styles.card, style]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${member}, ${formatCurrency(remaining)} remaining`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
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
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  member: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.text,
  },
  purpose: {
    ...Typography.caption,
  },
  figures: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.xs,
  },
  figure: {
    gap: 2,
  },
  figureLabel: {
    ...Typography.caption,
  },
  figureValue: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: Colors.text,
  },
  remaining: {
    color: Colors.primary,
  },
  track: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
  },
  trackCaption: {
    ...Typography.caption,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    marginTop: Spacing.xs,
  },
  footerLabel: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.secondary,
  },
  pressed: {
    opacity: 0.7,
  },
});
