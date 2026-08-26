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
 * `ready` splits the list into what a farmer can use now and what is only
 * signposted. Everything is live at the moment, so the second section is
 * skipped rather than rendered as an empty heading.
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
    description: 'See how each plot is doing and what needs attention.',
    icon: 'pulse',
    route: '/crop-health',
    ready: true,
  },
  {
    id: 'my-land',
    title: 'My Land',
    description: 'Your farm profile, plot sizes and field sections.',
    icon: 'map',
    route: '/my-land',
    ready: true,
  },
];

export default function FarmScreen() {
  const go = (route) => router.push(route);

  const available = FEATURES.filter((feature) => feature.ready);
  const upcoming = FEATURES.filter((feature) => !feature.ready);

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
            <SectionHeader title="Available Now" caption="Field tools and farm records" />
            {available.map((feature) => (
              <InfoCard
                key={feature.id}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                onPress={() => go(feature.route)}
              />
            ))}
          </View>

          {upcoming.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Coming Soon" caption="Planned for a later release" />
              {upcoming.map((feature) => (
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
          )}
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
