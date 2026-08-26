import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import SahaiHeader from './SahaiHeader';
import StatusBadge from './StatusBadge';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, CardBase, Shadow, FontSize } from '../constants/Theme';

/**
 * Landing page for a feature that a later phase will build out.
 *
 * Quick actions on the dashboard point here rather than nowhere, so every
 * shortcut still lands on a real, titled screen with working back navigation.
 */
export default function ComingSoonScreen({
  title,
  subtitle,
  phaseLabel,
  icon = 'sparkles',
  description,
  bullets = [],
}) {
  const goHome = () => router.replace('/home');

  return (
    <View style={styles.screen}>
      <SahaiHeader title={title} subtitle={subtitle} showBack />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <View style={styles.card}>
            <View style={styles.iconChip}>
              <Ionicons name={icon} size={26} color={Colors.secondary} />
            </View>

            <StatusBadge label={phaseLabel} tone="accent" icon="time-outline" />

            <Text style={styles.title}>{title}</Text>
            {!!description && <Text style={styles.body}>{description}</Text>}

            {bullets.length > 0 && (
              <View style={styles.bulletList}>
                {bullets.map((item) => (
                  <View key={item} style={styles.bulletRow}>
                    <Ionicons name="ellipse" size={6} color={Colors.accent} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Pressable
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="Back to dashboard"
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Ionicons name="grid-outline" size={18} color={Colors.textOnPrimary} />
            <Text style={styles.buttonLabel}>Back to dashboard</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  inner: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  card: {
    ...CardBase,
    ...Shadow.card,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  iconChip: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.title,
  },
  body: {
    ...Typography.bodySmall,
    lineHeight: 21,
  },
  bulletList: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bulletText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    ...Shadow.card,
  },
  buttonLabel: {
    color: Colors.textOnPrimary,
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
