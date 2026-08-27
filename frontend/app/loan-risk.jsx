import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../components/SahaiHeader';
import InputField from '../components/InputField';
import MemberSelect from '../components/MemberSelect';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import RecommendationCard from '../components/RecommendationCard';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, CardBase, Shadow, FontSize } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import { validateForm, toNumbers } from '../utils/validation';
import { assessLoanRisk } from '../services/loanService';
import { getMembers } from '../services/memberService';

/**
 * Loan risk assessment.
 *
 * Form and result share one route. The risk level arrives from the service --
 * this screen only maps it onto the existing semantic colours.
 */

/** Risk level -> theme tone. No thresholds, just a lookup on the response. */
const RISK_TONES = {
  Low: { tone: 'success', badgeTone: 'success', icon: 'shield-checkmark' },
  Medium: { tone: 'warning', badgeTone: 'warning', icon: 'alert-circle' },
  High: { tone: 'error', badgeTone: 'error', icon: 'warning' },
};

const FIELDS = [
  {
    name: 'requestedAmount',
    label: 'Requested Loan',
    unit: '₹',
    placeholder: '10000',
    min: 1,
    max: 1000000,
  },
  {
    name: 'monthlyIncome',
    label: 'Monthly Income',
    unit: '₹',
    placeholder: '12000',
    min: 1,
    max: 1000000,
  },
  {
    name: 'existingLoan',
    label: 'Existing Loan',
    unit: '₹',
    placeholder: '0',
    min: 0,
    max: 1000000,
  },
  {
    name: 'repaymentScore',
    label: 'Previous Repayment Score',
    unit: '%',
    placeholder: '85',
    min: 0,
    max: 100,
  },
  {
    name: 'durationMonths',
    label: 'Loan Duration',
    unit: 'months',
    placeholder: '12',
    min: 1,
    max: 120,
  },
];

const RULES = FIELDS.reduce((acc, f) => {
  acc[f.name] = { label: f.label, min: f.min, max: f.max };
  return acc;
}, {});

const EMPTY = FIELDS.reduce((acc, f) => ({ ...acc, [f.name]: '' }), {});

export default function LoanRiskScreen() {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    // A failure here just leaves the picker empty; the field still validates.
    getMembers()
      .then(setMembers)
      .catch(() => setMembers([]));
  }, []);

  const loading = status === 'loading';

  const setField = (name) => (text) => {
    setValues((prev) => ({ ...prev, [name]: text }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const handleSubmit = async () => {
    if (loading) return; // guards against a double tap

    const { errors: found, isValid } = validateForm(values, RULES);
    if (!selectedMember) found.member = 'Member is required.';
    setErrors(found);
    if (!isValid || !selectedMember) return;

    setStatus('loading');
    try {
      const payload = await assessLoanRisk({
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        ...toNumbers(values, Object.keys(RULES)),
      });
      setResult(payload);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const handleReset = () => {
    setValues(EMPTY);
    setErrors({});
    setSelectedMember(null);
    setResult(null);
    setApproved(false);
    setStatus('idle');
  };

  const showResult = status === 'done' && !!result;
  const risk = showResult ? RISK_TONES[result.riskLevel] || RISK_TONES.Medium : null;

  return (
    <View style={styles.screen}>
      <SahaiHeader title="Loan Risk Assessment" subtitle="Finance" showBack />

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
            {showResult ? (
              <>
                <RecommendationCard
                  title="Loan Risk Assessment"
                  icon={risk.icon}
                  badge={`${result.riskLevel} Risk`}
                  badgeTone={risk.badgeTone}
                  headline={`${String(result.riskLevel).toUpperCase()} RISK`}
                  message={result.recommendation}
                  tone={risk.tone}
                  stats={[
                    { label: 'Risk Score', value: `${result.riskScore}%` },
                    {
                      label: 'Repayment Probability',
                      value: `${result.repaymentProbability}%`,
                    },
                  ]}
                  highlights={result.reasons}
                />

                <View style={styles.recapCard}>
                  <Text style={styles.recapTitle}>Assessed request</Text>
                  <View style={styles.recapRow}>
                    <Text style={styles.recapLabel}>Member</Text>
                    <Text style={styles.recapValue}>{result.input.memberName}</Text>
                  </View>
                  <View style={styles.recapRow}>
                    <Text style={styles.recapLabel}>Requested Loan</Text>
                    <Text style={styles.recapValue}>
                      {formatCurrency(result.input.requestedAmount)}
                    </Text>
                  </View>
                  <View style={styles.recapRow}>
                    <Text style={styles.recapLabel}>Duration</Text>
                    <Text style={styles.recapValue}>
                      {result.input.durationMonths} months
                    </Text>
                  </View>
                </View>

                {approved && (
                  <View style={styles.approvedBanner}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <Text style={styles.approvedText}>
                      Loan marked as approved for this demo. Nothing has been saved —
                      the group ledger is not connected yet.
                    </Text>
                  </View>
                )}

                {!approved && (
                  <PrimaryButton
                    label="Approve Loan"
                    icon="checkmark"
                    onPress={() => setApproved(true)}
                  />
                )}
                <SecondaryButton label="Review Again" icon="refresh" onPress={handleReset} />
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  Evaluate repayment risk before approving an SHG loan.
                </Text>

                {status === 'error' && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={20} color={Colors.error} />
                    <Text style={styles.errorBannerText}>
                      Unable to assess loan risk right now. Please try again.
                    </Text>
                  </View>
                )}

                <View style={styles.form}>
                  <MemberSelect
                    members={members}
                    selectedId={selectedMember?.id}
                    onSelect={(member) => {
                      setSelectedMember(member);
                      setErrors((prev) => ({ ...prev, member: undefined }));
                    }}
                    error={errors.member}
                    required
                    disabled={loading}
                  />

                  {FIELDS.map((field) => (
                    <InputField
                      key={field.name}
                      label={field.label}
                      value={values[field.name]}
                      onChangeText={setField(field.name)}
                      placeholder={field.placeholder}
                      unit={field.unit}
                      error={errors[field.name]}
                      required
                      keyboardType="decimal-pad"
                      editable={!loading}
                    />
                  ))}
                </View>

                <PrimaryButton
                  label="Analyse Risk"
                  icon="shield-checkmark"
                  loading={loading}
                  loadingLabel="Assessing repayment risk..."
                  onPress={handleSubmit}
                />
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
  subtitle: { ...Typography.bodySmall, lineHeight: 21 },
  form: { gap: Spacing.lg },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorSoft,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorBannerText: { ...Typography.bodySmall, color: Colors.error, flex: 1 },
  recapCard: {
    ...CardBase,
    ...Shadow.card,
    gap: Spacing.sm,
  },
  recapTitle: { ...Typography.sectionLabel, marginBottom: Spacing.xs },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  recapLabel: { ...Typography.bodySmall },
  recapValue: {
    fontSize: FontSize.small,
    fontWeight: '700',
    color: Colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  approvedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.successSoft,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  approvedText: { ...Typography.bodySmall, color: Colors.success, flex: 1, lineHeight: 19 },
});
