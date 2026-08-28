import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography } from '../constants/Theme';

/**
 * Choose one value from a short, known list.
 *
 * Chips rather than a dropdown: every option stays visible, the tap target is
 * large enough for a thumb in a field, and it needs no picker dependency. Long
 * lists (the fifteen loan sectors) scroll horizontally instead of wrapping into
 * a wall.
 *
 * `options` accepts plain strings or { value, label } pairs, because most of
 * these lists come straight from the backend as strings and should not have to
 * be reshaped at the call site.
 */
export default function SelectField({
  label,
  value,
  onChange,
  options = [],
  required = false,
  error,
  helper,
  disabled = false,
  scroll = false,
  style,
}) {
  const items = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option
  );

  const chips = items.map((item) => {
    const active = value === item.value;
    return (
      <Pressable
        key={item.value}
        onPress={() => !disabled && onChange(item.value)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected: active, disabled }}
        style={({ pressed }) => [
          styles.chip,
          active && styles.chipActive,
          pressed && !disabled && styles.chipPressed,
          disabled && styles.chipDisabled,
        ]}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
          {item.label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View style={[styles.wrapper, style]}>
      {!!label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      {scroll ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRow}
          keyboardShouldPersistTaps="handled"
        >
          {chips}
        </ScrollView>
      ) : (
        <View style={styles.row}>{chips}</View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!error && !!helper && <Text style={styles.helper}>{helper}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.label,
  },
  required: {
    color: Colors.error,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  scrollRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    // 10px vertical on a 14px line keeps the tap target above 44pt.
    paddingVertical: 10,
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
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.secondary,
  },
  error: {
    fontSize: FontSize.caption,
    color: Colors.error,
    fontWeight: '500',
  },
  helper: {
    ...Typography.caption,
    lineHeight: 16,
  },
});
