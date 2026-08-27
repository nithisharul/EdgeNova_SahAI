import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography, Shadow } from '../constants/Theme';

/**
 * The structured block an Assistant answer can carry: a headline figure, a
 * couple of supporting stats, the reasoning list and one navigation action.
 *
 * Purpose-built for the chat thread rather than reusing RecommendationCard,
 * which is sized for full-width screens and is shared with other phases.
 */

const TONES = {
  success: Colors.success,
  warning: Colors.warning,
  error: Colors.error,
  info: Colors.info,
};

export default function AssistantInsightCard({ card, action, onActionPress, style }) {
  if (!card) return null;

  const accent = TONES[card.tone] || TONES.success;
  const { title, headline, icon, stats = [], highlights = [] } = card;

  return (
    <View style={[styles.card, { borderLeftColor: accent }, style]}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon || 'sparkles'} size={15} color={accent} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {!!headline && (
        <Text style={[styles.headline, { color: accent }]} numberOfLines={2}>
          {headline}
        </Text>
      )}

      {stats.length > 0 && (
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>
      )}

      {highlights.length > 0 && (
        <View style={styles.highlights}>
          {highlights.map((item) => (
            <View key={item} style={styles.highlightRow}>
              <Ionicons name="checkmark-circle" size={14} color={accent} />
              <Text style={styles.highlightText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {!!action && (
        <Pressable
          onPress={onActionPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionLabel}>{action.label}</Text>
          <Ionicons name="arrow-forward" size={14} color={Colors.textOnPrimary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderRadius: Radius.lg,
    padding: Spacing.md + 2,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.sectionLabel,
    flexShrink: 1,
  },
  headline: {
    fontSize: FontSize.title,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stat: {
    gap: 1,
    minWidth: 96,
  },
  statLabel: {
    ...Typography.caption,
    fontSize: 11,
  },
  statValue: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.text,
  },
  highlights: {
    gap: Spacing.xs + 2,
    marginTop: Spacing.xs,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  highlightText: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  actionPressed: {
    opacity: 0.85,
  },
  actionLabel: {
    color: Colors.textOnPrimary,
    fontSize: FontSize.small,
    fontWeight: '600',
  },
});
