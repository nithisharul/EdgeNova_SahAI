import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../components/SahaiHeader';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import SecondaryButton from '../components/SecondaryButton';
import HashDisplay from '../components/HashDisplay';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, CardBase, Shadow, FontSize } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import { formatDateTime } from '../utils/datetime';
import { GENESIS_HASH } from '../data/mockLedgerData';
import { getLedgerRecordById } from '../services/ledgerService';

/**
 * One ledger entry in full.
 *
 * The hashes shown here are stored values handed over by the service. The
 * frontend never recomputes them -- it only labels which one links to which.
 */
export default function LedgerRecordScreen() {
  const { id } = useLocalSearchParams();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTechnical, setShowTechnical] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecord(await getLedgerRecordById(String(id)));
    } catch (err) {
      setError(err.message || 'Unable to load this ledger record.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const verified = record?.verified;
  const incoming = record?.direction === 'in';
  const isGenesisLink = record?.previousHash === GENESIS_HASH;

  return (
    <View style={styles.screen}>
      <SahaiHeader
        title="Transaction Details"
        subtitle={record ? `Record ${record.id}` : 'Secure ledger entry'}
        showBack
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.centeredText}>Loading record...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <View style={styles.stateIcon}>
            <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
          </View>
          <Text style={styles.stateTitle}>Unable to load this record.</Text>
          <Text style={styles.stateBody}>Please try again.</Text>
          <SecondaryButton label="Retry" icon="refresh" onPress={load} fullWidth={false} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            {/* Headline -------------------------------------------------- */}
            <View style={[styles.card, !verified && styles.cardFailed]}>
              <View style={styles.cardHeader}>
                <View style={styles.recordNumberBlock}>
                  <Text style={styles.recordLabel}>Record</Text>
                  <Text style={styles.recordNumber}>
                    #{String(record.sequence).padStart(3, '0')}
                  </Text>
                </View>
                <StatusBadge
                  label={verified ? 'VERIFIED' : 'FAILED CHECK'}
                  tone={verified ? 'success' : 'error'}
                  icon={verified ? 'shield-checkmark' : 'warning'}
                />
              </View>

              <Text style={[styles.amount, incoming ? styles.amountIn : styles.amountOut]}>
                {formatCurrency(incoming ? record.amount : -record.amount, { showSign: true })}
              </Text>

              <View style={styles.fieldList}>
                <Field label="Member" value={record.memberName} />
                <Field label="Type" value={record.type} />
                <Field label="Timestamp" value={formatDateTime(record.timestamp)} />
                <Field label="Record ID" value={record.id} />
                {!!record.note && <Field label="Note" value={record.note} last />}
              </View>
            </View>

            {/* Integrity ------------------------------------------------- */}
            <View style={styles.section}>
              <SectionHeader
                title="Ledger Verification"
                caption="Technical details for this entry"
              />

              <Pressable
                onPress={() => setShowTechnical((open) => !open)}
                accessibilityRole="button"
                accessibilityState={{ expanded: showTechnical }}
                style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
              >
                <View style={styles.toggleIcon}>
                  <Ionicons name="lock-closed" size={18} color={Colors.secondary} />
                </View>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleTitle}>
                    {showTechnical ? 'Hide hash details' : 'Show hash details'}
                  </Text>
                  <Text style={styles.toggleCaption}>
                    {verified
                      ? 'This record still matches its stored hash.'
                      : 'This record no longer matches its stored hash.'}
                  </Text>
                </View>
                <Ionicons
                  name={showTechnical ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.textMuted}
                />
              </Pressable>

              {showTechnical && (
                <View style={styles.hashBlock}>
                  <HashDisplay
                    label="Current Hash"
                    hash={record.currentHash}
                    tone="current"
                    caption="Identifies this record. Tap to show it in full."
                  />
                  <View style={styles.chainLink}>
                    <Ionicons name="link" size={14} color={Colors.accent} />
                    <Text style={styles.chainLinkText}>links back to</Text>
                  </View>
                  <HashDisplay
                    label="Previous Hash"
                    hash={record.previousHash}
                    caption={
                      isGenesisLink
                        ? 'This is the first record in the chain.'
                        : 'The hash of the record recorded before this one.'
                    }
                  />
                </View>
              )}
            </View>

            {/* Explanation ----------------------------------------------- */}
            <View style={styles.explainCard}>
              <Text style={styles.explainTitle}>Why two hashes?</Text>
              <Text style={styles.explainBody}>
                Storing the previous record&apos;s hash inside this one chains the entries
                together. Editing an old entry breaks the chain from that point on, which is what
                an integrity check looks for.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/** Label above value, with a hairline separator between rows. */
function Field({ label, value, last = false }) {
  return (
    <View style={[styles.field, !last && styles.fieldDivider]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
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
    paddingBottom: Spacing.xxxl,
  },
  /** Centred column so a desktop browser does not stretch the cards. */
  inner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  centeredText: {
    ...Typography.bodySmall,
  },
  stateIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    ...Typography.subtitle,
    textAlign: 'center',
  },
  stateBody: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  card: {
    ...CardBase,
    ...Shadow.card,
    gap: Spacing.md,
  },
  cardFailed: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorSoft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  recordNumberBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  recordLabel: {
    ...Typography.sectionLabel,
  },
  recordNumber: {
    ...Typography.heading,
    color: Colors.primary,
  },
  amount: {
    fontSize: FontSize.display,
    fontWeight: '700',
    letterSpacing: -1,
  },
  amountIn: {
    color: Colors.success,
  },
  amountOut: {
    color: Colors.error,
  },
  fieldList: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  field: {
    paddingVertical: Spacing.md,
    gap: 2,
  },
  fieldDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fieldLabel: {
    ...Typography.caption,
  },
  fieldValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  section: {
    gap: Spacing.md,
  },
  toggle: {
    ...CardBase,
    ...Shadow.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  toggleTitle: {
    fontSize: FontSize.small,
    fontWeight: '700',
    color: Colors.text,
  },
  toggleCaption: {
    ...Typography.caption,
  },
  hashBlock: {
    gap: Spacing.sm,
  },
  chainLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.xs,
  },
  chainLinkText: {
    ...Typography.caption,
    color: Colors.accent,
    fontWeight: '600',
  },
  explainCard: {
    ...CardBase,
    backgroundColor: Colors.surfaceAlt,
    gap: Spacing.sm,
  },
  explainTitle: {
    ...Typography.subtitle,
    fontSize: 16,
  },
  explainBody: {
    ...Typography.bodySmall,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.7,
  },
});
