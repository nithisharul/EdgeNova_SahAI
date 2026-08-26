import { useState } from 'react';
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
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import RecommendationCard from '../components/RecommendationCard';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, CardBase, Shadow } from '../constants/Theme';
import { validateForm, toNumbers } from '../utils/validation';
import { recommendCrop } from '../services/cropService';

/**
 * Crop recommendation.
 *
 * Form and result share one route: the result replaces the form in place,
 * which avoids serialising a payload through navigation params.
 */

/** Field definitions drive both the rendered inputs and the validation. */
const FIELDS = [
  { name: 'nitrogen', label: 'Nitrogen', unit: 'kg/ha', placeholder: '90', min: 0, max: 500 },
  { name: 'phosphorus', label: 'Phosphorus', unit: 'kg/ha', placeholder: '42', min: 0, max: 500 },
  { name: 'potassium', label: 'Potassium', unit: 'kg/ha', placeholder: '43', min: 0, max: 500 },
  { name: 'temperature', label: 'Temperature', unit: '°C', placeholder: '24', min: 0, max: 60 },
  { name: 'humidity', label: 'Humidity', unit: '%', placeholder: '82', min: 0, max: 100 },
  { name: 'ph', label: 'Soil pH', unit: '', placeholder: '6.5', min: 0, max: 14 },
  { name: 'rainfall', label: 'Rainfall', unit: 'mm', placeholder: '200', min: 0, max: 5000 },
];

const RULES = FIELDS.reduce((acc, f) => {
  acc[f.name] = { label: f.label, min: f.min, max: f.max };
  return acc;
}, {});

const EMPTY = FIELDS.reduce((acc, f) => ({ ...acc, [f.name]: '' }), {});

export default function CropRecommendationScreen() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);

  const loading = status === 'loading';

  const setField = (name) => (text) => {
    setValues((prev) => ({ ...prev, [name]: text }));
    // Clear a field's error as soon as the farmer starts correcting it.
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const handleSubmit = async () => {
    if (loading) return; // guards against a double tap

    const { errors: found, isValid } = validateForm(values, RULES);
    setErrors(found);
    if (!isValid) return;

    setStatus('loading');
    try {
      const payload = await recommendCrop(toNumbers(values, Object.keys(RULES)));
      setResult(payload);
      setStatus('done');
    } catch {
      // The underlying reason stays in the service; the UI shows a calm message.
      setStatus('error');
    }
  };

  const handleReset = () => {
    setValues(EMPTY);
    setErrors({});
    setResult(null);
    setStatus('idle');
  };

  const showResult = status === 'done' && !!result;

  return (
    <View style={styles.screen}>
      <SahaiHeader title="Crop Recommendation" subtitle="Agriculture" showBack />

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
                  title="Recommended Crop"
                  icon="leaf"
                  badge={`${result.confidence}% match`}
                  badgeTone="success"
                  headline={String(result.crop).toUpperCase()}
                  subheadline={`${result.confidence}% Suitability`}
                  message={result.message}
                  highlights={result.factors}
                  tone="success"
                />

                <View style={styles.inputsRecap}>
                  <Text style={styles.recapTitle}>Based on your readings</Text>
                  <View style={styles.recapGrid}>
                    {FIELDS.map((field) => (
                      <View key={field.name} style={styles.recapItem}>
                        <Text style={styles.recapLabel}>{field.label}</Text>
                        <Text style={styles.recapValue}>
                          {values[field.name]}
                          {field.unit ? ` ${field.unit}` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <SecondaryButton
                  label="Try Another Analysis"
                  icon="refresh"
                  onPress={handleReset}
                />
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  Enter your soil and climate conditions to find the best crop for your field.
                </Text>

                {status === 'error' && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={20} color={Colors.error} />
                    <Text style={styles.errorBannerText}>
                      Unable to generate a recommendation right now. Please try again.
                    </Text>
                  </View>
                )}

                <View style={styles.form}>
                  {FIELDS.map((field) => (
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
                    />
                  ))}
                </View>

                <PrimaryButton
                  label="Recommend Crop"
                  icon="sparkles"
                  loading={loading}
                  loadingLabel="Analysing soil conditions..."
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
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  inner: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  subtitle: {
    ...Typography.bodySmall,
    lineHeight: 21,
  },
  form: {
    gap: Spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorSoft,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorBannerText: {
    ...Typography.bodySmall,
    color: Colors.error,
    flex: 1,
  },
  inputsRecap: {
    ...CardBase,
    ...Shadow.card,
    gap: Spacing.md,
  },
  recapTitle: {
    ...Typography.sectionLabel,
  },
  recapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.md,
    columnGap: Spacing.lg,
  },
  recapItem: {
    minWidth: 92,
    gap: 2,
  },
  recapLabel: {
    ...Typography.caption,
  },
  recapValue: {
    ...Typography.body,
    fontWeight: '600',
    fontSize: 15,
  },
});
