import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../components/SahaiHeader';
import SectionHeader from '../components/SectionHeader';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import Colors from '../constants/Colors';
import { Spacing, Typography, CardBase, Shadow, FontSize } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import SecondaryButton from '../components/SecondaryButton';
import { getPerformanceReport } from '../services/reportService';

/**
 * Performance report.
 *
 * The point of this screen is the pairing: the same period read from the
 * field side and the fund side. It computes nothing -- every figure comes
 * from services/reportService.js, which derives it from the ledger.
 *
 * The field half is thinner than the fund half on purpose. The backend has no
 * farm-health survey and no land register, so those cards are absent rather
 * than filled with numbers nobody measured.
 */
/**
 * The "what this means" lines.
 *
 * Each one restates a figure already on this page, so a highlight can never
 * contradict the card above it. Lines whose data is missing are not produced.
 */
function buildHighlights(data) {
  const lines = [];

  if (data.fund.availableBalance > 0) {
    lines.push({
      id: 'available',
      text: `${formatCurrency(data.fund.availableBalance)} is available to lend today.`,
      route: '/loans',
    });
  }
  if (data.fund.savingsThisMonth > 0) {
    lines.push({
      id: 'month',
      text: `${formatCurrency(data.fund.savingsThisMonth)} was saved this month.`,
      route: '/savings',
    });
  }
  if (data.fund.repaymentHealth > 0) {
    lines.push({
      id: 'repayment',
      text: `${data.fund.repaymentHealth}% of lent principal has been repaid.`,
      route: '/loans',
    });
  }
  if (data.fund.ledgerVerified != null) {
    lines.push({
      id: 'ledger',
      text: data.fund.ledgerVerified
        ? `All ${data.fund.ledgerTotal} ledger entries verify against their hashes.`
        : 'The ledger chain does not verify -- review it before the meeting.',
      route: '/ledger',
    });
  }

  return lines;
}

