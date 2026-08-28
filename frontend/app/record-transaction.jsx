import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../components/SahaiHeader';
import StepSection from '../components/StepSection';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { useBreakpoint } from '../utils/layout';
import { useReveal } from '../utils/motion';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import HashDisplay from '../components/HashDisplay';
import StatusBadge from '../components/StatusBadge';
import ErrorNotice from '../components/ErrorNotice';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, CardBase, Shadow } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import { validateNumber } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';
import { getGroupSummary } from '../services/groupService';
import {
  addLedgerEntry,
  ENTRY_TYPE_TREASURER_LABELS,
  MEMBER_ENTRY_TYPES,
  TREASURER_ENTRY_TYPES,
} from '../services/ledgerService';

/**
 * Record Transaction -- two versions of one screen, chosen by role.
 *
 * TREASURER: any member, any of the three entry types.
 * MEMBER:    herself only, and only a loan repayment.
 *
 * That asymmetry is not bureaucracy. compute_savings_consistency() derives a
 * member's loan risk from her deposit history, so a member who could record
 * her own deposits could manufacture a perfect savings record and talk her own
 * risk score down. The hash chain proves nobody EDITED a row; it cannot prove
 * money changed hands. Mirroring real SHG practice -- the treasurer records
 * collections at the weekly meeting -- closes that gap.
 *
 * The backend enforces all of this. The UI simply does not render a control
 * that is guaranteed to be refused.
 */
