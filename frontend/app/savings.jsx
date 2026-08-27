import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../components/SahaiHeader';
import MetricCard from '../components/MetricCard';
import InputField from '../components/InputField';
import MemberSelect from '../components/MemberSelect';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import SectionHeader from '../components/SectionHeader';
import TransactionCard from '../components/TransactionCard';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, CardBase, Shadow, FontSize } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import { validateForm } from '../utils/validation';
import { getSavings, recordSavings } from '../services/financeService';
import { getMembers } from '../services/memberService';

const RULES = {
  amount: { label: 'Amount', min: 1, max: 1000000 },
  date: { type: 'text', label: 'Date', minLength: 3 },
};

export default function SavingsScreen() {
  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  // Record-savings form
  const [formOpen, setFormOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [values, setValues] = useState({ amount: '', date: 'Today' });
  const [errors, setErrors] = useState({});
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [savedEntry, setSavedEntry] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [savings, memberList] = await Promise.all([getSavings(), getMembers()]);
      setData(savings);
      setMembers(memberList);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (name) => (text) => {
    setValues((prev) => ({ ...prev, [name]: text }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const handleRecord = async () => {
    if (saveStatus === 'saving') return; // guards against a double tap

    const { errors: found, isValid } = validateForm(values, RULES);
    if (!selectedMember) found.member = 'Member is required.';
    setErrors(found);
    if (!isValid || !selectedMember) return;

    setSaveStatus('saving');
    try {
      // memberId is what the ledger entry is keyed on; the name is only
      // carried through for the confirmation message.
      const entry = await recordSavings({
        memberId: selectedMember.id,
        member: selectedMember.name,
        amount: values.amount,
        date: values.date,
      });
      setSavedEntry(entry);
      setSaveStatus('saved');
      setValues({ amount: '', date: 'Today' });
      setSelectedMember(null);
    } catch {
      setSaveStatus('error');
    }
  };

  const closeForm = () => {
    setFormOpen(false);
    setErrors({});
    setSaveStatus('idle');
    setSavedEntry(null);
  };

  const saving = saveStatus === 'saving';

  return (
    <View style={styles.screen}>
      <SahaiHeader title="SHG Savings" subtitle="Finance" showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
            {status === 'loading' && (
              <View style={styles.stateBox}>
                <ActivityIndicator color={Colors.secondary} />
                <Text style={styles.stateText}>Loading savings...</Text>
              </View>
            )}

            {status === 'error' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>Unable to load savings. Please try again.</Text>
                <SecondaryButton label="Retry" icon="refresh" onPress={load} />
              </View>
            )}

            {status === 'ready' && !!data && (
              <>
                <View style={styles.metricRow}>
                  <MetricCard
                    label="Total Savings"
                    value={formatCurrency(data.totalSavings)}
                    caption="All members"
                    icon="wallet"
                    style={styles.metricCell}
                  />
                  <MetricCard
                    label="This Month"
                    value={`+${formatCurrency(data.savingsThisMonth)}`}
                    caption="New deposits"
                    icon="trending-up"
                    style={styles.metricCell}
                  />
                </View>

                {!formOpen && (
                  <PrimaryButton
                    label="Record Savings"
                    icon="add"
                    onPress={() => setFormOpen(true)}
                  />
                )}

                {formOpen && (
                  <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Record a savings deposit</Text>

                    {saveStatus === 'saved' && !!savedEntry && (
                      <View style={styles.successBanner}>
                        <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                        <Text style={styles.successText}>
                          Recorded {formatCurrency(savedEntry.amount)} for {savedEntry.member}.
                          Demo session only.
                        </Text>
                      </View>
                    )}

                    {saveStatus === 'error' && (
                      <View style={styles.errorBanner}>
                        <Ionicons name="alert-circle" size={18} color={Colors.error} />
                        <Text style={styles.errorBannerText}>
                          Unable to record this deposit. Please try again.
                        </Text>
                      </View>
                    )}

                    <MemberSelect
                      members={members}
                      selectedId={selectedMember?.id}
                      onSelect={(member) => {
                        setSelectedMember(member);
                        setErrors((prev) => ({ ...prev, member: undefined }));
                      }}
                      error={errors.member}
                      required
                      disabled={saving}
                    />
                    <InputField
                      label="Amount"
                      value={values.amount}
                      onChangeText={setField('amount')}
                      placeholder="2000"
                      unit="₹"
                      error={errors.amount}
                      required
                      keyboardType="decimal-pad"
                      editable={!saving}
                    />
                    <InputField
                      label="Date"
                      value={values.date}
                      onChangeText={setField('date')}
                      placeholder="e.g. Today or 25 Aug"
                      error={errors.date}
                      required
                      editable={!saving}
                    />

                    <PrimaryButton
                      label="Save Deposit"
                      icon="checkmark"
                      loading={saving}
                      loadingLabel="Recording deposit..."
                      onPress={handleRecord}
                    />
                    <SecondaryButton label="Cancel" onPress={closeForm} />
                  </View>
                )}

                <View style={styles.section}>
                  <SectionHeader title="Member Savings" caption="Highest balance first" />
                  {data.byMember.length === 0 ? (
                    <Text style={styles.emptyLine}>No savings records yet.</Text>
                  ) : (
                    <View style={styles.listCard}>
                      {data.byMember.map((member) => (
                        <View key={member.id} style={styles.listRow}>
                          <View style={styles.listText}>
                            <Text style={styles.listLabel}>{member.name}</Text>
                            <Text style={styles.listMeta}>{member.village}</Text>
                          </View>
                          <Text style={styles.listAmount}>
                            {formatCurrency(member.savings)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.section}>
                  <SectionHeader title="Recent Deposits" />
                  {data.recentDeposits.length === 0 ? (
                    <Text style={styles.emptyLine}>No savings records yet.</Text>
                  ) : (
                    data.recentDeposits.map((txn) => (
                      <TransactionCard
                        key={txn.id}
                        type={txn.type}
                        description={txn.description}
                        member={txn.member}
                        amount={txn.amount}
                        date={txn.date}
                      />
                    ))
                  )}
                </View>
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
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  inner: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
  },
  metricCell: { flex: 1 },
  section: { gap: Spacing.md },
  formCard: {
    ...CardBase,
    ...Shadow.card,
    gap: Spacing.lg,
  },
  formTitle: {
    ...Typography.subtitle,
    fontSize: FontSize.body,
  },
  listCard: {
    ...CardBase,
    ...Shadow.card,
    gap: Spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  listText: { flex: 1, minWidth: 0, gap: 1 },
  listLabel: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.text,
  },
  listMeta: { ...Typography.caption },
  listAmount: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyLine: {
    ...Typography.bodySmall,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    textAlign: 'center',
  },
  stateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  stateText: { ...Typography.bodySmall },
  errorBox: {
    gap: Spacing.md,
    backgroundColor: Colors.errorSoft,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  errorText: { ...Typography.bodySmall, color: Colors.error },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.successSoft,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  successText: { ...Typography.bodySmall, color: Colors.success, flex: 1 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorSoft,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorBannerText: { ...Typography.bodySmall, color: Colors.error, flex: 1 },
});
