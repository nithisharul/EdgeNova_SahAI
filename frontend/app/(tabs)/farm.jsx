import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import SahaiHeader from '../../components/SahaiHeader';
import InfoCard from '../../components/InfoCard';
import SectionHeader from '../../components/SectionHeader';
import StatusBadge from '../../components/StatusBadge';
import Colors from '../../constants/Colors';
import { Spacing, Typography } from '../../constants/Theme';

/**
 * Farm hub: the entry point for every agriculture feature.
 *
 * The first two cards are live this phase; the last two are signposted as
 * upcoming so the section still reads as a complete module.
 */
const FEATURES = [
  {
    id: 'crop',
    title: 'Crop Recommendation',
    description: 'Find the crop best suited to your soil and climate.',
    icon: 'leaf',
    route: '/crop-recommendation',
    ready: true,
  },
  {
    id: 'fertilizer',
    title: 'Fertilizer Advice',
    description: 'Get fertilizer guidance based on crop and soil nutrients.',
    icon: 'flask',
    route: '/fertilizer-advice',
    ready: true,
  },
  {
    id: 'crop-health',
    title: 'Crop Health',
    description: 'Monitor crop health and field conditions.',
    icon: 'pulse',
    route: '/crop-health',
    ready: false,
  },
  {
    id: 'my-land',
    title: 'My Land',
    description: 'View your farm profile and land information.',
    icon: 'map',
    route: '/my-land',
    ready: false,
  },
];

export default function FarmScreen() {
  const go = (route) => router.push(route);

  return (
    <View style={styles.screen}>
      <SahaiHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <View style={styles.intro}>
            <Text style={styles.title}>Farm</Text>
            <Text style={styles.subtitle}>
              Soil and climate tools that turn field data into a decision.
            </Text>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Available Now" caption="Backed by SahAI recommendations" />
            {FEATURES.filter((f) => f.ready).map((feature) => (
              <InfoCard
                key={feature.id}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                onPress={() => go(feature.route)}
              />
            ))}
          </View>

          <View style={styles.section}>
            <SectionHeader title="Coming Soon" caption="Planned for a later release" />
            {FEATURES.filter((f) => !f.ready).map((feature) => (
              <InfoCard
                key={feature.id}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                onPress={() => go(feature.route)}
                rightElement={<StatusBadge label="Soon" tone="neutral" size="sm" />}
              />
            ))}
          </View>
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
    paddingBottom: Spacing.xxxl,
  },
  inner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  intro: {
    gap: Spacing.xs,
  },
  title: {
    ...Typography.heading,
    color: Colors.primary,
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  section: {
    gap: Spacing.md,
  },
});
