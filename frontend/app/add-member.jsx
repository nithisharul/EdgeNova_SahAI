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
import { router } from 'expo-router';
import SahaiHeader from '../components/SahaiHeader';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, CardBase, Shadow, FontSize } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import { validateForm } from '../utils/validation';
import { addMember } from '../services/memberService';

const RULES = {
  name: { type: 'text', label: 'Full name', minLength: 3 },
  phone: { type: 'phone', label: 'Phone number' },
  village: { type: 'text', label: 'Village', minLength: 2 },
  initialSavings: { label: 'Initial savings', min: 0, max: 1000000, required: false },
};

const EMPTY = { name: '', phone: '', village: '', initialSavings: '' };

export default function AddMemberScreen() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [created, setCreated] = useState(null);

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
      const member = await addMember(values);
      setCreated(member);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const handleAddAnother = () => {
    setValues(EMPTY);
    setErrors({});
    setCreated(null);
    setStatus('idle');
  };

  const goToMembers = () => router.back();

  if (status === 'done' && created) {
    return (
      <View style={styles.screen}>
        <SahaiHeader title="Add Member" subtitle="Finance" showBack />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.inner}>
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={30} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>Member added successfully</Text>
              <Text style={styles.successBody}>
                {created.name} joined the group as {created.id}
                {created.savings > 0
                  ? ` with ${formatCurrency(created.savings)} in opening savings.`
                  : '.'}
              </Text>
              <Text style={styles.demoNote}>
                Saved for this demo session only — no database is connected yet.
              </Text>
            </View>

            <PrimaryButton label="Back to Members" icon="people" onPress={goToMembers} />
            <SecondaryButton label="Add Another Member" icon="add" onPress={handleAddAnother} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SahaiHeader title="Add Member" subtitle="Finance" showBack />

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
            <Text style={styles.subtitle}>
              Add a new member to the self-help group and record their opening savings.
            </Text>

            {status === 'error' && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color={Colors.error} />
                <Text style={styles.errorBannerText}>
                  Unable to add this member right now. Please try again.
                </Text>
              </View>
            )}

            <View style={styles.form}>
              <InputField
                label="Full Name"
                value={values.name}
                onChangeText={setField('name')}
                placeholder="e.g. Asha Devi"
                error={errors.name}
                required
                autoCapitalize="words"
                editable={!loading}
              />
              <InputField
                label="Phone Number"
                value={values.phone}
                onChangeText={setField('phone')}
                placeholder="10 digit mobile number"
                error={errors.phone}
                required
                keyboardType="phone-pad"
                editable={!loading}
              />
              <InputField
                label="Village"
                value={values.village}
                onChangeText={setField('village')}
                placeholder="e.g. Rampur"
                error={errors.village}
                required
                autoCapitalize="words"
                editable={!loading}
              />
              <InputField
                label="Initial Savings"
                value={values.initialSavings}
                onChangeText={setField('initialSavings')}
                placeholder="0"
                unit="₹"
                helper="Optional — leave blank if there is no opening deposit."
                error={errors.initialSavings}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>

            <PrimaryButton
              label="Add Member"
              icon="person-add"
              loading={loading}
              loadingLabel="Adding member..."
              onPress={handleSubmit}
            />
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
  successCard: {
    ...CardBase,
    ...Shadow.card,
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  successTitle: {
    ...Typography.title,
    fontSize: FontSize.subtitle,
    textAlign: 'center',
  },
  successBody: {
    ...Typography.bodySmall,
    textAlign: 'center',
    lineHeight: 21,
  },
  demoNote: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
