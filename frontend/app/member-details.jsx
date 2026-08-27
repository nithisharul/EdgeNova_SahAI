import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import SahaiHeader from '../components/SahaiHeader';
import StatusBadge from '../components/StatusBadge';
import SecondaryButton from '../components/SecondaryButton';
import SectionHeader from '../components/SectionHeader';
import TransactionCard from '../components/TransactionCard';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, CardBase, Shadow, FontSize } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/datetime';
import { getMemberById } from '../services/memberService';

/** Repayment status tones, matching MemberCard. */
const STATUS_TONES = {
  'On Track': 'success',
  Delayed: 'warning',
  Overdue: 'error',
};

/** One label/value pair in the profile grid. */
function DetailRow({ label, value, emphasis }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, emphasis && styles.detailValueStrong]}>{value}</Text>
    </View>
  );
}

export default function MemberDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [member, setMember] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setMember(await getMemberById(id));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // The member's own rows out of the group ledger.
  const memberTransactions = member
    ? (member.history || []).slice(0, 3)
    : [];

  return (
    <View style={styles.screen}>
      <SahaiHeader title={member?.name || 'Member'} subtitle="Member profile" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {status === 'loading' && (
            <View style={styles.stateBox}>
              <ActivityIndicator color={Colors.secondary} />
              <Text style={styles.stateText}>Loading member...</Text>
            </View>
          )}

          {status === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Unable to load this member. Please try again.
              </Text>
              <SecondaryButton label="Retry" icon="refresh" onPress={load} />
            </View>
          )}

          {status === 'ready' && !!member && (
            <>
              <View style={styles.profileCard}>
                <View style={styles.profileHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {member.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.profileText}>
                    <Text style={styles.name}>{member.name}</Text>
                    <Text style={styles.village}>{member.village}</Text>
                  </View>
                  {!!member.repaymentStatus && (
                    <StatusBadge
                      label={member.repaymentStatus}
                      tone={STATUS_TONES[member.repaymentStatus] || 'neutral'}
                      size="sm"
                    />
                  )}
                </View>

                <View style={styles.detailGrid}>
                  <DetailRow label="Member ID" value={member.id} />
                  <DetailRow label="Village" value={member.village} />
                  <DetailRow label="Phone" value={member.phone} />
                  <DetailRow label="Joined" value={formatDate(member.joinedAt)} />
                  <DetailRow
                    label="Total Savings"
                    value={formatCurrency(member.savings)}
                    emphasis
                  />
                  <DetailRow
                    label="Outstanding Loan"
                    value={
                      member.outstandingLoan > 0
                        ? formatCurrency(member.outstandingLoan)
                        : 'None'
                    }
                    emphasis
                  />
                </View>
              </View>

              <View style={styles.section}>
                <SectionHeader title="Savings History" />
                {(member.savingsHistory || []).length === 0 ? (
                  <Text style={styles.emptyLine}>No savings records yet.</Text>
                ) : (
                  <View style={styles.listCard}>
                    {member.savingsHistory.map((entry) => (
                      <View key={entry.id} style={styles.listRow}>
                        <View style={styles.listText}>
                          <Text style={styles.listLabel}>{entry.label}</Text>
                          <Text style={styles.listMeta}>{entry.date}</Text>
                        </View>
                        <Text style={styles.listAmountIn}>
                          {formatCurrency(entry.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <SectionHeader title="Loan History" />
                {(member.loanHistory || []).length === 0 ? (
                  <Text style={styles.emptyLine}>No active loans.</Text>
                ) : (
                  <View style={styles.listCard}>
                    {member.loanHistory.map((entry) => (
                      <View key={entry.id} style={styles.listRow}>
                        <View style={styles.listText}>
                          <Text style={styles.listLabel}>{entry.label}</Text>
                          <Text style={styles.listMeta}>{entry.date}</Text>
                        </View>
                        <View style={styles.listRight}>
                          <Text style={styles.listAmount}>{formatCurrency(entry.amount)}</Text>
                          <StatusBadge
                            label={entry.status}
                            tone={STATUS_TONES[entry.status] || 'neutral'}
                            size="sm"
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <SectionHeader title="Recent Transactions" />
                {memberTransactions.length === 0 ? (
                  <Text style={styles.emptyLine}>No transactions for this member yet.</Text>
                ) : (
                  memberTransactions.map((txn) => (
                    <TransactionCard
                      key={txn.id}
                      type={txn.type}
                      description={txn.description}
                      member={txn.member}
                      amount={txn.amount}
                      date={txn.date}
                    />
                  ))
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  inner: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  profileCard: {
    ...CardBase,
    ...Shadow.card,
    gap: Spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: Colors.secondary,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    ...Typography.title,
    fontSize: FontSize.subtitle,
  },
  village: {
    ...Typography.caption,
  },
  detailGrid: {
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  detailLabel: {
    ...Typography.bodySmall,
  },
  detailValue: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  detailValueStrong: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.primary,
  },
  section: {
    gap: Spacing.md,
  },
  listCard: {
    ...CardBase,
    ...Shadow.card,
    gap: Spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  listText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  listLabel: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.text,
  },
  listMeta: {
    ...Typography.caption,
  },
  listRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  listAmount: {
    fontSize: FontSize.small,
    fontWeight: '700',
    color: Colors.text,
  },
  listAmountIn: {
    fontSize: FontSize.small,
    fontWeight: '700',
    color: Colors.success,
  },
  emptyLine: {
    ...Typography.bodySmall,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    textAlign: 'center',
  },
  stateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  stateText: {
    ...Typography.bodySmall,
  },
  errorBox: {
    gap: Spacing.md,
    backgroundColor: Colors.errorSoft,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
  },
});
