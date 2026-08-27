import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import SahaiHeader from '../components/SahaiHeader';
import MetricCard from '../components/MetricCard';
import LoanCard from '../components/LoanCard';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import SectionHeader from '../components/SectionHeader';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import { getLoans } from '../services/financeService';

export default function LoansScreen() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setData(await getLoans());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.screen}>
      <SahaiHeader title="Loans" subtitle="Finance" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {status === 'loading' && (
            <View style={styles.stateBox}>
              <ActivityIndicator color={Colors.secondary} />
              <Text style={styles.stateText}>Loading loan information...</Text>
            </View>
          )}

          {status === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Unable to load loan information. Please try again.
              </Text>
              <SecondaryButton label="Retry" icon="refresh" onPress={load} />
            </View>
          )}

          {status === 'ready' && !!data && (
            <>
              <View style={styles.metricRow}>
                <MetricCard
                  label="Outstanding"
                  value={formatCurrency(data.summary.outstandingTotal)}
                  caption="Across the group"
                  icon="cash"
                  style={styles.metricCell}
                />
                <MetricCard
                  label="Active Loans"
                  value={String(data.summary.activeCount)}
                  caption="Currently running"
                  icon="people"
                  style={styles.metricCell}
                />
              </View>

              {/* The ledger records repayments, not a repayment schedule, so
                  "due this month" cannot be derived from it. What has actually
                  been repaid can be, and is a real figure. */}
              <MetricCard
                label="Repaid So Far"
                value={formatCurrency(data.summary.totalRepaid)}
                caption="Across all active loans"
                icon="trending-up"
              />

              <PrimaryButton
                label="Assess New Loan"
                icon="shield-checkmark"
                onPress={() => router.push('/loan-risk')}
              />

              <View style={styles.section}>
                <SectionHeader title="Active Loans" caption="Repayment progress by member" />
                {data.loans.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>No active loans.</Text>
                    <Text style={styles.emptyBody}>
                      Assess a new loan to start lending from the group fund.
                    </Text>
                  </View>
                ) : (
                  data.loans.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      onPress={() => router.push(`/member-details?id=${loan.memberId}`)}
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
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  inner: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
  },
  metricCell: { flex: 1 },
  section: { gap: Spacing.md, marginTop: Spacing.sm },
  stateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  stateText: { ...Typography.bodySmall },
  errorBox: {
    gap: Spacing.md,
    backgroundColor: Colors.errorSoft,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  errorText: { ...Typography.bodySmall, color: Colors.error },
  emptyBox: {
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: { ...Typography.subtitle },
  emptyBody: { ...Typography.bodySmall, textAlign: 'center' },
});
