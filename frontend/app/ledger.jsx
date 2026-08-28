import { useCallback, useState } from 'react';
import { Animated, View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../components/SahaiHeader';
import Backdrop from '../components/Backdrop';
import HashDisplay from '../components/HashDisplay';
import PrimaryButton from '../components/PrimaryButton';
import StatusBadge from '../components/StatusBadge';
import ErrorNotice from '../components/ErrorNotice';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, FontSize, Motion } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import { formatDate, formatTime } from '../utils/datetime';
import { useBreakpoint } from '../utils/layout';
import { useReveal } from '../utils/motion';
import { useAuth } from '../contexts/AuthContext';
import { getAllEntries, verifyLedger, ENTRY_TYPE_TREASURER_LABELS } from '../services/ledgerService';

/**
 * Secure Ledger -- the security demo, and the clearest argument this product
 * makes.
 *
 * THE VERDICT IS NEVER DECIDED HERE
 * ---------------------------------
 * `integrity` starts null and is only ever set from GET /ledger/verify. No
 * default of "verified", no optimistic state while loading, no local hashing.
 * The claim is that a SHA-256 chain was walked on the server; a frontend that
 * concluded "verified" on its own would be lying about exactly the thing this
 * screen exists to prove.
 *
 * THE CHAIN IS DRAWN, NOT DESCRIBED
 * ---------------------------------
 * Entries are linked by a visible connector carrying each row's prev_hash, so
 * "hash-chained" stops being a word in a pitch and becomes something a judge
 * can see. Break one row and the connector at that point turns red.
 *
 * There is deliberately no "simulate tamper" button. To demonstrate detection,
 * edit a row in backend/database.db and press Verify again. A fake button would
 * prove nothing.
 */
