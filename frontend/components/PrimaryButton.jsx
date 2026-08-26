import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize } from '../constants/Theme';

/**
 * Filled call-to-action button.
 *
 * Handles its own loading state so screens can pass the pending flag from a
 * service call straight in -- the button disables itself while busy.
 */
export default function PrimaryButton({
  label,
  onPress,
  loading = false,
  loadingLabel = 'Working...',
  disabled = false,
  icon,
  fullWidth = true,
  style,
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        loading && styles.loading,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <View style={styles.content}>
          <ActivityIndicator size="small" color={Colors.textOnPrimary} />
          <Text style={styles.label}>{loadingLabel}</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {!!icon && (
            <Ionicons
              name={icon}
              size={18}
              color={disabled ? Colors.textMuted : Colors.textOnPrimary}
            />
          )}
          <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  label: {
    color: Colors.textOnPrimary,
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  loading: {
    opacity: 0.9,
  },
  disabled: {
    backgroundColor: Colors.surfaceMuted,
  },
  labelDisabled: {
    color: Colors.textMuted,
  },
});
