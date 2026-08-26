import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize } from '../constants/Theme';

/** Outlined button for the lower-priority action next to a PrimaryButton. */
export default function SecondaryButton({
  label,
  onPress,
  disabled = false,
  icon,
  fullWidth = true,
  style,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {!!icon && <Ionicons name={icon} size={18} color={Colors.secondary} />}
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md + 1,
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
    color: Colors.secondary,
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  pressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  disabled: {
    borderColor: Colors.borderStrong,
    opacity: 0.5,
  },
});
