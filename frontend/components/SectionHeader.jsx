import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Typography, FontSize } from '../constants/Theme';

/**
 * Uppercase label above a group of cards, with an optional trailing link
 * ("View all") that navigates to the full screen for that section.
 */
export default function SectionHeader({ title, caption, actionLabel, onActionPress, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {!!caption && <Text style={styles.caption}>{caption}</Text>}
      </View>

      {!!actionLabel && !!onActionPress && (
        <Pressable
          onPress={onActionPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}, ${title}`}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.secondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.sectionLabel,
  },
  caption: {
    ...Typography.caption,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.xs,
  },
  actionLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.secondary,
  },
  pressed: {
    opacity: 0.6,
  },
});
