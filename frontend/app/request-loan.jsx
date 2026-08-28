import { useState } from 'react';
import {
  Animated,
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
import Backdrop from '../components/Backdrop';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import StepSection from '../components/StepSection';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import StatusBadge from '../components/StatusBadge';
import RiskMeter from '../components/RiskMeter';
import ErrorNotice from '../components/ErrorNotice';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, FontSize, Motion } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import { validateNumber } from '../utils/validation';
import { useBreakpoint } from '../utils/layout';
import { useReveal, useCountUp } from '../utils/motion';
import { useAuth } from '../contexts/AuthContext';
import { requestLoan, SECTORS, REPAYMENT_INTERVALS } from '../services/loanService';

/**
 * Request a Loan -- the member asks, the model screens, the treasurer decides.
 *
 * FOUR INPUTS, AND NO MORE
 * ------------------------
 * amount, term, sector, repayment interval. The old form also asked for monthly
 * income, an existing loan balance and a "previous repayment score", none of
 * which any endpoint has ever read. They are gone, not collected and discarded.
 *
 * SAVINGS CONSISTENCY IS NOT AN INPUT
 * -----------------------------------
 * The backend derives it from the member's own hash-chained deposit history.
 * She cannot type it, adjust it, or send it -- that is the product's whole
 * argument, so it is given a section of its own on the result rather than being
 * buried as one statistic among several.
 *
 * LANGUAGE
 * --------
 * A screening aid, never a decision. Never "approved", "rejected", "likely to
 * repay" or "will default": the model was trained on a dataset with no observed
 * repayment outcome, and stronger words would overstate it.
 */

const RISK_PRESENTATION = {
  LOW: { headline: 'Worth reviewing', tone: 'success', icon: 'checkmark-circle' },
  MEDIUM: { headline: 'Review carefully', tone: 'warning', icon: 'alert-circle' },
  HIGH: { headline: 'Needs treasurer review', tone: 'error', icon: 'warning' },
};

const AMOUNT_RULES = { label: 'Loan amount', min: 1, max: 10000000 };
const TERM_RULES = { label: 'Number of months', min: 1, max: 120 };