export default function ReportsScreen() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setData(await getPerformanceReport());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const trend = data?.savingsTrend ?? [];
  const peakDeposit = trend.length
    ? Math.max(...trend.map((entry) => entry.amount))
    : 0;

  return (
    <View style={styles.screen}>
      <SahaiHeader title="Performance Report" subtitle="Field + Fund" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {status === 'loading' && (
            <View style={styles.stateBox}>
              <ActivityIndicator color={Colors.secondary} />
              <Text style={styles.stateText}>Building your report...</Text>
            </View>
          )}

          {status === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Unable to build the report right now. Please try again.
              </Text>
              <SecondaryButton label="Retry" icon="refresh" onPress={load} />
            </View>
          )}

          {status === 'ready' && !!data && (
            <>
          {/* Period ----------------------------------------------------- */}
          <View style={styles.periodCard}>
            <View style={styles.periodText}>
              <Text style={styles.periodLabel}>Group Performance</Text>
              <Text style={styles.periodValue}>
                {trend.length ? trend[trend.length - 1].month : 'No deposits yet'}
              </Text>
              <Text style={styles.periodCaption}>
                {data.fund.activeMembers} members · {data.fund.ledgerTotal} ledger entries
              </Text>
            </View>
            <StatusBadge
              label={`${trend.length} month${trend.length === 1 ? '' : 's'}`}
              tone="accent"
              icon="calendar-outline"
            />
          </View>

          {/* Field ------------------------------------------------------ */}
          <View style={styles.section}>
            <SectionHeader title="Field" caption="Crop, inputs and land condition" />

            {/* Only the predictions actually run this session appear here.
                Farm health and monitored acreage have no backend source, so
                no card claims them. */}
            <View style={styles.metricRow}>
              <MetricCard
                domain="Field"
                label="Crop Match"
                value={data.field.crop ? `${data.field.crop.confidence}%` : '--'}
                caption={data.field.crop ? data.field.crop.name : 'Not run yet'}
                icon="leaf"
                onPress={() => router.push('/crop-recommendation')}
                style={styles.metricCell}
              />
              <MetricCard
                domain="Field"
                label="Fertilizer"
                value={data.field.fertilizer ? data.field.fertilizer.grade : '--'}
                caption={data.field.fertilizer ? 'Recommended grade' : 'Not run yet'}
                icon="flask"
                onPress={() => router.push('/fertilizer-advice')}
                style={styles.metricCell}
              />
            </View>

            {!data.field.crop && !data.field.fertilizer && (
              <Text style={styles.cardNote}>
                Run a crop or fertilizer recommendation and it will appear here.
              </Text>
            )}
          </View>

          {/* Fund ------------------------------------------------------- */}
          <View style={styles.section}>
            <SectionHeader title="Fund" caption="Savings, lending and records" />

            <View style={styles.metricRow}>
              <MetricCard
                domain="Fund"
                label="Total Savings"
                value={formatCurrency(data.fund.totalSavings)}
                caption={`${data.fund.activeMembers} members`}
                icon="wallet"
                onPress={() => router.push('/savings')}
                style={styles.metricCell}
              />
              <MetricCard
                domain="Fund"
                label="Active Loans"
                value={formatCurrency(data.fund.outstandingLoans)}
                caption={`Outstanding · ${data.fund.activeLoanCount} loans`}
                icon="cash"
                onPress={() => router.push('/loans')}
                style={styles.metricCell}
              />
            </View>

            <View style={styles.card}>
              <ProgressBar
                label="Repayment health"
                valueLabel={`${data.fund.repaymentHealth}%`}
                value={data.fund.repaymentHealth}
                tone="success"
                height={10}
              />
              <Text style={styles.cardNote}>
                Share of disbursed principal already repaid, across the ledger.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.ledgerRow}>
                <View style={styles.periodText}>
                  <Text style={styles.cardTitle}>Ledger Integrity</Text>
                  <Text style={styles.cardNote}>
                    {data.fund.ledgerChecked} of {data.fund.ledgerTotal} records checked
                  </Text>
                </View>
                <StatusBadge
                  label={data.fund.ledgerVerified ? 'Verified' : 'Tamper detected'}
                  tone={data.fund.ledgerVerified ? 'success' : 'error'}
                  icon="shield-checkmark"
                />
              </View>
            </View>
          </View>

          {/* Savings trend ---------------------------------------------- */}
          <View style={styles.section}>
            <SectionHeader title="Savings Growth" caption="Deposits recorded per month" />
            <View style={styles.card}>
              {trend.map((entry) => (
                <View key={entry.id} style={styles.trendRow}>
                  <Text style={styles.trendMonth}>{entry.month}</Text>
                  <ProgressBar
                    value={peakDeposit ? (entry.amount / peakDeposit) * 100 : 0}
                    tone="accent"
                    height={12}
                    style={styles.trendBar}
                  />
                  <Text style={styles.trendValue}>{formatCurrency(entry.amount)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Highlights ------------------------------------------------- */}
          <View style={styles.section}>
            <SectionHeader title="What This Means" caption="Tap a line to open the detail" />
            <View style={styles.card}>
              {buildHighlights(data).map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(item.route)}
                  accessibilityRole="button"
                  accessibilityLabel={item.text}
                  style={({ pressed }) => [
                    styles.highlightRow,
                    index < buildHighlights(data).length - 1 && styles.highlightDivider,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.highlightText}>{item.text}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={styles.demoNote}>
            Built from the group ledger. Exporting is not connected yet.
          </Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  stateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
  },
  stateText: { ...Typography.bodySmall },
  errorBox: {
    gap: Spacing.md,
    backgroundColor: Colors.errorSoft,
    borderRadius: 12,
    padding: Spacing.lg,
  },
  errorText: { ...Typography.bodySmall, color: Colors.error },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  inner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  periodCard: {
    ...CardBase,
    ...Shadow.card,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  periodText: { flex: 1, minWidth: 0, gap: 2 },
  periodLabel: { ...Typography.sectionLabel },
  periodValue: { ...Typography.title, color: Colors.primary },
  periodCaption: { ...Typography.bodySmall, marginTop: Spacing.xs },
  section: { gap: Spacing.md },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
  },
  metricCell: { flex: 1 },
  card: {
    ...CardBase,
    ...Shadow.card,
    gap: Spacing.sm,
  },
  cardTitle: { ...Typography.subtitle, fontSize: FontSize.body },
  cardNote: { ...Typography.caption },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  trendMonth: {
    width: 34,
    ...Typography.caption,
    fontWeight: '700',
  },
  trendBar: { flex: 1 },
  trendValue: {
    minWidth: 62,
    textAlign: 'right',
    fontSize: FontSize.small,
    fontWeight: '700',
    color: Colors.primary,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  highlightDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  highlightText: {
    ...Typography.bodySmall,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
  },
  demoNote: { ...Typography.caption, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
