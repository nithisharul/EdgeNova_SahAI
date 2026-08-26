import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography, CardBase, Shadow } from '../constants/Theme';
import StatusBadge from './StatusBadge';

/**
 * Result card for model-driven output: crop and fertilizer recommendations,
 * loan risk verdicts and dashboard insights.
 *
 * The accent stripe down the left edge marks a card as model output rather
 * than plain data. `stats` renders a row of supporting figures, and
 * `highlights` renders the ticked reasoning list.
 */
export default function RecommendationCard({
  title,
  icon = 'sparkles',
  badge,
  badgeTone = 'success',
  headline,
  subheadline,
  message,
  stats = [],
  highlights = [],
  tone = 'success',
  footer,
  onPress,
  style,
}) {
  const accent = ACCENTS[tone] || ACCENTS.success;

  const body = (
    <>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconWrap, { backgroundColor: Colors.accentSoft }]}>
            <Ionicons name={icon} size={16} color={accent} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        {!!badge && <StatusBadge label={badge} tone={badgeTone} />}
      </View>

      {!!headline && (
        <Text style={[styles.headline, { color: accent }]} numberOfLines={2} adjustsFontSizeToFit>
          {headline}
        </Text>
      )}
      {!!subheadline && <Text style={styles.subheadline}>{subheadline}</Text>}
      {!!message && <Text style={styles.message}>{message}</Text>}

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
              <Ionicons name="checkmark-circle" size={16} color={accent} />
              <Text style={styles.highlightText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {footer}
    </>
  );

  // A plain View must never receive a style callback, so the static and
  // tappable variants are built separately.
  if (!onPress) {
    return <View style={[styles.card, { borderLeftColor: accent }, style]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, headline].filter(Boolean).join(', ')}
      style={({ pressed }) => [styles.card, { borderLeftColor: accent }, pressed && styles.pressed, style]}
    >
      {body}
    </Pressable>
  );
}

const ACCENTS = {
  success: Colors.success,
  warning: Colors.warning,
  error: Colors.error,
  info: Colors.info,
};

const styles = StyleSheet.create({
  card: {
    ...CardBase,
    ...Shadow.card,
    borderLeftWidth: 3,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.sectionLabel,
    flexShrink: 1,
  },
  headline: {
    fontSize: FontSize.heading,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  subheadline: {
    ...Typography.subtitle,
    marginTop: -Spacing.sm,
  },
  message: {
    ...Typography.bodySmall,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stat: {
    gap: 2,
    minWidth: 90,
  },
  statLabel: {
    ...Typography.caption,
  },
  statValue: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: Colors.text,
  },
  highlights: {
    gap: Spacing.sm,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  highlightText: {
    ...Typography.bodySmall,
    color: Colors.text,
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
