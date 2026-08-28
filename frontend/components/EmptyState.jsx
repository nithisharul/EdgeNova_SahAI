import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography } from '../constants/Theme';

/**
 * Nothing here yet, and why.
 *
 * An empty screen in this product is usually correct rather than broken: a
 * fresh group genuinely has no ledger entries. So the wording says what will
 * fill it and who fills it, instead of apologising or -- far worse -- seeding
 * sample rows to make the screen look busy.
 *
 * Small and quiet on purpose. An oversized illustration would give absence more
 * visual weight than the real content it is standing in for.
 */
export default function EmptyState({ icon = 'ellipse-outline', title, body, action, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={Colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!body && <Text style={styles.body}>{body}</Text>}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.subtitle,
    textAlign: 'center',
  },
  body: {
    ...Typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
});
