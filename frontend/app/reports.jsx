import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../components/SahaiHeader';
import SectionHeader from '../components/SectionHeader';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import Colors from '../constants/Colors';
import { Spacing, Typography, CardBase, Shadow, FontSize } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import {
  reportPeriod,
  fieldReport,
  fundReport,
  savingsTrend,
  reportHighlights,
} from '../data/mockReportData';

/**
 * Monthly performance report.
 *
 * The point of this screen is the pairing: the same month read from the
 * field side and the fund side. It computes nothing -- every figure is
 * imported from the module that owns it, see data/mockReportData.js.
 */
export default function ReportsScreen() {
  const peakDeposit = Math.max(...savingsTrend.map((entry) => entry.amount));

  return (
    <View style={styles.screen}>
      <SahaiHeader title="Performance Report" subtitle="Field + Fund" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {/* Period ----------------------------------------------------- */}
          <View style={styles.periodCard}>
            <View style={styles.periodText}>
              <Text style={styles.periodLabel}>Monthly Performance</Text>
              <Text style={styles.periodValue}>{reportPeriod.label}</Text>
              <Text style={styles.periodCaption}>{reportPeriod.caption}</Text>
            </View>
            <StatusBadge label={reportPeriod.season} tone="accent" icon="partly-sunny-outline" />
          </View>

          {/* Field ------------------------------------------------------ */}
          <View style={styles.section}>
            <SectionHeader title="Field" caption="Crop, inputs and land condition" />

            <View style={styles.metricRow}>
              <MetricCard
                domain="Field"
                label="Crop Match"
                value={`${fieldReport.cropMatch}%`}
                caption={fieldReport.recommendedCrop}
                icon="leaf"
                onPress={() => router.push('/crop-recommendation')}
                style={styles.metricCell}
              />
              <MetricCard
                domain="Field"
                label="Farm Health"
                value={`${fieldReport.farmHealth}%`}
                caption={`${fieldReport.monitoredAcres} acres monitored`}
                icon="pulse"
                onPress={() => router.push('/crop-health')}
                style={styles.metricCell}
              />
            </View>

            <MetricCard
              domain="Field"
              label="Estimated Fertilizer Saving"
              value={formatCurrency(fieldReport.estimatedSaving)}
              caption={`${fieldReport.fertilizer} · ${fieldReport.fertilizerQuantity}`}
              icon="flask"
              onPress={() => router.push('/fertilizer-advice')}
            />
          </View>

          {/* Fund ------------------------------------------------------- */}
          <View style={styles.section}>
            <SectionHeader title="Fund" caption="Savings, lending and records" />

            <View style={styles.metricRow}>
              <MetricCard
                domain="Fund"
                label="Total Savings"
                value={formatCurrency(fundReport.totalSavings)}
                caption={`${fundReport.activeMembers} members`}
                icon="wallet"
                onPress={() => router.push('/savings')}
                style={styles.metricCell}
              />
              <MetricCard
                domain="Fund"
                label="Active Loans"
                value={formatCurrency(fundReport.outstandingLoans)}
                caption={`Outstanding · ${fundReport.activeLoanCount} loans`}
                icon="cash"
                onPress={() => router.push('/loans')}
                style={styles.metricCell}
              />
            </View>

            <View style={styles.card}>
              <ProgressBar
                label="Repayment health"
                valueLabel={`${fundReport.repaymentHealth}%`}
                value={fundReport.repaymentHealth}
                tone="success"
                height={10}
              />
              <Text style={styles.cardNote}>
                Repayment probability from the latest loan risk assessment.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.ledgerRow}>
                <View style={styles.periodText}>
                  <Text style={styles.cardTitle}>Ledger Integrity</Text>
                  <Text style={styles.cardNote}>
                    {fundReport.ledgerChecked} of {fundReport.ledgerTotal} records checked
                  </Text>
                </View>
                <StatusBadge
                  label={fundReport.ledgerVerified ? 'Verified' : 'Tamper detected'}
                  tone={fundReport.ledgerVerified ? 'success' : 'error'}
                  icon="shield-checkmark"
                />
              </View>
            </View>
          </View>

          {/* Savings trend ---------------------------------------------- */}
          <View style={styles.section}>
            <SectionHeader title="Savings Growth" caption="Deposits recorded per month" />
            <View style={styles.card}>
              {savingsTrend.map((entry) => (
                <View key={entry.id} style={styles.trendRow}>
                  <Text style={styles.trendMonth}>{entry.month}</Text>
                  <ProgressBar
                    value={(entry.amount / peakDeposit) * 100}
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
              {reportHighlights.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(item.route)}
                  accessibilityRole="button"
                  accessibilityLabel={item.text}
                  style={({ pressed }) => [
                    styles.highlightRow,
                    index < reportHighlights.length - 1 && styles.highlightDivider,
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
            Demo report from the current SahAI records. Exporting is not connected yet.
          </Text>
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
