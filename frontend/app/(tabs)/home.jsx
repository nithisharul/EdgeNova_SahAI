import { useCallback, useState } from 'react';
import { Animated, View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../../components/SahaiHeader';
import Backdrop from '../../components/Backdrop';
import Metric from '../../components/Metric';
import ErrorNotice from '../../components/ErrorNotice';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import LoadingState from '../../components/LoadingState';
import Colors from '../../constants/Colors';
import { Spacing, Radius, Typography, FontSize, Motion } from '../../constants/Theme';
import { formatCurrency } from '../../utils/currency';
import { useBreakpoint } from '../../utils/layout';
import { useReveal } from '../../utils/motion';
import { useAuth } from '../../contexts/AuthContext';
import { getPortfolio } from '../../services/portfolioService';
import { getGroupSummary } from '../../services/groupService';
import { getLastAdvisory } from '../../services/sessionState';
import { useDataVersion } from '../../services/dataSync';

/**
 * Home -- three different screens behind one route.
 *
 * Signed out it is a landing page telling one story: Field to Fund. Signed in
 * as a member it leads with her own money. Signed in as a treasurer it leads
 * with the group's, and puts ledger verification within reach.
 *
 * The composition is deliberately asymmetric. A 2x2 grid of identical tiles
 * says every number is equally important, which is never true: a member opens
 * this app to see her savings, so that figure is set at hero size and
 * everything else is arranged around it.
 */

function greetingForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** A destination as a row: an icon, a name, a reason, an arrow. */
function ActionRow({ icon, label, caption, onPress, last = false, emphasis = false }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionRow,
        last && styles.actionRowLast,
        pressed && styles.actionPressed,
      ]}
    >
      <View style={[styles.actionIcon, emphasis && styles.actionIconEmphasis]}>
        <Ionicons name={icon} size={18} color={emphasis ? Colors.textOnPrimary : Colors.secondary} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        {!!caption && <Text style={styles.actionCaption}>{caption}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const { signedIn, memberId, name, isTreasurer, restoring, signOut } = useAuth();
  const { isDesktop, maxWidth } = useBreakpoint();

  const [portfolio, setPortfolio] = useState(null);
  const [group, setGroup] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const go = (route) => router.push(route);

  const load = useCallback(async () => {
    if (!signedIn) {
      setPortfolio(null);
      setGroup(null);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      // A member's token cannot read the group summary, so it is not requested.
      const [portfolioData, groupData] = await Promise.all([
        getPortfolio(memberId),
        isTreasurer ? getGroupSummary() : Promise.resolve(null),
      ]);
      setPortfolio(portfolioData);
      setGroup(groupData);
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [signedIn, memberId, isTreasurer]);

  // Re-reads when a write elsewhere changes server state, not only on focus.
  const dataVersion = useDataVersion();

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load, dataVersion])
  );

  const reveal = useReveal(status === 'ready');
  const advisory = getLastAdvisory();

  // ------------------------------------------------------ signed out
  if (!signedIn && !restoring) {
    return <PublicLanding isDesktop={isDesktop} maxWidth={maxWidth} go={go} />;
  }

  return (
    <View style={styles.screen}>
      <SahaiHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, { maxWidth: maxWidth('content') }]}>
          <View style={styles.greeting}>
            <Text style={styles.greetingText}>
              {greetingForNow()}, {name || memberId}
            </Text>
            <Text style={styles.greetingRole}>
              {isTreasurer ? 'Treasurer' : 'Member'} · {memberId}
            </Text>
          </View>

          {status === 'loading' && <LoadingState message="Loading your figures..." rows={2} />}
          {status === 'error' && <ErrorNotice error={error} onRetry={load} />}

          {status === 'ready' && !!portfolio && (
            <Animated.View style={[styles.body, reveal]}>
              {/* The one figure this person opened the app for. */}
              <View style={styles.heroBlock}>
                <Backdrop variant="fund" height={150} lines={5} />
                <Metric
                  label="My savings"
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
                <View style={styles.heroSide}>
                  <Metric
                    label="Loan outstanding"
                    value={portfolio.outstandingLoan}
                    currency
                    size="small"
                    tone={portfolio.outstandingLoan > 0 ? 'warning' : 'default'}
                    caption={portfolio.outstandingLoan > 0 ? 'Still to repay' : 'Nothing owed'}
                  />
                  <Pressable
                    onPress={() => go('/portfolio')}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.inlineLink, pressed && styles.actionPressed]}
                  >
                    <Text style={styles.inlineLinkText}>View portfolio</Text>
                    <Ionicons name="arrow-forward" size={14} color={Colors.secondary} />
                  </Pressable>
                </View>
              </View>

              {/* Treasurer's group position: one lead figure, two supporting. */}
              {isTreasurer && !!group && (
                <View style={styles.groupPanel}>
                  <Backdrop variant="blob" size={200} tone="deep" style={styles.groupBlob} />
                  <Text style={styles.panelLabel}>The group</Text>
                  <Metric
                    label="Group corpus"
                    value={group.totalCorpus}
                    currency
                    animate
                    size="hero"
                    tone="inverse"
                  />
                  <View style={styles.groupRow}>
                    <Metric
                      label="Lent out"
                      value={group.outstandingLoans}
                      currency
                      size="small"
                      tone="inverse"
                      style={styles.groupCell}
                    />
                    <Metric
                      label="Members"
                      value={group.memberCount}
                      size="small"
                      tone="inverse"
                      style={styles.groupCell}
                    />
                  </View>
                </View>
              )}

              {/* Only shown when a real advisory ran this session. */}
              {!!advisory?.crop?.name && (
                <Pressable
                  onPress={() => go('/crop-advisor')}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.cropStrip, pressed && styles.actionPressed]}
                >
                  <View style={styles.cropText}>
                    <Text style={styles.panelLabel}>Latest crop advice</Text>
                    <Text style={styles.cropName}>{String(advisory.crop.name).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.cropMatch}>
                    {Math.round((advisory.crop.confidence || 0) * 100)}%
                  </Text>
                </Pressable>
              )}

              {/* Treasurer duties first -- verification is the job. */}
              {isTreasurer && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Group records</Text>
                  <View style={styles.actionList}>
                    <ActionRow
                      icon="shield-checkmark"
                      label="Verify ledger"
                      caption="Check no record has been altered"
                      onPress={() => go('/ledger')}
                      emphasis
                    />
                    <ActionRow
                      icon="create"
                      label="Record transaction"
                      caption="Deposit, disbursement or repayment"
                      onPress={() => go('/record-transaction')}
                    />
                    <ActionRow
                      icon="people"
                      label="Group summary"
                      caption="Corpus, lending and members"
                      onPress={() => go('/group-summary')}
                      last
                    />
                  </View>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your money</Text>
                <View style={styles.actionList}>
                  <ActionRow
                    icon="wallet"
                    label="My portfolio"
                    caption="Savings, loans and history"
                    onPress={() => go('/portfolio')}
                  />
                  <ActionRow
                    icon="document-text"
                    label="Request a loan"
                    caption="Screened against your savings record"
                    onPress={() => go('/request-loan')}
                  />
                  <ActionRow
                    icon="arrow-undo"
                    label={isTreasurer ? 'Record a repayment' : 'Record repayment'}
                    caption="Log a repayment on your loan"
                    onPress={() => go('/record-transaction')}
                    last
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your field</Text>
                <View style={styles.actionList}>
                  <ActionRow
                    icon="leaf"
                    label="Crop advisor"
                    caption="Find a crop suited to your field"
                    onPress={() => go('/crop-advisor')}
                  />
                  <ActionRow
                    icon="flask"
                    label="Fertilizer advice"
                    caption="If you already know your crop"
                    onPress={() => go('/fertilizer-advice')}
                  />
                  <ActionRow
                    icon="map"
                    label="My land"
                    caption="Your field profile"
                    onPress={() => go('/my-land')}
                    last
                  />
                </View>
              </View>

              <SecondaryButton label="Log out" icon="log-out-outline" onPress={signOut} />
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * The landing page.
 *
 * One story, told once: crop decisions on one side, group money on the other,
 * one product across both. No feature wall, no metric tiles for a visitor who
 * has no data yet, no gradient.
 */
function PublicLanding({ isDesktop, maxWidth, go }) {
  const reveal = useReveal(true);

  return (
    <View style={styles.screen}>
      <SahaiHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.inner, { maxWidth: maxWidth('content') }, reveal]}>
          <View style={styles.hero}>
            <Backdrop variant="field" height={isDesktop ? 340 : 300} />

            <Text style={styles.heroEyebrow}>SahAI</Text>
            <Text style={[styles.heroTitle, isDesktop && styles.heroTitleDesktop]}>
              From Field{'\n'}to Fund
            </Text>
            <Text style={styles.heroBody}>
              Better crop decisions. Clearer group finances. One place for both.
            </Text>

            <View style={[styles.heroActions, isDesktop && styles.heroActionsDesktop]}>
              <PrimaryButton
                label="Find a crop"
                icon="leaf"
                fullWidth={!isDesktop}
                onPress={() => go('/crop-advisor')}
                style={isDesktop && styles.heroButton}
              />
              <SecondaryButton
                label="Log in"
                icon="log-in-outline"
                fullWidth={!isDesktop}
                onPress={() => go('/login')}
                style={isDesktop && styles.heroButton}
              />
            </View>
          </View>

          <View style={styles.splitWrap}>
            <View style={[styles.split, isDesktop && styles.splitDesktop]}>
              <View style={styles.splitHalf}>
                <Text style={styles.splitLabel}>Field</Text>
                <Text style={styles.splitTitle}>Know what to plant</Text>
                <Text style={styles.splitBody}>
                  Share your soil readings and location. SahAI reads local weather
                  and suggests a crop, with the reasoning shown.
                </Text>
                <Pressable
                  onPress={() => go('/fertilizer-advice')}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.inlineLink, pressed && styles.actionPressed]}
                >
                  <Text style={styles.inlineLinkText}>Fertilizer advice</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.secondary} />
                </Pressable>
              </View>

              <View style={styles.splitDivider} />

              <View style={styles.splitHalf}>
                <Text style={styles.splitLabel}>Fund</Text>
                <Text style={styles.splitTitle}>Records that hold up</Text>
                <Text style={styles.splitBody}>
                  Every deposit and repayment is hash-chained, so the group can
                  prove its book has not been altered.
                </Text>
                <Pressable
                  onPress={() => go('/login')}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.inlineLink, pressed && styles.actionPressed]}
                >
                  <Text style={styles.inlineLinkText}>Log in to your group</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.secondary} />
                </Pressable>
              </View>
            </View>
          </View>

          <Text style={styles.footnote}>
            Crop and fertilizer advice work without an account.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.section },
  inner: { width: '100%', alignSelf: 'center', gap: Spacing.xl },
  body: { gap: Spacing.xl },

  greeting: { gap: 2 },
  greetingText: { ...Typography.heading },
  greetingRole: { ...Typography.caption },

  // ---- hero savings ----
  heroBlock: {
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
    overflow: 'hidden',
  },
  heroSide: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  inlineLinkText: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.secondary,
  },

  // ---- treasurer group panel ----
  groupPanel: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.hero,
    padding: Spacing.xl,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  groupBlob: { top: -60, right: -50 },
  panelLabel: { ...Typography.sectionLabel, color: Colors.accent },
  groupRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.sm },
  groupCell: { flex: 1 },

  // ---- crop strip ----
  cropStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  cropText: { flex: 1, gap: 2 },
  cropName: { ...Typography.title, color: Colors.secondary },
  cropMatch: { ...Typography.title, color: Colors.accent, fontVariant: ['tabular-nums'] },

  // ---- action lists ----
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.sectionLabel },
  actionList: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionRowLast: { borderBottomWidth: 0 },
  actionPressed: { opacity: 0.6 },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconEmphasis: { backgroundColor: Colors.secondary },
  actionText: { flex: 1, gap: 1 },
  actionLabel: { ...Typography.body, fontWeight: '600' },
  actionCaption: { ...Typography.caption },

  // ---- landing ----
  hero: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  heroEyebrow: { ...Typography.sectionLabel, color: Colors.accent },
  heroTitle: {
    ...Typography.hero,
    color: Colors.primary,
    lineHeight: 48,
  },
  heroTitleDesktop: { fontSize: 60, lineHeight: 62 },
  heroBody: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
    maxWidth: 420,
  },
  heroActions: { gap: Spacing.md, marginTop: Spacing.lg },
  heroActionsDesktop: { flexDirection: 'row' },
  heroButton: { minWidth: 180 },

  splitWrap: { gap: Spacing.md },
  split: { gap: Spacing.xl },
  splitDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  splitHalf: { flex: 1, gap: Spacing.sm },
  splitDivider: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.border },
  splitLabel: { ...Typography.sectionLabel, color: Colors.accent },
  splitTitle: { ...Typography.subtitle },
  splitBody: { ...Typography.bodySmall, lineHeight: 21 },

  footnote: {
    ...Typography.caption,
    textAlign: 'center',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
