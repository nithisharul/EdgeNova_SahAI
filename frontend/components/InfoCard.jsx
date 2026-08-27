import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, CardBase, Shadow } from '../constants/Theme';

/**
 * General purpose white card.
 *
 * Used both as a plain container (pass children) and as a tappable hub tile
 * (pass title/description/onPress), which is how the Farm and Finance
 * sections list their features.
 */
export default function InfoCard({
  title,
  description,
  icon,
  onPress,
  children,
  rightElement,
  showChevron = true,
  style,
}) {
  const body = (
    <>
      {(!!icon || !!title) && (
        <View style={styles.header}>
          {!!icon && (
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={20} color={Colors.secondary} />
            </View>
          )}
          <View style={styles.headerText}>
            {!!title && <Text style={styles.title}>{title}</Text>}
            {!!description && <Text style={styles.description}>{description}</Text>}
          </View>
          {rightElement ??
            (!!onPress && showChevron && (
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            ))}
        </View>
      )}
      {children}
    </>
  );

  if (!onPress) {
    return <View style={[styles.card, style]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...CardBase,
    ...Shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.subtitle,
  },
  description: {
    ...Typography.bodySmall,
  },
  pressed: {
    opacity: 0.7,
  },
});
