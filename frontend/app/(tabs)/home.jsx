import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import SahaiHeader from '../../components/SahaiHeader';
import MetricCard from '../../components/MetricCard';
import QuickActionCard from '../../components/QuickActionCard';
import RecommendationCard from '../../components/RecommendationCard';
import TransactionCard from '../../components/TransactionCard';
import SectionHeader from '../../components/SectionHeader';
import SecondaryButton from '../../components/SecondaryButton';
import StatusBadge from '../../components/StatusBadge';
import Colors from '../../constants/Colors';
import { Spacing, Radius, Typography, CardBase, Shadow } from '../../constants/Theme';
import { formatCurrency } from '../../utils/currency';
import {
  homeUser,
  homeSummary,
  ledgerStatus,
  homeInsights,
  recentActivities,
  quickActions,
} from '../../data/mockHomeData';

/** Greeting follows the farmer's day rather than a fixed string. */
function greetingForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Splits the quick actions into rows of two so the grid stays even. */
function inPairs(items) {
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

export default function HomeScreen() {
  const go = (route) => router.push(route);

  return (
    <View style={styles.screen}>
      <SahaiHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {/* Greeting -------------------------------------------------- */}
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>
              {greetingForNow()}, {homeUser.name}
            </Text>
            <Text style={styles.greetingSub}>Here&apos;s your farm &amp; SHG overview.</Text>
            <View style={styles.greetingMeta}>
              <StatusBadge
                label={homeUser.groupName}
                tone="accent"
                icon="people-outline"
                size="sm"
              />
              <StatusBadge
                label={homeSummary.season}
                tone="neutral"
                icon="partly-sunny-outline"
                size="sm"
              />
            </View>
          </View>

          {/* Field + Fund summary -------------------------------------- */}
          <View style={styles.metricRow}>
            <MetricCard
              domain="Field"
              label="Crop Match"
              value={`${homeSummary.cropMatch}%`}
              caption={`${homeSummary.recommendedCrop} · ${homeSummary.farmRecommendationStatus}`}
              icon="leaf"
              onPress={() => go('/crop-recommendation')}
              style={styles.metricCell}
            />
            <MetricCard
              domain="Fund"
              label="SHG Savings"
              value={formatCurrency(homeSummary.totalSavings)}
              caption="Group balance"
              icon="wallet"
              delta={homeSummary.savingsDelta}
              onPress={() => go('/finance')}
              style={styles.metricCell}
            />
          </View>

          <View style={styles.metricRow}>
            <MetricCard
              domain="Fund"
              label="Active Loans"
              value={formatCurrency(homeSummary.activeLoans)}
              caption={`Across ${homeSummary.activeLoanCount} members`}
              icon="cash"
              onPress={() => go('/loans')}
              style={styles.metricCell}
            />
            <MetricCard
              domain="Group"
              label="Members"
              value={String(homeSummary.memberCount)}
              caption="Active in group"
              icon="people"
              onPress={() => go('/members')}
              style={styles.metricCell}
            />
          </View>

          {/* Ledger integrity ------------------------------------------ */}
          <View style={styles.ledgerCard}>
            <View style={styles.ledgerText}>
              <Text style={styles.ledgerTitle}>{ledgerStatus.title}</Text>
              <Text style={styles.ledgerMessage} numberOfLines={2}>
                {ledgerStatus.message}
              </Text>
              <Text style={styles.ledgerMeta}>{ledgerStatus.lastCheckedLabel}</Text>
            </View>
            <StatusBadge
              label={ledgerStatus.label}
              tone={ledgerStatus.tone}
              icon="shield-checkmark"
            />
          </View>

          {/* Quick actions --------------------------------------------- */}
          <View style={styles.section}>
            <SectionHeader title="Quick Actions" caption="Jump straight into a decision" />
            <View style={styles.grid}>
              {inPairs(quickActions).map((row) => (
                <View key={row.map((action) => action.id).join('-')} style={styles.gridRow}>
                  {row.map((action) => (
                    <QuickActionCard
                      key={action.id}
                      label={action.label}
                      caption={action.caption}
                      icon={action.icon}
                      tone={action.tone}
                      onPress={() => go(action.route)}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* AI insights ----------------------------------------------- */}
          <View style={styles.section}>
            <SectionHeader
              title="AI Insights"
              caption="Generated from your latest farm and ledger data"
            />
            {homeInsights.map((insight) => (
              <RecommendationCard
                key={insight.id}
                title={insight.title}
                headline={insight.headline}
                subheadline={insight.subheadline}
                message={insight.message}
                icon={insight.icon}
                tone={insight.tone}
                badge={insight.badge}
                badgeTone={insight.badgeTone}
                onPress={() => go(insight.route)}
              />
            ))}
          </View>

          {/* Combined field + fund report ------------------------------ */}
          <SecondaryButton
            label="View Performance Report"
            icon="stats-chart"
            onPress={() => go('/reports')}
          />

          {/* Recent activity ------------------------------------------- */}
          <View style={styles.section}>
            <SectionHeader
              title="Recent Activity"
              caption="Latest entries in the group ledger"
              actionLabel="View all"
              onActionPress={() => go('/finance')}
            />
            {recentActivities.map((txn) => (
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
    // Keeps the last card clear of the tab bar on every device.
    paddingBottom: Spacing.xxxl,
  },
  /** Centred column so a desktop browser does not stretch the cards. */
  inner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  greetingBlock: {
    gap: Spacing.xs,
  },
  greeting: {
    ...Typography.heading,
    color: Colors.primary,
  },
  greetingSub: {
    ...Typography.bodySmall,
  },
  greetingMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
  },
  metricCell: {
    flex: 1,
  },
  ledgerCard: {
    ...CardBase,
    ...Shadow.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
    borderTopLeftRadius: Radius.xl,
    borderBottomLeftRadius: Radius.xl,
  },
  ledgerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  ledgerTitle: {
    ...Typography.subtitle,
    fontSize: 15,
  },
  ledgerMessage: {
    ...Typography.bodySmall,
  },
  ledgerMeta: {
    ...Typography.caption,
    marginTop: 2,
  },
  section: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  grid: {
    gap: Spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
  },
});
