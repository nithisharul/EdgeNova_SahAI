import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../components/SahaiHeader';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import RecommendationCard from '../components/RecommendationCard';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, FontSize } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import { validateForm, toNumbers } from '../utils/validation';
import { recommendFertilizer } from '../services/fertilizerService';

/**
 * Fertilizer recommendation.
 *
 * Crop is a free text field with quick-pick chips rather than a picker
 * component, which keeps the dependency list unchanged.
 */

const NUMERIC_FIELDS = [
  { name: 'nitrogen', label: 'Nitrogen', unit: 'kg/ha', placeholder: '90', min: 0, max: 500 },
  { name: 'phosphorus', label: 'Phosphorus', unit: 'kg/ha', placeholder: '42', min: 0, max: 500 },
  { name: 'potassium', label: 'Potassium', unit: 'kg/ha', placeholder: '43', min: 0, max: 500 },
  { name: 'ph', label: 'Soil pH', unit: '', placeholder: '6.5', min: 0, max: 14 },
];

/** Common crops offered as one-tap shortcuts above the crop input. */
const COMMON_CROPS = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane'];

const RULES = {
  crop: { type: 'text', label: 'Crop' },
  ...NUMERIC_FIELDS.reduce((acc, f) => {
    acc[f.name] = { label: f.label, min: f.min, max: f.max };
    return acc;
  }, {}),
};

const EMPTY = { crop: '', ...NUMERIC_FIELDS.reduce((a, f) => ({ ...a, [f.name]: '' }), {}) };

export default function FertilizerAdviceScreen() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);

  const loading = status === 'loading';

  const setField = (name) => (text) => {
    setValues((prev) => ({ ...prev, [name]: text }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const handleSubmit = async () => {
    if (loading) return; // guards against a double tap

    const { errors: found, isValid } = validateForm(values, RULES);
    setErrors(found);
    if (!isValid) return;

    setStatus('loading');
    try {
      const numericNames = NUMERIC_FIELDS.map((f) => f.name);
      const payload = await recommendFertilizer({
        crop: values.crop.trim(),
        ...toNumbers(values, numericNames),
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
    setResult(null);
    setStatus('idle');
  };

  const showResult = status === 'done' && !!result;

  return (
    <View style={styles.screen}>
      <SahaiHeader title="Fertilizer Recommendation" subtitle="Agriculture" showBack />

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
                  title="Smart Recommendation"
                  icon="flask"
                  badge={result.input?.crop || 'Recommended'}
                  badgeTone="success"
                  headline={result.fertilizer}
                  message={result.message}
                  stats={[
                    {
                      label: 'Recommended Quantity',
                      value: `${result.quantity} ${result.quantityUnit}`,
                    },
                    {
                      label: 'Estimated Saving',
                      value: formatCurrency(result.estimatedSaving),
                    },
                  ]}
                  highlights={result.actions}
                  tone="success"
                />

                <SecondaryButton
                  label="Try Another Analysis"
                  icon="refresh"
                  onPress={handleReset}
                />
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  Enter your crop and soil nutrient information to receive fertilizer guidance.
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
                  <View style={styles.cropBlock}>
                    <InputField
                      label="Crop"
                      value={values.crop}
                      onChangeText={setField('crop')}
                      placeholder="e.g. Rice"
                      error={errors.crop}
                      required
                      autoCapitalize="words"
                      editable={!loading}
                    />
                    <View style={styles.chipRow}>
                      {COMMON_CROPS.map((crop) => {
                        const active = values.crop.trim().toLowerCase() === crop.toLowerCase();
                        return (
                          <Pressable
                            key={crop}
                            onPress={() => setField('crop')(crop)}
                            disabled={loading}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            style={({ pressed }) => [
                              styles.chip,
                              active && styles.chipActive,
                              pressed && styles.chipPressed,
                            ]}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {crop}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

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
                    />
                  ))}
                </View>

                <PrimaryButton
                  label="Analyse Soil"
                  icon="sparkles"
                  loading={loading}
                  loadingLabel="Analysing nutrient levels..."
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
  cropBlock: {
    gap: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.secondary,
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
});