export default function LedgerScreen() {
  const { signedIn, isTreasurer } = useAuth();
  const { maxWidth } = useBreakpoint();

  const [entries, setEntries] = useState([]);
  const [integrity, setIntegrity] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    if (!signedIn || !isTreasurer) return;
    setStatus('loading');
    setError(null);
    try {
      setEntries(await getAllEntries());
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [signedIn, isTreasurer]);

  useFocusEffect(
    useCallback(() => {
      load();
      // Verification is an action the treasurer takes. A stale "verified"
      // badge sitting on screen would be worse than none at all.
      setIntegrity(null);
    }, [load])
  );

  // Declared before any early return: hook order must not depend on role.
  const verdictReveal = useReveal(!!integrity);

  const runVerify = async () => {
    setVerifying(true);
    setError(null);
    try {
      const result = await verifyLedger();
      setIntegrity(result);
      // Re-read the rows so a highlighted break is definitely the row the
      // server just judged.
      setEntries(await getAllEntries());
    } catch (err) {
      setError(err);
      setIntegrity(null);
    } finally {
      setVerifying(false);
    }
  };

  if (!signedIn || !isTreasurer) {
    return (
      <View style={styles.screen}>
        <SahaiHeader title="Secure Ledger" subtitle="Fund" showBack />
        <View style={styles.gate}>
          <EmptyState
            icon="lock-closed-outline"
            title={signedIn ? 'Treasurer access only' : 'Log in to verify records'}
            body={
              signedIn
                ? 'Ledger verification is available to the SHG treasurer.'
                : 'The group ledger is verified by the treasurer.'
            }
          />
          {!signedIn && (
            <PrimaryButton label="Log in" icon="log-in-outline" onPress={() => router.push('/login')} />
          )}
        </View>
      </View>
    );
  }

  const brokenId = integrity && !integrity.valid ? integrity.brokenEntryId : null;

  return (
    <View style={styles.screen}>
      <SahaiHeader title="Secure Ledger" subtitle="Treasurer" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, { maxWidth: maxWidth('content') }]}>
          {/* ---- Verification hero ---- */}
          <View
            style={[
              styles.verifyHero,
              integrity?.valid === true && styles.verifyValid,
              integrity?.valid === false && styles.verifyBroken,
            ]}
          >
            <Backdrop variant="fund" height={200} lines={7} />

            {integrity === null ? (
              <>
                <Text style={styles.verifyEyebrow}>Chain integrity</Text>
                <Text style={styles.verifyTitle}>Not checked yet</Text>
                <Text style={styles.verifyBody}>
                  Walk the chain to confirm no record has been altered since it was
                  written.
                </Text>
              </>
            ) : (
              <Animated.View style={[styles.verdict, verdictReveal]}>
                <View style={styles.verdictHead}>
                  <Ionicons
                    name={integrity.valid ? 'shield-checkmark' : 'warning'}
                    size={26}
                    color={integrity.valid ? Colors.success : Colors.error}
                  />
                  <Text
                    style={[
                      styles.verdictTitle,
                      { color: integrity.valid ? Colors.success : Colors.error },
                    ]}
                  >
                    {integrity.valid ? 'All records verified' : 'Tampering detected'}
                  </Text>
                </View>

                <Text style={styles.verifyBody}>
                  {integrity.valid
                    ? `${entries.length} of ${entries.length} entries match their stored hash. Checked ${formatTime(integrity.checkedAt)}.`
                    : `The chain breaks at entry #${integrity.brokenEntryId}. Its contents no longer match the hash recorded for it.`}
                </Text>
              </Animated.View>
            )}

            {verifying ? (
              <LoadingState message="Verifying record chain..." />
            ) : (
              <PrimaryButton
                label={integrity === null ? 'Verify ledger' : 'Verify again'}
                onPress={runVerify}
              />
            )}
          </View>

          {!!error && <ErrorNotice error={error} onRetry={load} />}

          {/* ---- The chain ---- */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>All entries</Text>
              {status === 'ready' && (
                <Text style={styles.sectionMeta}>{entries.length} in the chain</Text>
              )}
            </View>

            {status === 'loading' && <LoadingState message="Loading the chain..." rows={3} />}

            {status === 'ready' && entries.length === 0 && (
              <EmptyState
                icon="link-outline"
                title="No ledger entries yet"
                body="The first recorded transaction starts the chain."
              />
            )}

            {status === 'ready' &&
              entries.map((entry, index) => (
                <ChainEntry
                  key={entry.id}
                  entry={entry}
                  broken={brokenId === entry.id}
                  // Everything after a break inherits the problem, which is
                  // the property that makes a hash chain worth having.
                  downstream={brokenId !== null && entry.id > brokenId}
                  first={index === 0}
                  last={index === entries.length - 1}
                  expanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                />
              ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * One link in the chain.
 *
 * Note what is NOT shown: a per-row "verified" tick. The backend verifies the
 * CHAIN, not individual rows, so ticking each one would imply a check that
 * never happened. Only the entry the server named is called out.
 */
function ChainEntry({ entry, broken, downstream, first, last, expanded, onToggle }) {
  return (
    <View style={styles.chainRow}>
      {/* Connector: the visual claim that these rows are linked. */}
      <View style={styles.connector}>
        <View
          style={[
            styles.connectorLine,
            first && styles.connectorHidden,
            (broken || downstream) && styles.connectorBroken,
          ]}
        />
        <View
          style={[
            styles.node,
            broken && styles.nodeBroken,
            downstream && styles.nodeDownstream,
          ]}
        />
        <View
          style={[
            styles.connectorLine,
            styles.connectorGrow,
            last && styles.connectorHidden,
            downstream && styles.connectorBroken,
          ]}
        />
      </View>

      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`Entry ${entry.id}, ${entry.entryType}`}
        style={({ pressed }) => [
          styles.entryBody,
          broken && styles.entryBroken,
          last && styles.entryLast,
          pressed && styles.entryPressed,
        ]}
      >
        <View style={styles.entryHead}>
          <View style={styles.entryLeft}>
            <Text style={styles.entryType}>
              {ENTRY_TYPE_TREASURER_LABELS[entry.entryType] || entry.entryType}
            </Text>
            <Text style={styles.entryMeta}>
              {entry.memberId} · {formatDate(entry.date)}
            </Text>
          </View>
          <View style={styles.entryRight}>
            <Text style={styles.entryAmount}>{formatCurrency(entry.amount)}</Text>
            <Text style={styles.entryId}>#{entry.id}</Text>
          </View>
        </View>

        {broken && (
          <View style={styles.brokenNote}>
            <Ionicons name="warning" size={15} color={Colors.error} />
            <Text style={styles.brokenText}>
              Contents no longer match the stored hash. Every entry after this one
              is affected.
            </Text>
          </View>
        )}

        {expanded ? (
          <View style={styles.hashes}>
            <HashDisplay label="Links back to" hash={entry.prevHash} />
            <HashDisplay label="This entry's hash" hash={entry.entryHash} tone="current" />
          </View>
        ) : (
          <Text style={styles.hashPreview} numberOfLines={1}>
            {entry.entryHash?.slice(0, 16)}…
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.section },
  inner: { width: '100%', alignSelf: 'center', gap: Spacing.xl },
  gate: { flex: 1, justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },

  // ---- verification hero ----
  verifyHero: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.hero,
    padding: Spacing.xl,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  verifyValid: { borderColor: Colors.success, backgroundColor: Colors.successSoft },
  verifyBroken: { borderColor: Colors.error, backgroundColor: Colors.errorSoft },
  verifyEyebrow: { ...Typography.sectionLabel, color: Colors.accent },
  verifyTitle: { ...Typography.heading },
  verifyBody: { ...Typography.bodySmall, lineHeight: 21 },
  verdict: { gap: Spacing.sm },
  verdictHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  verdictTitle: { ...Typography.heading, flex: 1 },

  // ---- chain ----
  section: { gap: Spacing.sm },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionLabel: { ...Typography.sectionLabel },
  sectionMeta: { ...Typography.caption },

  chainRow: { flexDirection: 'row', gap: Spacing.md },
  connector: { width: 14, alignItems: 'center' },
  connectorLine: {
    width: 2,
    height: Spacing.md,
    backgroundColor: Colors.borderStrong,
  },
  connectorGrow: { flex: 1 },
  connectorHidden: { backgroundColor: 'transparent' },
  connectorBroken: { backgroundColor: Colors.error, opacity: 0.5 },
  node: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  nodeBroken: { backgroundColor: Colors.error, width: 14, height: 14, borderRadius: 7 },
  nodeDownstream: { backgroundColor: Colors.error, opacity: 0.45 },

  entryBody: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.xs,
  },
  entryLast: { borderBottomWidth: 0 },
  entryBroken: {
    backgroundColor: Colors.errorSoft,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    borderBottomColor: Colors.error,
  },
  entryPressed: { opacity: 0.65 },
  entryHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  entryLeft: { flex: 1, gap: 1 },
  entryType: { ...Typography.body, fontWeight: '600' },
  entryMeta: { ...Typography.caption },
  entryRight: { alignItems: 'flex-end', gap: 1 },
  entryAmount: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  entryId: { ...Typography.caption },
  hashPreview: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontFamily: 'monospace',
  },
  hashes: { gap: Spacing.sm, marginTop: Spacing.xs },
  brokenNote: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    marginTop: Spacing.xs,
  },
  brokenText: { ...Typography.caption, color: Colors.error, flex: 1, lineHeight: 16 },
});
