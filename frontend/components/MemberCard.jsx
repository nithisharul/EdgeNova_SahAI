import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography, Shadow } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import StatusBadge from './StatusBadge';

/** Maps a repayment status to the badge colour. */
const REPAYMENT_TONES = {
  'On Track': 'success',
  Delayed: 'warning',
  Overdue: 'error',
};

/** Builds the two letter avatar, e.g. "Asha Devi" -> "AD". */
function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function MemberCard({ member, onPress, style }) {
  const { name, savings = 0, loan = 0, repaymentStatus, village } = member || {};
  const tone = REPAYMENT_TONES[repaymentStatus] || 'neutral';

  const body = (
    <>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(name)}</Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {!!village && (
          <Text style={styles.village} numberOfLines={1}>
            {village}
          </Text>
        )}

        <View style={styles.figures}>
          <Text style={styles.figure}>
            Savings <Text style={styles.figureValue}>{formatCurrency(savings)}</Text>
          </Text>
          <Text style={styles.figure}>
            Loan <Text style={styles.figureValue}>{formatCurrency(loan)}</Text>
          </Text>
        </View>

        {!!repaymentStatus && (
          <StatusBadge label={repaymentStatus} tone={tone} style={styles.badge} />
        )}
      </View>

      {!!onPress && <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />}
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.secondary,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.text,
  },
  village: {
    ...Typography.caption,
  },
  figures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  figure: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  figureValue: {
    fontWeight: '700',
    color: Colors.text,
  },
  badge: {
    marginTop: Spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