export default function RecordTransactionScreen() {
  const { signedIn, memberId, isTreasurer } = useAuth();
  const { maxWidth } = useBreakpoint();

  const entryTypes = isTreasurer ? TREASURER_ENTRY_TYPES : MEMBER_ENTRY_TYPES;

  const [entryType, setEntryType] = useState(entryTypes[0]);
  const [targetMember, setTargetMember] = useState(memberId || '');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState({});

  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | saving | done | error
  const [receipt, setReceipt] = useState(null);
  const [failure, setFailure] = useState(null);

  const saving = status === 'saving';

  // A treasurer needs somebody to record against. The list comes from the
  // group summary, which is built from members with ledger activity -- so a
  // brand-new member is typed in rather than picked. Better than pretending
  // the list is a complete roster.
  useEffect(() => {
    if (!isTreasurer) return;
    getGroupSummary()
      .then((summary) => setMembers(summary.members))
      .catch(() => setMembers([]));
  }, [isTreasurer]);

  useEffect(() => {
    if (!isTreasurer && memberId) setTargetMember(memberId);
  }, [isTreasurer, memberId]);

  const validate = () => {
    const found = {};
    const amountError = validateNumber(amount, {
      label: 'Amount',
      min: 1,
      max: 10000000,
    });
    if (amountError) found.amount = amountError;
    if (!String(targetMember).trim()) found.member = 'Choose or enter a member ID.';
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const submit = async () => {
    if (saving || !validate()) return;

    setStatus('saving');
    setFailure(null);
    try {
      const entry = await addLedgerEntry({
        memberId: targetMember,
        entryType,
        amount,
      });
      setReceipt(entry);
      setStatus('done');
      setAmount('');
    } catch (error) {
      setFailure(error);
      setStatus('error');
    }
  };

  const recordAnother = () => {
    setReceipt(null);
    setStatus('idle');
    setFailure(null);
  };

  if (!signedIn) {
    return (
      <View style={styles.screen}>
        <SahaiHeader title="Record Transaction" subtitle="Fund" showBack />
        <View style={styles.centred}>
          <EmptyState
            icon="lock-closed-outline"
            title="Log in to record a transaction"
            body="Entries are written against your account and hash-chained."
          />
          <PrimaryButton label="Log in" icon="log-in-outline" onPress={() => router.push('/login')} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SahaiHeader
        title={isTreasurer ? 'Record Transaction' : 'Record Repayment'}
        subtitle="Fund"
        showBack
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.inner, { maxWidth: maxWidth('narrow') }]}>
            {status === 'done' && !!receipt ? (
              <>
                <View style={styles.receiptCard}>
                  <StatusBadge label="Recorded" tone="success" icon="checkmark-circle" />
                  <Text style={styles.receiptAmount}>{formatCurrency(receipt.amount)}</Text>
                  <Text style={styles.receiptMeta}>
                    {ENTRY_TYPE_TREASURER_LABELS[receipt.entryType]} · {receipt.memberId}
                  </Text>
                  <Text style={styles.receiptNote}>
                    Entry #{receipt.id} has been added to the chain. Its hash now
                    depends on every entry before it.
                  </Text>
                  <HashDisplay label="Entry hash" hash={receipt.entryHash} tone="current" style={styles.receiptHash} />
                </View>

                <PrimaryButton label="Record another" onPress={recordAnother} />
                <SecondaryButton
                  label="View my portfolio"
                  onPress={() => router.push('/portfolio')}
                />
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  {isTreasurer
                    ? 'Record a deposit, disbursement or repayment against a member. Every entry is hash-chained.'
                    : 'Record a repayment against your own loan. Every entry is hash-chained.'}
                </Text>

                {status === 'error' && !!failure && <ErrorNotice error={failure} />}

                <View style={styles.card}>
                  <SelectField
                    label="Transaction type"
                    value={entryType}
                    onChange={setEntryType}
                    options={entryTypes.map((type) => ({
                      value: type,
                      label: ENTRY_TYPE_TREASURER_LABELS[type],
                    }))}
                    required
                    disabled={saving}
                  />

                  {isTreasurer ? (
                    <>
                      {members.length > 0 && (
                        <SelectField
                          label="Member"
                          value={targetMember}
                          onChange={(next) => {
                            setTargetMember(next);
                            setErrors((prev) => ({ ...prev, member: undefined }));
                          }}
                          options={members}
                          scroll
                          disabled={saving}
                        />
                      )}
                      <InputField
                        label="Member ID"
                        value={targetMember}
                        onChangeText={(text) => {
                          setTargetMember(text);
                          setErrors((prev) => ({ ...prev, member: undefined }));
                        }}
                        placeholder="e.g. lakshmi"
                        error={errors.member}
                        helper={
                          members.length
                            ? 'Pick above, or type the ID of a member with no entries yet.'
                            : 'Type the member ID exactly as registered.'
                        }
                        required
                        autoCapitalize="none"
                        editable={!saving}
                      />
                    </>
                  ) : (
                    <View style={styles.selfRow}>
                      <Ionicons name="person" size={16} color={Colors.secondary} />
                      <Text style={styles.selfText}>
                        Recording against your own account ({memberId})
                      </Text>
                    </View>
                  )}

                  <InputField
                    label="Amount"
                    value={amount}
                    onChangeText={(text) => {
                      setAmount(text);
                      setErrors((prev) => ({ ...prev, amount: undefined }));
                    }}
                    placeholder="500"
                    unit="₹"
                    error={errors.amount}
                    required
                    keyboardType="decimal-pad"
                    editable={!saving}
                  />
                </View>

                {/* Explain the restriction rather than leaving a member to
                    wonder why she cannot log her own deposit. */}
                {!isTreasurer && (
                  <View style={styles.explainCard}>
                    <Ionicons name="shield-checkmark" size={18} color={Colors.info} />
                    <Text style={styles.explainText}>
                      Deposits and loan disbursements are recorded by your
                      treasurer. That is what keeps your savings record — and the
                      loan screening built on it — trustworthy.
                    </Text>
                  </View>
                )}

                {saving ? (
                  <LoadingState message="Writing to the ledger..." />
                ) : (
                  <PrimaryButton label="Record transaction" onPress={submit} />
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.section },
  inner: { width: '100%', alignSelf: 'center', gap: Spacing.xl },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  gateText: { ...Typography.bodySmall, textAlign: 'center' },
  subtitle: { ...Typography.bodySmall, lineHeight: 21, maxWidth: 420 },
  card: { gap: Spacing.lg },
  selfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentSoft,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  selfText: { ...Typography.bodySmall, color: Colors.secondary, flex: 1 },
  explainCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: Colors.infoSoft,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  explainText: { ...Typography.caption, color: Colors.info, flex: 1, lineHeight: 17 },
  receiptCard: {
    backgroundColor: Colors.successSoft,
    borderRadius: Radius.hero,
    padding: Spacing.xl,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  receiptAmount: { ...Typography.display, color: Colors.success, fontVariant: ['tabular-nums'] },
  receiptMeta: { ...Typography.bodySmall, textTransform: 'capitalize' },
  receiptNote: { ...Typography.caption, lineHeight: 17 },
  receiptHash: { alignSelf: 'stretch' },
});
