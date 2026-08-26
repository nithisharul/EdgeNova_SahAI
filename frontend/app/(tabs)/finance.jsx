import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import SahaiHeader from '../../components/SahaiHeader';
import MetricCard from '../../components/MetricCard';
import InfoCard from '../../components/InfoCard';
import TransactionCard from '../../components/TransactionCard';
import SectionHeader from '../../components/SectionHeader';
import SecondaryButton from '../../components/SecondaryButton';
import Colors from '../../constants/Colors';
import { Spacing, Radius, Typography } from '../../constants/Theme';
import { formatCurrency } from '../../utils/currency';
import { getFinanceSummary, getTransactions } from '../../services/financeService';

/** Finance features reachable from the dashboard. */
const ACTIONS = [
  {
    id: 'members',
    title: 'Members',
    description: 'View savings, loans and repayment status per member.',
    icon: 'people',
    route: '/members',
  },
  {
    id: 'savings',
    title: 'Savings',
    description: 'Track group savings and record new deposits.',
    icon: 'trending-up',
    route: '/savings',
  },
  {
    id: 'transactions',
    title: 'Transactions',
    description: 'Every deposit, disbursement, repayment and expense.',
    icon: 'swap-horizontal',
    route: '/transactions',
  },
  {
    id: 'loans',
    title: 'Loans',
    description: 'Outstanding loans and repayment progress.',
    icon: 'cash',
    route: '/loans',
  },
  {
    id: 'loan-risk',
    title: 'Loan Risk Assessment',
    description: 'Evaluate repayment risk before approving a loan.',
    icon: 'shield-checkmark',
    route: '/loan-risk',
  },
  {
    id: 'ledger',
    title: 'Secure Ledger',
    description: 'Check that every group record is intact and untampered.',
    icon: 'lock-closed',
    route: '/ledger',
  },
];

export default function FinanceScreen() {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [summaryData, transactionsData] = await Promise.all([
        getFinanceSummary(),
        getTransactions(),
      ]);
      setSummary(summaryData);
      setRecent(transactionsData.slice(0, 3));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  // Reload whenever the tab regains focus so demo edits show up.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const go = (route) => router.push(route);

  return (
    <View style={styles.screen}>
      <SahaiHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <View style={styles.intro}>
            <Text style={styles.title}>SHG Finance</Text>
            <Text style={styles.subtitle}>
              Manage your group&apos;s savings, members and lending activity.
            </Text>
          </View>

          {status === 'loading' && (
            <View style={styles.stateBox}>
              <ActivityIndicator color={Colors.secondary} />
              <Text style={styles.stateText}>Loading finance summary...</Text>
            </View>
          )}

          {status === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Unable to load finance information. Please try again.
              </Text>
              <SecondaryButton label="Retry" icon="refresh" onPress={load} />
            </View>
          )}

          {status === 'ready' && !!summary && (
            <>
              <View style={styles.metricRow}>
                <MetricCard
                  label="Total Savings"
                  value={formatCurrency(summary.totalSavings)}
                  caption="Group balance"
                  icon="wallet"
                  delta={summary.savingsDelta}
                  style={styles.metricCell}
                />
                <MetricCard
                  label="Available"
                  value={formatCurrency(summary.availableBalance)}
                  caption="Ready to lend"
                  icon="cash"
                  style={styles.metricCell}
                />
              </View>

              <View style={styles.metricRow}>
                <MetricCard
                  label="Active Loans"
                  value={formatCurrency(summary.outstandingLoans)}
                  caption="Outstanding"
                  icon="cash"
                  onPress={() => go('/loans')}
                  style={styles.metricCell}
                />
                <MetricCard
                  label="Members"
                  value={String(summary.activeMembers)}
                  caption="Active in group"
                  icon="people"
                  onPress={() => go('/members')}
                  style={styles.metricCell}
                />
              </View>

              <View style={styles.section}>
                <SectionHeader title="Manage" caption="Group finance tools" />
                {ACTIONS.map((action) => (
                  <InfoCard
                    key={action.id}
                    title={action.title}
                    description={action.description}
                    icon={action.icon}
                    onPress={() => go(action.route)}
                  />
                ))}
              </View>

              <View style={styles.section}>
                <SectionHeader
                  title="Recent Activity"
                  caption="Latest group finance records"
                  actionLabel="View all"
                  onActionPress={() => go('/transactions')}
                />
                {recent.map((txn) => (
                  <TransactionCard
                    key={txn.id}
                    type={txn.type}
                    description={txn.description}
                    member={txn.member}
                    amount={txn.amount}
                    date={txn.date}
                  />
                ))}
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
    maxWidth: 720,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  intro: {
    gap: Spacing.xs,
  },
  title: {
    ...Typography.heading,
    color: Colors.primary,
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
  },
  metricCell: {
    flex: 1,
  },
  section: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
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
