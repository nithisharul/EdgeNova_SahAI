import { useCallback, useState } from 'react';
import { Animated, View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../../components/SahaiHeader';
import Backdrop from '../../components/Backdrop';
import Metric from '../../components/Metric';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorNotice from '../../components/ErrorNotice';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import Colors from '../../constants/Colors';
import { Spacing, Radius, Typography } from '../../constants/Theme';
import { useBreakpoint } from '../../utils/layout';
import { useReveal } from '../../utils/motion';
import { useAuth } from '../../contexts/AuthContext';
import { getPortfolio } from '../../services/portfolioService';
import { useDataVersion } from '../../services/dataSync';

/**
 * Finance -- the Fund half, and the hub for everything role-gated.
 *
 * The action list is BUILT from role rather than filtered afterwards: a member
 * never renders Group Summary or Verify Ledger at all. Those calls would 403,
 * and a button that always fails teaches a user to distrust the app.
 *
 * Fund screens are ruled and aligned where Field screens are organic. Same
 * brand, different job.
 */

const MEMBER_ACTIONS = [
  {
    id: 'portfolio',
    label: 'My portfolio',
    caption: 'Savings, loans and full history',
    icon: 'wallet',
    route: '/portfolio',
  },
  {
    id: 'request-loan',
    label: 'Request a loan',
    caption: 'Screened against your own savings record',
    icon: 'document-text',
    route: '/request-loan',
  },
  {
    id: 'repayment',
    label: 'Record repayment',
    caption: 'Log a repayment on your loan',
    icon: 'arrow-undo',
    route: '/record-transaction',
  },
];

const TREASURER_ACTIONS = [
  {
    id: 'ledger',
    label: 'Verify ledger',
    caption: 'Confirm no record has been altered',
    icon: 'shield-checkmark',
    route: '/ledger',
    emphasis: true,
  },
  {
    id: 'record',
    label: 'Record transaction',
    caption: 'Deposits, disbursements and repayments',
    icon: 'create',
    route: '/record-transaction',
  },
  {
    id: 'group',
    label: 'Group summary',
    caption: 'Corpus, lending and members',
    icon: 'people',
    route: '/group-summary',
  },
];

function ActionList({ items }) {
  return (
    <View style={styles.list}>
      {items.map((action, index) => (
        <Pressable
          key={action.id}
          onPress={() => router.push(action.route)}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={({ pressed }) => [
            styles.row,
            index === items.length - 1 && styles.rowLast,
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.rowIcon, action.emphasis && styles.rowIconEmphasis]}>
            <Ionicons
              name={action.icon}
              size={18}
              color={action.emphasis ? Colors.textOnPrimary : Colors.secondary}
            />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{action.label}</Text>
            <Text style={styles.rowCaption}>{action.caption}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

export default function FinanceScreen() {
  const { signedIn, memberId, isTreasurer, restoring } = useAuth();
  const { maxWidth } = useBreakpoint();

  const [portfolio, setPortfolio] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!signedIn) {
      setPortfolio(null);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      setPortfolio(await getPortfolio(memberId));
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [signedIn, memberId]);

  // Re-reads when a write elsewhere changes server state, not only on focus.
  const dataVersion = useDataVersion();

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load, dataVersion])
  );

  const reveal = useReveal(status === 'ready' || !signedIn);

  if (!signedIn && !restoring) {
    return (
      <View style={styles.screen}>
        <SahaiHeader />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.inner, { maxWidth: maxWidth('content') }]}>
            <View style={styles.intro}>
              <Text style={styles.eyebrow}>Fund</Text>
              <Text style={styles.title}>Group finance</Text>
              <Text style={styles.subtitle}>
                Savings, loans and the group&apos;s records.
              </Text>
            </View>

            <EmptyState
              icon="lock-closed-outline"
              title="Log in to continue"
              body="Members see their savings and request loans. Treasurers record transactions and verify the ledger."
            />

            <PrimaryButton label="Log in" icon="log-in-outline" onPress={() => router.push('/login')} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SahaiHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, { maxWidth: maxWidth('content') }]}>
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>Fund</Text>
            <Text style={styles.title}>Group finance</Text>
          </View>

          {status === 'loading' && <LoadingState message="Loading your position..." rows={2} />}
          {status === 'error' && <ErrorNotice error={error} onRetry={load} />}

          {status === 'ready' && !!portfolio && (
            <Animated.View style={[styles.body, reveal]}>
              <View style={styles.balanceBlock}>
                <Backdrop variant="fund" height={140} lines={5} />
                <Metric
                  label="My savings"
                  value={portfolio.totalSavings}
                  currency
                  animate
                  onPress={() => router.push('/portfolio')}
                  caption={`${portfolio.depositCount} deposits`}
                />
                <View style={styles.balanceSide}>
                  <Metric
                    label="Loan outstanding"
                    value={portfolio.outstandingLoan}
                    currency
                    size="small"
                    tone={portfolio.outstandingLoan > 0 ? 'warning' : 'default'}
                  />
                </View>
              </View>

              {isTreasurer && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Treasurer</Text>
                  <ActionList items={TREASURER_ACTIONS} />
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Your money</Text>
                <ActionList items={MEMBER_ACTIONS} />
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.section },
  inner: { width: '100%', alignSelf: 'center', gap: Spacing.xl },
  body: { gap: Spacing.xl },

  intro: { gap: Spacing.xs },
  eyebrow: { ...Typography.sectionLabel, color: Colors.accent },
  title: { ...Typography.heading },
  subtitle: { ...Typography.bodySmall, lineHeight: 21 },

  balanceBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    paddingVertical: Spacing.lg,
    overflow: 'hidden',
  },
  balanceSide: { alignItems: 'flex-end' },

  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.sectionLabel },
  list: { borderTopWidth: 1, borderTopColor: Colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconEmphasis: { backgroundColor: Colors.secondary },
  rowText: { flex: 1, gap: 1 },
  rowLabel: { ...Typography.body, fontWeight: '600' },
  rowCaption: { ...Typography.caption },
  pressed: { opacity: 0.6 },
});
