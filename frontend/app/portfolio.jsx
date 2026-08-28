import { useCallback, useState } from 'react';
import { Animated, View, Text, StyleSheet, ScrollView } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../components/SahaiHeader';
import Backdrop from '../components/Backdrop';
import Metric from '../components/Metric';
import DataRow from '../components/DataRow';
import PrimaryButton from '../components/PrimaryButton';
import ErrorNotice from '../components/ErrorNotice';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, Motion } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/datetime';
import { useBreakpoint } from '../utils/layout';
import { useReveal } from '../utils/motion';
import { useAuth } from '../contexts/AuthContext';
import { getPortfolio } from '../services/portfolioService';
import { ENTRY_TYPE_LABELS } from '../services/ledgerService';

/**
 * My Portfolio -- a digital passbook.
 *
 * Deliberately built to read like the paper book it replaces: a balance at the
 * top, then dated entries on ruled lines. Three identical white tiles would
 * have said savings, loan and net position are equally important; the balance
 * is what she came to see, so it is set at hero size and the other two sit
 * beneath it as supporting figures.
 *
 * Every number is summed server-side from hash-chained ledger rows, so the
 * passbook and the ledger cannot disagree.
 *
 * WHAT IS DELIBERATELY MISSING: no phone, village, join date, loan purpose,
 * term or repayment status. The backend stores none of them.
 */
export default function PortfolioScreen() {
  const { memberId: sessionMemberId, signedIn, isTreasurer } = useAuth();
  const { isDesktop, maxWidth } = useBreakpoint();
  const params = useLocalSearchParams();

  const requestedId = typeof params.memberId === 'string' ? params.memberId : null;
  const targetId = isTreasurer && requestedId ? requestedId : sessionMemberId;
  const viewingOther = targetId !== sessionMemberId;

  const [portfolio, setPortfolio] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!signedIn || !targetId) return;
    setStatus('loading');
    setError(null);
    try {
      setPortfolio(await getPortfolio(targetId));
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [signedIn, targetId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const reveal = useReveal(status === 'ready');

  if (!signedIn) {
    return (
      <View style={styles.screen}>
        <SahaiHeader title="My Portfolio" subtitle="Fund" showBack />
        <View style={styles.gate}>
          <EmptyState
            icon="lock-closed-outline"
            title="Log in to see your savings"
            body="Your deposits and loans are private to your account."
          />
          <PrimaryButton label="Log in" icon="log-in-outline" onPress={() => router.push('/login')} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SahaiHeader
        title={viewingOther ? 'Member Portfolio' : 'My Portfolio'}
        subtitle="Fund"
        showBack
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, { maxWidth: maxWidth('content') }]}>
          {viewingOther && (
            <View style={styles.viewingStrip}>
              <Ionicons name="eye-outline" size={15} color={Colors.info} />
              <Text style={styles.viewingText}>Viewing {targetId} as treasurer</Text>
            </View>
          )}

          {status === 'loading' && (
            <LoadingState message="Opening your passbook..." rows={3} />
          )}
          {status === 'error' && <ErrorNotice error={error} onRetry={load} />}

          {status === 'ready' && !!portfolio && (
            <Animated.View style={[styles.body, reveal]}>
              {/* Balance block: ruled like a passbook page. */}
              <View style={styles.balanceBlock}>
                <Backdrop variant="fund" height={190} lines={6} />
                <Metric
                  label={viewingOther ? `${targetId} · total savings` : 'Total savings'}
                  value={portfolio.totalSavings}
                  currency
                  animate
                  size="hero"
                  caption={
                    portfolio.depositCount === 1
                      ? '1 deposit recorded'
                      : `${portfolio.depositCount} deposits recorded`
                  }
                />

                <View style={styles.balanceSplit}>
                  <Metric
                    label="Loan outstanding"
                    value={portfolio.outstandingLoan}
                    currency
                    size="small"
                    tone={portfolio.outstandingLoan > 0 ? 'warning' : 'default'}
                    style={styles.balanceCell}
                  />
                  <View style={styles.balanceRule} />
                  <Metric
                    label="Net position"
                    value={portfolio.netPosition}
                    currency
                    size="small"
                    tone={portfolio.netPosition >= 0 ? 'positive' : 'warning'}
                    style={styles.balanceCell}
                  />
                </View>
              </View>

              {/* Entries on ruled lines, newest first. */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Recent activity</Text>

                {portfolio.history.length === 0 ? (
                  <EmptyState
                    icon="document-text-outline"
                    title="No transactions recorded yet"
                    body="Once your treasurer records a deposit, it appears here."
                  />
                ) : (
                  <View style={styles.ledger}>
                    {portfolio.history.map((entry, index) => (
                      <DataRow
                        key={entry.id}
                        title={ENTRY_TYPE_LABELS[entry.entryType] || entry.entryType}
                        subtitle={formatDate(entry.date)}
                        amount={formatCurrency(entry.amount)}
                        // Direction comes from the entry type. Backend amounts
                        // are always positive, so reading the sign would show
                        // every disbursement as money coming in.
                        direction={entry.entryType === 'loan_repayment' ? 'out' : 'in'}
                        meta={`#${entry.id}`}
                        last={index === portfolio.history.length - 1}
                      />
                    ))}
                  </View>
                )}
              </View>

              {!viewingOther && (
                <PrimaryButton
                  label="Request a loan"
                  onPress={() => router.push('/request-loan')}
                />
              )}
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
  gate: { flex: 1, justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },

  viewingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.infoSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  viewingText: { ...Typography.caption, color: Colors.info, flex: 1 },

  balanceBlock: {
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
    overflow: 'hidden',
  },
  balanceSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  balanceCell: { flex: 1 },
  balanceRule: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.border },

  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.sectionLabel },
  ledger: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
