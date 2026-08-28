import { Animated, View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../../components/SahaiHeader';
import Backdrop from '../../components/Backdrop';
import Colors from '../../constants/Colors';
import { Spacing, Radius, Typography } from '../../constants/Theme';
import { useBreakpoint } from '../../utils/layout';
import { useReveal } from '../../utils/motion';
import { getLastAdvisory } from '../../services/sessionState';

/**
 * Farm -- the Field half of "Field to Fund".
 *
 * Everything here works signed out, which is the point: a farmer should get
 * something useful from SahAI before being asked to create an account.
 *
 * The recap strip only appears once a REAL advisory has run this session.
 * There is no placeholder crop and no sample confidence: empty is shown empty.
 */

const ACTIONS = [
  {
    id: 'crop-advisor',
    label: 'Crop advisor',
    caption: 'Which crop suits your field, and the fertilizer for it',
    icon: 'leaf',
    route: '/crop-advisor',
  },
  {
    id: 'fertilizer',
    label: 'Fertilizer advice',
    caption: 'Already know your crop? Get the grade',
    icon: 'flask',
    route: '/fertilizer-advice',
  },
  {
    id: 'my-land',
    label: 'My land',
    caption: 'Your field profile and plot layout',
    icon: 'map',
    route: '/my-land',
  },
];

export default function FarmScreen() {
  const advisory = getLastAdvisory();
  const { maxWidth } = useBreakpoint();
  const reveal = useReveal(true);

  return (
    <View style={styles.screen}>
      <SahaiHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.inner, { maxWidth: maxWidth('content') }, reveal]}>
          <View style={styles.intro}>
            <Backdrop variant="field" height={190} />
            <Text style={styles.eyebrow}>Field</Text>
            <Text style={styles.title}>Your field</Text>
            <Text style={styles.subtitle}>
              Crop and fertilizer advice from your soil and local weather. No
              account needed.
            </Text>
          </View>

          {/* The last real advisory, if one was run. */}
          {!!advisory?.crop?.name && (
            <Pressable
              onPress={() => router.push('/crop-advisor')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.recap, pressed && styles.pressed]}
            >
              <View style={styles.recapHead}>
                <Text style={styles.recapLabel}>Your latest advice</Text>
                <Text style={styles.recapMatch}>
                  {Math.round((advisory.crop.confidence || 0) * 100)}%
                </Text>
              </View>
              <Text style={styles.recapCrop}>{String(advisory.crop.name).toUpperCase()}</Text>
              {!!advisory.why?.summary && (
                <Text style={styles.recapWhy} numberOfLines={2}>
                  {advisory.why.summary}
                </Text>
              )}
              {advisory.needsSoilTest && (
                <Text style={styles.recapNote}>Add a soil test for fertilizer advice.</Text>
              )}
            </Pressable>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Agriculture</Text>
            <View style={styles.list}>
              {ACTIONS.map((action, index) => (
                <Pressable
                  key={action.id}
                  onPress={() => router.push(action.route)}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  style={({ pressed }) => [
                    styles.row,
                    index === ACTIONS.length - 1 && styles.rowLast,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons name={action.icon} size={18} color={Colors.secondary} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{action.label}</Text>
                    <Text style={styles.rowCaption}>{action.caption}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={styles.footnote}>
            Soil values come from a soil test, your agriculture centre, or a field
            sensor. SahAI never guesses them.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.section },
  inner: { width: '100%', alignSelf: 'center', gap: Spacing.xl },

  intro: { paddingVertical: Spacing.lg, gap: Spacing.xs, overflow: 'hidden' },
  eyebrow: { ...Typography.sectionLabel, color: Colors.accent },
  title: { ...Typography.heading },
  subtitle: { ...Typography.bodySmall, lineHeight: 21, maxWidth: 400 },

  recap: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  recapHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  recapLabel: { ...Typography.sectionLabel },
  recapMatch: {
    ...Typography.subtitle,
    color: Colors.accent,
    fontVariant: ['tabular-nums'],
  },
  recapCrop: { ...Typography.title, color: Colors.secondary },
  recapWhy: { ...Typography.bodySmall, lineHeight: 20 },
  recapNote: { ...Typography.caption, color: Colors.info },

  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.sectionLabel },
  list: { borderTopWidth: 1, borderTopColor: Colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 1 },
  rowLabel: { ...Typography.body, fontWeight: '600' },
  rowCaption: { ...Typography.caption },
  pressed: { opacity: 0.6 },

  footnote: { ...Typography.caption, lineHeight: 17 },
});
