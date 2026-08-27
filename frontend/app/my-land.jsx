import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../components/SahaiHeader';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import SecondaryButton from '../components/SecondaryButton';
import ProgressBar from '../components/ProgressBar';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, CardBase, Shadow, FontSize } from '../constants/Theme';
import { formatDate } from '../utils/datetime';
import { farmProfile, fieldSections } from '../data/mockLandData';

/**
 * Farm profile.
 *
 * The layout strip is a schematic, not a map: each section is a block whose
 * width is its share of the holding. That keeps the screen honest about the
 * fact that no location data or map SDK is involved.
 */

/** "1 acre" but "1.8 acres" -- the plural has to follow the number. */
const acres = (value) => `${value} ${value === 1 ? 'acre' : 'acres'}`;

/** One label/value pair in the profile card. */
function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const BLOCK_TONES = {
  success: Colors.accent,
  warning: Colors.warning,
  error: Colors.error,
};

export default function MyLandScreen() {
  const total = farmProfile.totalAcres;

  return (
    <View style={styles.screen}>
      <SahaiHeader title="My Land" subtitle="Agriculture" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <Text style={styles.subtitle}>
            Your farm profile, so recommendations arrive already tuned to your plots.
          </Text>

          {/* Profile ---------------------------------------------------- */}
          <View style={styles.card}>
            <View style={styles.profileHeader}>
              <View style={styles.profileIcon}>
                <Ionicons name="map" size={22} color={Colors.secondary} />
              </View>
              <View style={styles.profileText}>
                <Text style={styles.farmName} numberOfLines={1}>
                  {farmProfile.farmName}
                </Text>
                <Text style={styles.farmMeta}>
                  {farmProfile.village} · {farmProfile.season}
                </Text>
              </View>
              <StatusBadge label={acres(total)} tone="accent" size="sm" />
            </View>

            <View style={styles.detailGrid}>
              <DetailRow label="Primary Crop" value={farmProfile.primaryCrop} />
              <DetailRow label="Soil Type" value={farmProfile.soilType} />
              <DetailRow label="Irrigation" value={farmProfile.irrigation} />
              <DetailRow label="Village" value={farmProfile.village} />
            </View>
          </View>

          {/* Layout schematic ------------------------------------------- */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Layout · by share of the holding</Text>
            <View style={styles.strip}>
              {fieldSections.map((section) => (
                <View
                  key={section.id}
                  style={[
                    styles.block,
                    {
                      flex: section.acres,
                      backgroundColor: BLOCK_TONES[section.tone] || Colors.accent,
                    },
                  ]}
                >
                  <Text style={styles.blockName} numberOfLines={1}>
                    {section.name}
                  </Text>
                  <Text style={styles.blockAcres}>{acres(section.acres)}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.schematicNote}>
              A schematic of relative plot size, not a map. Colour follows the plot status.
            </Text>
          </View>

          {/* Sections --------------------------------------------------- */}
          <View style={styles.section}>
            <SectionHeader title="Field Sections" caption="Status matches Crop Health" />
            {fieldSections.map((section) => (
              <View key={section.id} style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.profileText}>
                    <Text style={styles.sectionName} numberOfLines={1}>
                      {section.name}
                    </Text>
                    <Text style={styles.sectionMeta}>
                      {acres(section.acres)} · {section.crop}
                    </Text>
                  </View>
                  {!!section.status && (
                    <StatusBadge label={section.status} tone={section.tone} size="sm" />
                  )}
                </View>

                <ProgressBar
                  label="Share of holding"
                  valueLabel={`${Math.round((section.acres / total) * 100)}%`}
                  value={(section.acres / total) * 100}
                  tone={section.tone}
                />

                <View style={styles.sectionFooter}>
                  <Text style={styles.footerLabel}>Sown</Text>
                  <Text style={styles.footerValue}>{formatDate(section.sownOn)}</Text>
                </View>
              </View>
            ))}
          </View>

          <SecondaryButton
            label="View Crop Health"
            icon="pulse"
            onPress={() => router.push('/crop-health')}
          />

          <Text style={styles.demoNote}>
            Demo farm record. Editing land details is not connected yet.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  inner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  subtitle: { ...Typography.bodySmall, lineHeight: 21 },
  card: {
    ...CardBase,
    ...Shadow.card,
    gap: Spacing.md,
  },
  cardTitle: { ...Typography.sectionLabel },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1, minWidth: 0, gap: 2 },
  farmName: { ...Typography.title, fontSize: FontSize.subtitle },
  farmMeta: { ...Typography.caption },
  detailGrid: {
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  detailLabel: { ...Typography.bodySmall },
  detailValue: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  strip: {
    flexDirection: 'row',
    gap: Spacing.xs,
    height: 72,
  },
  block: {
    minWidth: 0,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xs,
  },
  blockName: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textOnPrimary,
    textAlign: 'center',
  },
  blockAcres: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.textOnPrimary,
    opacity: 0.9,
    marginTop: 2,
  },
  schematicNote: { ...Typography.caption, fontStyle: 'italic' },
  section: { gap: Spacing.md },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  sectionName: { ...Typography.subtitle, fontSize: FontSize.body },
  sectionMeta: { ...Typography.caption },
  sectionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  footerLabel: { ...Typography.caption },
  footerValue: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.text,
  },
  demoNote: { ...Typography.caption, textAlign: 'center' },
});
