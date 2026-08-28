import { useCallback, useState } from 'react';
import { Animated, View, Text, StyleSheet, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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
import { Spacing, Radius, Typography } from '../constants/Theme';
import { useBreakpoint } from '../utils/layout';
import { useReveal } from '../utils/motion';
import { useAuth } from '../contexts/AuthContext';
import { getGroupSummary } from '../services/groupService';

/**
 * Group Summary -- the treasurer's view of the whole book.
 *
 * Four real figures and a member list, all summed from the ledger. The old
 * dashboard also carried "saved this month" and a "+8.2%" growth chip; neither
 * is derivable from anything the backend returns, so both are gone rather than
 * estimated into existence.
 *
 * availableBalance IS derived -- corpus minus outstanding -- which is
 * arithmetic on two real numbers, and is labelled as such.
 *
 * Tapping a member opens her portfolio. That replaces the old Members
 * directory: the treasurer reaches a member through the group's own books,
 * which is the only place the backend has a member list at all.
 */
export default function GroupSummaryScreen() {
  const { signedIn, isTreasurer } = useAuth();
  const { maxWidth } = useBreakpoint();

  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!signedIn || !isTreasurer) return;
    setStatus('loading');
    setError(null);
    try {
      setSummary(await getGroupSummary());
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [signedIn, isTreasurer]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const reveal = useReveal(status === 'ready');

  if (!signedIn || !isTreasurer) {
    return (
      <View style={styles.screen}>
        <SahaiHeader title="Group Summary" subtitle="Fund" showBack />
        <View style={styles.gate}>
          <EmptyState
            icon="lock-closed-outline"
            title={signedIn ? 'Treasurer access only' : 'Log in to see the group'}
            body={
              signedIn
                ? 'The group summary is available to the SHG treasurer.'
                : 'Group finances are visible to the treasurer.'
            }
          />
          {!signedIn && (
            <PrimaryButton label="Log in" icon="log-in-outline" onPress={() => router.push('/login')} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SahaiHeader title="Group Summary" subtitle="Treasurer" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, { maxWidth: maxWidth('content') }]}>
          {status === 'loading' && <LoadingState message="Adding up the group book..." rows={3} />}
          {status === 'error' && <ErrorNotice error={error} onRetry={load} />}

          {status === 'ready' && !!summary && (
            <Animated.View style={[styles.body, reveal]}>
              {/* One lead figure, three supporting. Not four equal tiles. */}
              <View style={styles.corpusPanel}>
                <Backdrop variant="blob" size={220} tone="deep" style={styles.panelBlob} />
                <Text style={styles.panelLabel}>The group holds</Text>
                <Metric
                  label="Group corpus"
                  value={summary.totalCorpus}
                  currency
                  animate
                  size="hero"
                  tone="inverse"
                  caption="Every savings deposit ever recorded"
                />
              </View>

              <View style={styles.supportRow}>
                <Metric
                  label="Lent out"
                  value={summary.outstandingLoans}
                  currency
                  size="small"
                  caption="Not yet repaid"
                  style={styles.supportCell}
                />
                <View style={styles.supportRule} />
                <Metric
                  label="Available"
                  value={summary.availableBalance}
                  currency
                  size="small"
                  caption="Corpus less lending"
                  style={styles.supportCell}
                />
                <View style={styles.supportRule} />
                <Metric
                  label="Members"
                  value={summary.memberCount}
                  size="small"
                  caption="With activity"
                  style={styles.supportCell}
                />
              </View>

              {/* Members as ledger rows, not a wall of cards. */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Members</Text>

                {summary.members.length === 0 ? (
                  <EmptyState
                    icon="people-outline"
                    title="No recorded activity yet"
                    body="Record a savings deposit and members appear here."
                  />
                ) : (
                  <View style={styles.memberList}>
                    {summary.members.map((id, index) => (
                      <DataRow
                        key={id}
                        title={id}
                        subtitle="View savings and loans"
                        onPress={() =>
                          router.push(`/portfolio?memberId=${encodeURIComponent(id)}`)
                        }
                        last={index === summary.members.length - 1}
                      />
                    ))}
                  </View>
                )}

                {/* Honest about what this list is: it comes from DISTINCT
                    member_id in the ledger, so a registered member with no
                    transactions does not appear. Calling it a roster would be
                    wrong. */}
                <Text style={styles.rosterNote}>
                  Built from members appearing in the ledger. Someone registered
                  but with no recorded transaction yet is not listed.
                </Text>
              </View>

              <PrimaryButton
                label="Record a transaction"
                onPress={() => router.push('/record-transaction')}
              />
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

  corpusPanel: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.hero,
    padding: Spacing.xl,
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  panelBlob: { top: -70, right: -60 },
  panelLabel: { ...Typography.sectionLabel, color: Colors.accent },

  supportRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  supportCell: { flex: 1 },
  supportRule: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.border },

  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.sectionLabel },
  memberList: { borderTopWidth: 1, borderTopColor: Colors.border },
  rosterNote: { ...Typography.caption, lineHeight: 16, marginTop: Spacing.xs },
});
