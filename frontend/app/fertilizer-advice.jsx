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
import Backdrop from '../components/Backdrop';
import StepSection from '../components/StepSection';
import LoadingState from '../components/LoadingState';
import { useBreakpoint } from '../utils/layout';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import FertilizerResult from '../components/FertilizerResult';
import ErrorNotice from '../components/ErrorNotice';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography } from '../constants/Theme';
import { validateNumber } from '../utils/validation';
import { getFertilizerOptions, recommendFertilizer } from '../services/fertilizerService';

/**
 * Standalone Fertilizer -- for someone who already knows their crop.
 *
 * Public, like Crop Advisor: no account needed.
 *
 * The crop and soil lists are NOT hardcoded. They are read from
 * GET /fertilizer/options, which returns the trained model's own encoder
 * categories, so a user can only pick something the model was actually fitted
 * on. An unrecognised category does not error -- OneHotEncoder is set to
 * ignore it -- and the model would return a confident-looking answer driven by
 * NPK alone. Populating from the backend is what stops that silent wrong
 * answer.
 *
 * Every field below is required by POST /recommend-fertilizer. The old version
 * of this screen collected four values and sent them to an endpoint that needs
 * eight, which could only ever have produced a 422.
 */

const NUMERIC_FIELDS = [
  { name: 'temperature', label: 'Temperature', unit: '°C', placeholder: '26', min: -5, max: 60 },
  { name: 'humidity', label: 'Humidity', unit: '%', placeholder: '52', min: 0, max: 100 },
  { name: 'moisture', label: 'Soil Moisture', unit: '%', placeholder: '38', min: 0, max: 100 },
  { name: 'nitrogen', label: 'Nitrogen', unit: '', placeholder: '24', min: 0, max: 150 },
  { name: 'phosphorus', label: 'Phosphorous', unit: '', placeholder: '18', min: 0, max: 150 },
  { name: 'potassium', label: 'Potassium', unit: '', placeholder: '12', min: 0, max: 150 },
];

const EMPTY = NUMERIC_FIELDS.reduce((acc, f) => ({ ...acc, [f.name]: '' }), {});

export default function FertilizerAdviceScreen() {
  const { isDesktop, maxWidth } = useBreakpoint();
  const [values, setValues] = useState(EMPTY);
  const [soilType, setSoilType] = useState('');
  const [cropType, setCropType] = useState('');
  const [errors, setErrors] = useState({});

  const [options, setOptions] = useState(null);
  const [optionsError, setOptionsError] = useState(null);

  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);

  const loading = status === 'loading';

  const loadOptions = async () => {
    setOptionsError(null);
    try {
      const data = await getFertilizerOptions();
      setOptions(data);
      // Default to the first real option rather than inventing one.
      if (!soilType && data.soilTypes.length) setSoilType(data.soilTypes[0]);
      if (!cropType && data.cropTypes.length) setCropType(data.cropTypes[0]);
    } catch (error) {
      setOptionsError(error);
    }
  };

  useEffect(() => {
    loadOptions();
    // Options are fetched once; they only change when the model is retrained.
  }, []);

  const setField = (name) => (text) => {
    setValues((prev) => ({ ...prev, [name]: text }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const validate = () => {
    const found = {};
    NUMERIC_FIELDS.forEach((field) => {
      const message = validateNumber(values[field.name], field);
      if (message) found[field.name] = message;
    });
    if (!cropType) found.cropType = 'Choose a crop.';
    if (!soilType) found.soilType = 'Choose a soil type.';
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const submit = async () => {
    if (loading || !validate()) return;

    setStatus('loading');
    setFailure(null);
    try {
      setResult(await recommendFertilizer({ ...values, soilType, cropType }));
      setStatus('done');
    } catch (error) {
      setFailure(error);
      setStatus('error');
    }
  };

  const reset = () => {
    setValues(EMPTY);
    setErrors({});
    setResult(null);
    setStatus('idle');
    setFailure(null);
  };

  const showResult = status === 'done' && !!result;

  // The guideline-only crops the model cannot predict, offered alongside the
  // model's own list so a mango grower is not simply stuck.
  const cropChoices = options
    ? [...options.cropTypes, ...options.guidelineOnlyCrops]
    : [];

  return (
    <View style={styles.screen}>
      <SahaiHeader title="Fertilizer Advice" subtitle="Field" showBack />

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
              <>
                <FertilizerResult fertilizer={result} />
                <SecondaryButton label="Try another" icon="refresh" onPress={reset} />
              </>
            ) : (
              <>
                <View style={styles.intro}>
                  <Backdrop variant="field" height={150} />
                  <Text style={styles.eyebrow}>Field</Text>
                  <Text style={styles.introTitle}>Fertilizer advice</Text>
                  <Text style={styles.subtitle}>
                    Already know what you&apos;re growing? Enter your crop and field
                    readings for a grade.
                  </Text>
                </View>

                {status === 'error' && !!failure && <ErrorNotice error={failure} />}
                {!!optionsError && (
                  <ErrorNotice
                    error={optionsError}
                    message="Could not load the crop and soil lists from the server."
                    onRetry={loadOptions}
                  />
                )}

                {!options && !optionsError && (
                  <LoadingState message="Loading crop and soil options..." />
                )}

                {!!options && (
                  <>
                    <StepSection number="01" title="Your crop">
                      <SelectField
                        label="Crop"
                        value={cropType}
                        onChange={(next) => {
                          setCropType(next);
                          setErrors((prev) => ({ ...prev, cropType: undefined }));
                        }}
                        options={cropChoices}
                        error={errors.cropType}
                        helper="These are the crops the recommender knows."
                        required
                        disabled={loading}
                      />
                      <SelectField
                        label="Soil Type"
                        value={soilType}
                        onChange={(next) => {
                          setSoilType(next);
                          setErrors((prev) => ({ ...prev, soilType: undefined }));
                        }}
                        options={options.soilTypes}
                        error={errors.soilType}
                        required
                        disabled={loading}
                      />
                    </StepSection>

                    <StepSection
                      number="02"
                      title="Field readings"
                      hint="From a soil test, your agriculture centre or a field sensor. All six are needed."
                    >
                      <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
                      {NUMERIC_FIELDS.map((field) => (
                        <InputField
                          key={field.name}
                          label={field.label}
                          value={values[field.name]}
                          onChangeText={setField(field.name)}
                          placeholder={field.placeholder}
                          unit={field.unit || undefined}
                          error={errors[field.name]}
                          required
                          keyboardType="decimal-pad"
                          editable={!loading}
                          style={isDesktop && styles.gridCell}
                        />
                      ))}
                      </View>
                    </StepSection>

                    <View style={styles.hintRow}>
                      <Ionicons name="leaf-outline" size={16} color={Colors.secondary} />
                      <Text style={styles.hintText}>
                        Not sure which crop to plant? Crop Advisor suggests one from
                        your soil and weather.
                      </Text>
                    </View>

                    {loading ? (
                      <LoadingState message="Checking your field..." />
                    ) : (
                      <PrimaryButton label="Recommend fertilizer" onPress={submit} />
                    )}
                  </>
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
  subtitle: { ...Typography.bodySmall, lineHeight: 21 },
  intro: { paddingVertical: Spacing.lg, gap: Spacing.xs, overflow: 'hidden' },
  eyebrow: { ...Typography.sectionLabel, color: Colors.accent },
  introTitle: { ...Typography.heading },
  grid: { gap: Spacing.lg },
  gridDesktop: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { flexBasis: '47%', flexGrow: 1 },

  hintRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  hintText: { ...Typography.caption, flex: 1, lineHeight: 17 },
});
