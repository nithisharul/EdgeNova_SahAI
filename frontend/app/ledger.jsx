import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../components/SahaiHeader';
import SectionHeader from '../components/SectionHeader';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import LedgerRecordCard from '../components/LedgerRecordCard';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, CardBase, Shadow, FontSize } from '../constants/Theme';
import { formatRelativeDateTime } from '../utils/datetime';
import { getLedgerRecords, verifyLedger, setLedgerDemoMode } from '../services/ledgerService';

/**
 * Secure SHG ledger.
 *
 * The screen renders whatever verdict the ledger service hands back -- it
 * never inspects hashes or decides whether the chain is intact. Integrity
 * states are data driven, so the tamper view is one service response away
 * rather than a separate screen.
 */

/** Maps a backend integrity result onto the card at the top of the screen. */
function integrityView({ integrity, verifying }) {
  if (verifying) {
    return {
      status: 'CHECKING',
      tone: 'info',
      icon: 'time',
      accent: Colors.info,
      headline: 'Checking ledger integrity...',
      detail: 'Each record is being re-linked to the one before it.',
    };
  }

  if (!integrity) {
    return {
      status: 'NOT CHECKED',
      tone: 'neutral',
      icon: 'help-circle',
      accent: Colors.borderStrong,
      headline: 'This ledger has not been verified yet.',
      detail: 'Run a check to confirm the records are intact.',
    };
  }

  if (!integrity.verified) {
    return {
      status: 'TAMPER DETECTED',
      tone: 'error',
      icon: 'warning',
      accent: Colors.error,
      headline: `1 of ${integrity.totalRecords} records failed verification.`,
      detail: integrity.tamperedRecordId
        ? `Affected record: ${integrity.tamperedRecordId}. Ask the group to review this entry before recording anything further.`
        : 'Ask the group to review the ledger before recording anything further.',
    };
  }

  if (integrity.checkedRecords < integrity.totalRecords) {
    return {
      status: 'WARNING',
      tone: 'warning',
      icon: 'alert-circle',
      accent: Colors.warning,
      headline: `Only ${integrity.checkedRecords} of ${integrity.totalRecords} records were checked.`,
      detail: 'The check finished early. Run it again for a complete result.',
    };
  }

  if (!integrity.totalRecords) {
    return {
      status: 'NO RECORDS',
      tone: 'neutral',
      icon: 'document-text',
      accent: Colors.borderStrong,
      headline: 'Nothing has been recorded yet.',
      detail: 'The integrity check starts once the group records its first entry.',
    };
  }

  return {
    status: 'VERIFIED',
    tone: 'success',
    icon: 'shield-checkmark',
    accent: Colors.success,
    headline: `All ${integrity.totalRecords} records are intact.`,
    detail: 'No tampering detected.',
  };
}

