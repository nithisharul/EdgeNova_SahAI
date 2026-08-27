import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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
import { quickActions } from '../../data/homeNavigation';
import { getHomeDashboard } from '../../services/homeService';

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

/**
 * Insight cards, built from the figures already on this screen.
 *
 * Nothing here is a stored recommendation -- each card restates a real number
 * the backend returned, so an insight can never contradict the metric card
 * directly above it. A card whose data is missing is simply not produced.
 */
function buildInsights(data) {
  const cards = [];

  if (data.crop) {
    cards.push({
      id: 'crop',
      title: 'Field',
      headline: data.crop.name,
      subheadline: `${data.crop.confidence}% match`,
      message: 'Your most recent crop recommendation for this field.',
      icon: 'leaf',
      tone: 'success',
      badge: 'Crop model',
      badgeTone: 'success',
      route: '/crop-recommendation',
    });
  }

  if (data.summary.availableBalance > 0) {
    cards.push({
      id: 'lending',
      title: 'Fund',
      headline: formatCurrency(data.summary.availableBalance),
      subheadline: 'available to lend',
      message: `${formatCurrency(data.summary.totalSavings)} saved, ${formatCurrency(
        data.summary.activeLoans
      )} currently lent out.`,
      icon: 'wallet',
      tone: 'accent',
      badge: 'Group ledger',
      badgeTone: 'accent',
      route: '/finance',
    });
  }

  if (data.summary.savingsThisMonth > 0) {
    cards.push({
      id: 'savings-month',
      title: 'Fund',
      headline: formatCurrency(data.summary.savingsThisMonth),
      subheadline: 'saved this month',
      message: `Recorded across ${data.summary.memberCount} members.`,
      icon: 'trending-up',
      tone: 'success',
      badge: 'This month',
      badgeTone: 'success',
      route: '/savings',
    });
  }

  return cards;
}

export default function HomeScreen() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setData(await getHomeDashboard());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  // Reload whenever the tab regains focus, so a deposit recorded elsewhere
  // shows up here without a restart.
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
          {status === 'loading' && (
            <View style={styles.stateBox}>
              <ActivityIndicator color={Colors.secondary} />
              <Text style={styles.stateText}>Loading your overview...</Text>
            </View>
          )}

          {status === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Unable to load your overview right now. Please try again.
              </Text>
              <SecondaryButton label="Retry" icon="refresh" onPress={load} />
            </View>
          )}

          {status === 'ready' && !!data && (
            <>
          {/* Greeting -------------------------------------------------- */}
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>
              {greetingForNow()}, {data.user.name || data.user.memberId || 'there'}
            </Text>
            <Text style={styles.greetingSub}>Here&apos;s your farm &amp; SHG overview.</Text>
            <View style={styles.greetingMeta}>
              <StatusBadge
                label={data.user.groupName}
                tone="accent"
                icon="people-outline"
                size="sm"
              />
              <StatusBadge
                label={`${data.summary.memberCount} members`}
                tone="neutral"
                icon="people-outline"
                size="sm"
              />
            </View>
          </View>

          {/* Field + Fund summary -------------------------------------- */}
          <View style={styles.metricRow}>
            {/* The real latest recommendation from this session. Before one
                has been run there is nothing truthful to show, so the card
                invites the farmer to run it rather than naming a crop. */}
            <MetricCard
              domain="Field"
              label="Crop Match"
              value={data.crop ? `${data.crop.confidence}%` : '--'}
              caption={data.crop ? data.crop.name : 'Run a recommendation'}
              icon="leaf"
              onPress={() => go('/crop-recommendation')}
              style={styles.metricCell}
            />
            <MetricCard
              domain="Fund"
              label="SHG Savings"
              value={formatCurrency(data.summary.totalSavings)}
              caption="Group balance"
              icon="wallet"
              onPress={() => go('/finance')}
              style={styles.metricCell}
            />
          </View>

          <View style={styles.metricRow}>
            <MetricCard
              domain="Fund"
              label="Active Loans"
              value={formatCurrency(data.summary.activeLoans)}
              caption={`Across ${data.summary.activeLoanCount} members`}
              icon="cash"
              onPress={() => go('/loans')}
              style={styles.metricCell}
            />
            <MetricCard
              domain="Group"
              label="Members"
              value={String(data.summary.memberCount)}
              caption="Active in group"
              icon="people"
              onPress={() => go('/members')}
              style={styles.metricCell}
            />
          </View>

          {/* Ledger integrity ------------------------------------------ */}
          {/* Whatever GET /ledger/verify returned. Nothing here can force a
              VERIFIED badge -- a broken chain reads as broken. */}
          {!!data.ledger && (
            <View style={styles.ledgerCard}>
              <View style={styles.ledgerText}>
                <Text style={styles.ledgerTitle}>Secure Ledger</Text>
                <Text style={styles.ledgerMessage} numberOfLines={2}>
                  {data.ledger.verified
                    ? 'Every entry matches its recorded hash.'
                    : `Chain broken at ${data.ledger.tamperedRecordId}.`}
                </Text>
                <Text style={styles.ledgerMeta}>
                  {data.ledger.checkedRecords} of {data.ledger.totalRecords} entries checked
                </Text>
              </View>
              <StatusBadge
                label={data.ledger.verified ? 'Verified' : 'Tampered'}
                tone={data.ledger.verified ? 'success' : 'error'}
                icon="shield-checkmark"
              />
            </View>
          )}

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
            {buildInsights(data).map((insight) => (
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
            {data.recentActivity.map((txn) => (
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
  stateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
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