export default function RequestLoanScreen() {
  const { signedIn } = useAuth();
  const { isDesktop, maxWidth } = useBreakpoint();

  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('12');
  const [sector, setSector] = useState('Agriculture');
  const [interval, setInterval] = useState('monthly');
  const [errors, setErrors] = useState({});

  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);

  const loading = status === 'loading';

  const validate = () => {
    const found = {};
    const amountError = validateNumber(amount, AMOUNT_RULES);
    if (amountError) found.amount = amountError;
    const termError = validateNumber(term, TERM_RULES);
    if (termError) found.term = termError;
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const submit = async () => {
    if (loading || !validate()) return;
    setStatus('loading');
    setFailure(null);
    try {
      // No member_id: a member always scores herself and the backend reads
      // identity from the token, not the body.
      setResult(
        await requestLoan({
          amount,
          termInMonths: term,
          sector,
          repaymentInterval: interval,
        })
      );
      setStatus('done');
    } catch (error) {
      setFailure(error);
      setStatus('error');
    }
  };

  const reset = () => {
    setResult(null);
    setStatus('idle');
    setFailure(null);
  };

  if (!signedIn) {
    return (
      <View style={styles.screen}>
        <SahaiHeader title="Request a Loan" subtitle="Fund" showBack />
        <View style={styles.gate}>
          <EmptyState
            icon="lock-closed-outline"
            title="Log in to request a loan"
            body="Your screening is based on your own recorded savings."
          />
          <PrimaryButton label="Log in" icon="log-in-outline" onPress={() => router.push('/login')} />
        </View>
      </View>
    );
  }

  const showResult = status === 'done' && !!result;

  return (
    <View style={styles.screen}>
      <SahaiHeader title="Request a Loan" subtitle="Fund" showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.inner, { maxWidth: maxWidth('content') }]}>
            {showResult ? (
              <LoanResult result={result} onReset={reset} isDesktop={isDesktop} />
            ) : (
              <>
                <View style={styles.intro}>
                  <Text style={styles.introTitle}>What do you need?</Text>
                  <Text style={styles.introBody}>
                    We check your request against your own savings record and show
                    the treasurer a risk indicator.
                  </Text>
                </View>

                {status === 'error' && !!failure && <ErrorNotice error={failure} />}

                <StepSection number="01" title="The loan">
                  <View style={[styles.pair, isDesktop && styles.pairDesktop]}>
                    <InputField
                      label="Amount"
                      value={amount}
                      onChangeText={(text) => {
                        setAmount(text);
                        setErrors((prev) => ({ ...prev, amount: undefined }));
                      }}
                      placeholder="60000"
                      unit="₹"
                      error={errors.amount}
                      required
                      keyboardType="decimal-pad"
                      editable={!loading}
                      style={isDesktop && styles.pairCell}
                    />
                    <InputField
                      label="Over how many months?"
                      value={term}
                      onChangeText={(text) => {
                        setTerm(text);
                        setErrors((prev) => ({ ...prev, term: undefined }));
                      }}
                      placeholder="12"
                      unit="months"
                      error={errors.term}
                      required
                      keyboardType="number-pad"
                      editable={!loading}
                      style={isDesktop && styles.pairCell}
                    />
                  </View>
                </StepSection>

                <StepSection number="02" title="What it is for">
                  <SelectField
                    label="Purpose"
                    value={sector}
                    onChange={setSector}
                    options={SECTORS}
                    scroll
                    required
                    disabled={loading}
                  />
                  <SelectField
                    label="How often will you repay?"
                    value={interval}
                    onChange={setInterval}
                    options={REPAYMENT_INTERVALS}
                    required
                    disabled={loading}
                  />
                </StepSection>

                {/* Set expectations before the result, not after it. */}
                <View style={styles.noteStrip}>
                  <Ionicons name="lock-closed" size={15} color={Colors.secondary} />
                  <Text style={styles.noteStripText}>
                    Your savings regularity is read from the group ledger. You cannot
                    change it here, and neither can anyone else.
                  </Text>
                </View>

                {loading ? (
                  <LoadingState message="Reviewing your request..." />
                ) : (
                  <PrimaryButton label="Check my request" onPress={submit} />
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function LoanResult({ result, onReset, isDesktop }) {
  const presentation = RISK_PRESENTATION[result.riskLabel] || RISK_PRESENTATION.MEDIUM;
  const { savingsDetail } = result;

  const heroReveal = useReveal(true);
  const savingsReveal = useReveal(true, Motion.stagger * 2);
  const consistency = useCountUp(result.savingsConsistencyPercent, {
    enabled: !savingsDetail.isEstimated,
  });

  return (
    <>
      {/* Verdict first, in words. */}
      <Animated.View style={[styles.resultHero, heroReveal]}>
        <Text style={styles.resultEyebrow}>Loan screening</Text>
        <View style={styles.resultHeadRow}>
          <Ionicons
            name={presentation.icon}
            size={26}
            color={
              presentation.tone === 'success'
                ? Colors.success
                : presentation.tone === 'warning'
                  ? Colors.warning
                  : Colors.error
            }
          />
          <Text style={[styles.resultHeadline, isDesktop && styles.resultHeadlineDesktop]}>
            {presentation.headline}
          </Text>
        </View>
        <StatusBadge label={`${result.riskLabel} RISK`} tone={presentation.tone} />

        <View style={styles.meterWrap}>
          <RiskMeter
            percent={result.riskPercent}
            label={result.riskLabel}
            threshold={(result.decisionThreshold || 0) * 100}
          />
        </View>
      </Animated.View>

      {/* The differentiator: her own ledger history. */}
      <Animated.View style={[styles.savingsBlock, savingsReveal]}>
        <Backdrop variant="fund" height={180} lines={6} />

        <View style={styles.savingsHead}>
          <Text style={styles.savingsLabel}>Your savings history</Text>
          <StatusBadge label="From your ledger" tone="accent" icon="lock-closed" size="sm" />
        </View>

        {savingsDetail.isEstimated ? (
          /* Too little history: say so, rather than show a 50% that looks
             measured. The number exists, but presenting it would imply a
             finding the data cannot support. */
          <>
            <Text style={styles.estimatedHeadline}>Not enough savings history yet</Text>
            <Text style={styles.savingsBody}>
              A neutral starting value is being used for this assessment. As more
              of your deposits are recorded, this becomes a real measure of your
              own saving.
            </Text>
            {!!savingsDetail.basis && <Text style={styles.savingsBasis}>{savingsDetail.basis}</Text>}
          </>
        ) : (
          <>
            <Text
              style={[
                styles.savingsValue,
                {
                  color:
                    result.savingsConsistencyPercent >= 70 ? Colors.secondary : Colors.warning,
                },
              ]}
            >
              {Math.round(consistency)}%
            </Text>
            <Text style={styles.savingsCaption}>savings regularity</Text>
            {!!savingsDetail.basis && <Text style={styles.savingsBasis}>{savingsDetail.basis}</Text>}

            <View style={styles.subScores}>
              {savingsDetail.intervalRegularity !== null && (
                <View style={styles.subScoreRow}>
                  <Text style={styles.subScoreLabel}>How evenly spaced</Text>
                  <Text style={styles.subScoreValue}>
                    {Math.round(savingsDetail.intervalRegularity * 100)}%
                  </Text>
                </View>
              )}
              {savingsDetail.amountRegularity !== null && (
                <View style={[styles.subScoreRow, styles.subScoreLast]}>
                  <Text style={styles.subScoreLabel}>How even the amounts</Text>
                  <Text style={styles.subScoreValue}>
                    {Math.round(savingsDetail.amountRegularity * 100)}%
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </Animated.View>

      {/* The request itself, on ruled lines. */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Your request</Text>
        <View style={styles.detailList}>
          {[
            { label: 'Amount', value: formatCurrency(result.request.amount) },
            { label: 'Duration', value: `${result.request.termInMonths} months` },
            { label: 'Purpose', value: result.request.sector },
            { label: 'Repaying', value: result.request.repaymentInterval },
          ].map((row, index, all) => (
            <View
              key={row.label}
              style={[styles.detailRow, index === all.length - 1 && styles.detailRowLast]}
            >
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Rendered verbatim: the backend's own statement of what this means. */}
      <View style={styles.noteStrip}>
        <Ionicons name="information-circle" size={15} color={Colors.secondary} />
        <Text style={styles.noteStripText}>{result.note}</Text>
      </View>

      {/* Honest about the model's limits, without dominating the screen. */}
      <View style={styles.modelBlock}>
        <Text style={styles.sectionLabel}>About this assessment</Text>
        <Text style={styles.modelBody}>
          {result.model.type} model, validation AUC {result.model.valAuc}.
          {result.model.labelIsSynthetic
            ? ' Its training labels are derived rather than observed repayment outcomes, so treat the score as a screening signal, not a prediction of whether a loan will be repaid.'
            : ''}
        </Text>
      </View>

      <SecondaryButton label="Request another" icon="refresh" onPress={onReset} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.section },
  inner: { width: '100%', alignSelf: 'center', gap: Spacing.xl },
  gate: { flex: 1, justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },

  intro: { gap: Spacing.xs, paddingTop: Spacing.sm },
  introTitle: { ...Typography.heading },
  introBody: { ...Typography.bodySmall, lineHeight: 21, maxWidth: 400 },

  pair: { gap: Spacing.lg },
  pairDesktop: { flexDirection: 'row' },
  pairCell: { flex: 1 },

  noteStrip: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceAlt,
    padding: Spacing.md,
    borderRadius: Radius.sm,
  },
  noteStripText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },

  // ---- result ----
  resultHero: { gap: Spacing.md, paddingTop: Spacing.sm },
  resultEyebrow: { ...Typography.sectionLabel, color: Colors.accent },
  resultHeadRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  resultHeadline: { ...Typography.heading, flex: 1 },
  resultHeadlineDesktop: { fontSize: 34 },
  meterWrap: { marginTop: Spacing.md },

  savingsBlock: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: Radius.hero,
    padding: Spacing.xl,
    gap: Spacing.xs,
    overflow: 'hidden',
  },
  savingsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  savingsLabel: { ...Typography.sectionLabel },
  savingsValue: {
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '700',
    letterSpacing: -1.8,
    fontVariant: ['tabular-nums'],
  },
  savingsCaption: { ...Typography.bodySmall, marginTop: -Spacing.xs },
  savingsBasis: { ...Typography.caption, marginTop: Spacing.sm },
  savingsBody: { ...Typography.bodySmall, lineHeight: 21 },
  estimatedHeadline: { ...Typography.title, color: Colors.warning, marginBottom: Spacing.xs },
  subScores: { marginTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border },
  subScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  subScoreLast: { borderBottomWidth: 0 },
  subScoreLabel: { ...Typography.bodySmall },
  subScoreValue: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },

  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.sectionLabel },
  detailList: { borderTopWidth: 1, borderTopColor: Colors.border },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { ...Typography.bodySmall },
  detailValue: { ...Typography.body, fontWeight: '600', textTransform: 'capitalize' },

  modelBlock: { gap: Spacing.xs },
  modelBody: { ...Typography.caption, lineHeight: 17 },
});