export default function LedgerScreen() {
  // Demo-only escape hatch: /ledger?demo=tampered | empty | error.
  // Nothing in the UI links to it, so the normal route is always the
  // verified ledger.
  const { demo } = useLocalSearchParams();

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [integrity, setIntegrity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setVerifyError(null);
    try {
      // Always set it: leaving the mode alone would keep a ?demo= state
      // sticky after navigating back to the plain /ledger route.
      setLedgerDemoMode(demo);
      const data = await getLedgerRecords();
      setRecords(data.records);
      setSummary(data.summary);
      setIntegrity(data.integrity);
    } catch (err) {
      setError(err.message || 'Unable to load ledger records.');
    } finally {
      setLoading(false);
    }
  }, [demo]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVerify = async () => {
    if (verifying) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const result = await verifyLedger();
      setIntegrity(result);
      setRecords((current) =>
        current.map((record) => ({
          ...record,
          verified: record.id !== result.tamperedRecordId,
        }))
      );
    } catch (err) {
      setVerifyError(err.message || 'Ledger verification could not be completed.');
    } finally {
      setVerifying(false);
    }
  };

  const view = integrityView({ integrity, verifying });

  return (
    <View style={styles.screen}>
      <SahaiHeader
        title="SHG Secure Ledger"
        subtitle="Finance"
        showBack
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.centeredText}>Loading secure ledger...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <View style={styles.stateIcon}>
            <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
          </View>
          <Text style={styles.stateTitle}>Unable to load ledger records.</Text>
          <Text style={styles.stateBody}>Please try again.</Text>
          <SecondaryButton label="Retry" icon="refresh" onPress={load} fullWidth={false} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            {/* Integrity ------------------------------------------------- */}
            <View style={[styles.integrityCard, { borderLeftColor: view.accent }]}>
              <View style={styles.integrityHeader}>
                <View style={styles.integrityTitleBlock}>
                  <Text style={styles.integrityLabel}>Ledger Integrity</Text>
                  <Text style={styles.integrityStatus}>{view.status}</Text>
                </View>
                <StatusBadge label={view.status} tone={view.tone} icon={view.icon} />
              </View>

              <Text style={styles.integrityHeadline}>{view.headline}</Text>
              <Text style={styles.integrityDetail}>{view.detail}</Text>

              {!!integrity?.verifiedAt && !!integrity.totalRecords && !verifying && (
                <View style={styles.integrityFooter}>
                  <Text style={styles.integrityFooterLabel}>Last verified</Text>
                  <Text style={styles.integrityFooterValue}>
                    {formatRelativeDateTime(integrity.verifiedAt)}
                  </Text>
                </View>
              )}
            </View>

            <PrimaryButton
              label="Verify Ledger"
              icon="shield-checkmark"
              loading={verifying}
              loadingLabel="Verifying ledger integrity..."
              onPress={handleVerify}
            />

            {!!verifyError && (
              <View style={styles.verifyError}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.verifyErrorText}>{verifyError} Please try again.</Text>
              </View>
            )}

            {/* Summary --------------------------------------------------- */}
            {!!summary && (
              <View style={styles.section}>
                <SectionHeader title="Ledger Summary" caption="What the chain holds today" />
                <View style={styles.metricRow}>
                  <MetricCard
                    label="Total Records"
                    value={String(summary.totalRecords)}
                    icon="document-text"
                    style={styles.metricCell}
                  />
                  <MetricCard
                    label="Savings"
                    value={String(summary.savingsEntries)}
                    icon="wallet"
                    style={styles.metricCell}
                  />
                </View>
                <View style={styles.metricRow}>
                  <MetricCard
                    label="Loans"
                    value={String(summary.loanEntries)}
                    icon="cash"
                    style={styles.metricCell}
                  />
                  <MetricCard
                    label="Repayments"
                    value={String(summary.repaymentEntries)}
                    icon="refresh"
                    style={styles.metricCell}
                  />
                </View>
              </View>
            )}

            {/* Records --------------------------------------------------- */}
            <View style={styles.section}>
              <SectionHeader
                title="Ledger Records"
                caption={
                  records.length
                    ? `Latest ${records.length} of ${summary?.totalRecords ?? records.length} · tap a record for its hash details`
                    : 'Nothing recorded yet'
                }
              />

              {records.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.stateIcon}>
                    <Ionicons name="document-text-outline" size={26} color={Colors.secondary} />
                  </View>
                  <Text style={styles.stateTitle}>No ledger records yet</Text>
                  <Text style={styles.stateBody}>
                    Transactions recorded by your SHG will appear here.
                  </Text>
                </View>
              ) : (
                records.map((record) => (
                  <LedgerRecordCard
                    key={record.id}
                    record={record}
                    onPress={() =>
                      router.push({ pathname: '/ledger-record', params: { id: record.id } })
                    }
                  />
                ))
              )}
            </View>

            {/* Explanation ----------------------------------------------- */}
            <View style={styles.explainCard}>
              <View style={styles.explainHeader}>
                <View style={styles.explainIcon}>
                  <Ionicons name="link" size={18} color={Colors.secondary} />
                </View>
                <Text style={styles.explainTitle}>How is this protected?</Text>
              </View>
              <Text style={styles.explainBody}>
                Each financial record is linked to the previous record through a cryptographic
                hash. If an old entry is altered, the ledger&apos;s integrity check can detect it.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
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
  integrityCard: {
    ...CardBase,
    ...Shadow.card,
    gap: Spacing.sm,
    borderLeftWidth: 4,
  },
  integrityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  integrityTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  integrityLabel: {
    ...Typography.sectionLabel,
  },
  integrityStatus: {
    ...Typography.title,
    color: Colors.primary,
  },
  integrityHeadline: {
    ...Typography.body,
    fontWeight: '600',
  },
  integrityDetail: {
    ...Typography.bodySmall,
  },
  integrityFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
    gap: 2,
  },
  integrityFooterLabel: {
    ...Typography.caption,
  },
  integrityFooterValue: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.text,
  },
  verifyError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorSoft,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: -Spacing.sm,
  },
  verifyErrorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    flex: 1,
  },
  section: {
    gap: Spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
  },
  metricCell: {
    flex: 1,
  },
  emptyCard: {
    ...CardBase,
    ...Shadow.card,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  explainCard: {
    ...CardBase,
    backgroundColor: Colors.surfaceAlt,
    gap: Spacing.sm,
  },
  explainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  explainIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explainTitle: {
    ...Typography.subtitle,
    fontSize: 16,
    flex: 1,
  },
  explainBody: {
    ...Typography.bodySmall,
    lineHeight: 20,
  },
});
