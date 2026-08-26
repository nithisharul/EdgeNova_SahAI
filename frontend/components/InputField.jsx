import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography } from '../constants/Theme';

/**
 * Labelled text input with an inline error slot.
 *
 * The label sits above the field and the border turns green on focus, red
 * when the parent passes a validation error.
 */
export default function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helper,
  unit,
  required = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  editable = true,
  multiline = false,
  style,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {!!label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          !!error && styles.inputRowError,
          !editable && styles.inputRowDisabled,
          multiline && styles.inputRowMultiline,
        ]}
      >
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {!!unit && <Text style={styles.unit}>{unit}</Text>}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!error && !!helper && <Text style={styles.helper}>{helper}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs + 2,
  },
  label: {
    ...Typography.label,
  },
  required: {
    color: Colors.error,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md + 2,
  },
  inputRowFocused: {
    borderColor: Colors.secondary,
  },
  inputRowError: {
    borderColor: Colors.error,
  },
  inputRowDisabled: {
    backgroundColor: Colors.surfaceAlt,
  },
  inputRowMultiline: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSize.body,
    color: Colors.text,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  unit: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  error: {
    fontSize: FontSize.caption,
    color: Colors.error,
    fontWeight: '500',
  },
  helper: {
    ...Typography.caption,
  },
});
