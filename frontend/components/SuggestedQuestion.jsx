import { Text, StyleSheet, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize } from '../constants/Theme';

/**
 * A tappable starter question. Tapping sends it straight away rather than
 * filling the composer, so the conversation moves in one tap.
 */
export default function SuggestedQuestion({ label, icon, onPress, disabled = false, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {!!icon && (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={14} color={Colors.secondary} />
        </View>
      )}
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flexShrink: 1,
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.text,
  },
  pressed: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.accent,
  },
  disabled: {
    opacity: 0.5,
  },
});
