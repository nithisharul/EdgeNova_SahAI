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
import { formatRelativeDateTime } from '../utils/datetime';
import { fieldHealth, plotHealth, healthIssues } from '../data/mockCropHealthData';

/**
 * Crop health overview.
 *
 * Everything on this screen is a read-out of figures recorded during a field
 * survey -- see data/mockCropHealthData.js. Nothing is inferred here and no
 * image analysis exists anywhere in SahAI, which is why the screen says so
 * rather than implying a model produced these numbers.
 */

/** Health score -> the tone the rest of the app already uses. */
function toneForScore(score) {
  if (score >= 85) return 'success';
  if (score >= 70) return 'warning';
  return 'error';
}

const SEVERITY_TONES = { Low: 'info', Medium: 'warning', High: 'error' };

export default function CropHealthScreen() {
  const overallTone = toneForScore(fieldHealth.overallScore);

  return (
    <View style={styles.screen}>
      <SahaiHeader title="Crop Health" subtitle="Agriculture" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {/* This screen has no backend behind it. The figures below are
              sample content, and the banner says so rather than letting them
              read as records from the group's database. */}
          <View style={styles.previewNotice}>
            <Ionicons name="flask-outline" size={16} color={Colors.warning} />
            <Text style={styles.previewNoticeText}>
              Preview feature. Field health is not stored in the SahAI database yet, so the
              figures below are sample content, not your records.
            </Text>
          </View>


          {/* Overall ---------------------------------------------------- */}
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroText}>
                <Text style={styles.heroLabel}>Overall Field Health</Text>
                <Text style={styles.heroValue}>{fieldHealth.overallScore}%</Text>
              </View>
              <StatusBadge
                label={overallTone === 'success' ? 'Healthy' : 'Needs Attention'}
                tone={overallTone}
                icon="pulse"
              />
            </View>

            <ProgressBar value={fieldHealth.overallScore} tone={overallTone} height={10} />

            <View style={styles.heroFooter}>
              <Text style={styles.heroFooterLabel}>Last surveyed</Text>
              <Text style={styles.heroFooterValue}>
                {formatRelativeDateTime(fieldHealth.lastSurveyed)}
              </Text>
            </View>
          </View>

          {/* Area split ------------------------------------------------- */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Share of monitored area · {fieldHealth.monitoredAcres} acres
            </Text>
            <View style={styles.bars}>
              <ProgressBar
                label="Healthy"
                valueLabel={`${fieldHealth.healthyPercentage}%`}
                value={fieldHealth.healthyPercentage}
                tone="success"
              />
              <ProgressBar
                label="Needs attention"
                valueLabel={`${fieldHealth.warningPercentage}%`}
                value={fieldHealth.warningPercentage}
                tone="warning"
              />
              <ProgressBar
                label="Critical"
                valueLabel={`${fieldHealth.criticalPercentage}%`}
                value={fieldHealth.criticalPercentage}
                tone="error"
              />
            </View>
          </View>

          {/* Per plot --------------------------------------------------- */}
          <View style={styles.section}>
            <SectionHeader title="Field Health by Plot" caption="Current field indicators" />
            {plotHealth.map((plot) => (
              <View key={plot.id} style={styles.card}>
                <View style={styles.plotHeader}>
                  <View style={styles.plotText}>
                    <Text style={styles.plotName} numberOfLines={1}>
                      {plot.plot}
                    </Text>
                    <Text style={styles.plotCrop}>{plot.crop}</Text>
                  </View>
                  <StatusBadge label={plot.status} tone={plot.tone} size="sm" />
                </View>

                <ProgressBar
                  label="Health score"
                  valueLabel={`${plot.healthScore}%`}
                  value={plot.healthScore}
                  tone={plot.tone}
                />

                <View style={styles.plotFacts}>
                  <View style={styles.fact}>
                    <Text style={styles.factLabel}>Moisture</Text>
                    <Text style={styles.factValue}>{plot.moisture}</Text>
                  </View>
                  <View style={styles.fact}>
                    <Text style={styles.factLabel}>Nutrient Status</Text>
                    <Text style={styles.factValue}>{plot.nutrients}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Issues ----------------------------------------------------- */}
          <View style={styles.section}>
            <SectionHeader
              title="Areas Requiring Attention"
              caption="Flagged at the last survey"
            />
            {healthIssues.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Nothing flagged</Text>
                <Text style={styles.emptyBody}>
                  Every plot was within its target band at the last survey.
                </Text>
              </View>
            ) : (
              healthIssues.map((issue) => (
                <View
                  key={issue.id}
                  style={[styles.card, styles.issueCard, { borderLeftColor: accentFor(issue.tone) }]}
                >
                  <View style={styles.plotHeader}>
                    <View style={styles.plotText}>
                      <Text style={styles.issuePlot}>{issue.plot}</Text>
                      <Text style={styles.issueTitle}>{issue.title}</Text>
                    </View>
                    <StatusBadge
                      label={issue.severity}
                      tone={SEVERITY_TONES[issue.severity] || 'neutral'}
                      size="sm"
                    />
                  </View>

                  <Text style={styles.issueDetail}>{issue.detail}</Text>

                  <View style={styles.issueAction}>
                    <Text style={styles.issueActionLabel}>Recommended action</Text>
                    <Text style={styles.issueActionValue}>{issue.action}</Text>
                  </View>

                  <SecondaryButton
                    label={issue.actionLabel}
                    icon="arrow-forward"
                    onPress={() => router.push(issue.route)}
                  />
                </View>
              ))
            )}
          </View>

          {/* Explanation ------------------------------------------------ */}
          <View style={styles.explainCard}>
            <View style={styles.explainHeader}>
              <View style={styles.explainIcon}>
                <Ionicons name="information-circle" size={18} color={Colors.secondary} />
              </View>
              <Text style={styles.explainTitle}>Where these numbers come from</Text>
            </View>
            <Text style={styles.explainBody}>
              Health figures are entered during a field survey and stored with the group&apos;s
              records. SahAI reads them back and points you at the recommendation that can
              act on a problem. It does not diagnose the crop itself.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** Left stripe colour for an issue card. */
function accentFor(tone) {
  if (tone === 'error') return Colors.error;
  if (tone === 'warning') return Colors.warning;
  return Colors.info;
}

const styles = StyleSheet.create({
  previewNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.warningSoft,
    borderRadius: 12,
    padding: Spacing.md,
  },
  previewNoticeText: {
    ...Typography.caption,
    color: Colors.text,
    flex: 1,
    lineHeight: 17,
  },

  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  inner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  subtitle: { ...Typography.bodySmall, lineHeight: 21 },
  heroCard: {
    ...CardBase,
    ...Shadow.card,
    gap: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroText: { flex: 1, minWidth: 0, gap: Spacing.xs },
  heroLabel: { ...Typography.sectionLabel },
  heroValue: {
    fontSize: FontSize.display,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -1,
  },
  heroFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    gap: 2,
  },
  heroFooterLabel: { ...Typography.caption },
  heroFooterValue: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.text,
  },
  card: {
    ...CardBase,
    ...Shadow.card,
    gap: Spacing.md,
  },
  cardTitle: { ...Typography.sectionLabel },
  bars: { gap: Spacing.md },
  section: { gap: Spacing.md },
  plotHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  plotText: { flex: 1, minWidth: 0, gap: 2 },
  plotName: { ...Typography.subtitle, fontSize: FontSize.body },
  plotCrop: { ...Typography.caption },
  plotFacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  fact: { gap: 2, minWidth: 110 },
  factLabel: { ...Typography.caption },
  factValue: {
    fontSize: FontSize.small,
    fontWeight: '700',
    color: Colors.text,
  },
  issueCard: { borderLeftWidth: 3 },
  issuePlot: { ...Typography.caption, fontWeight: '700' },
  issueTitle: { ...Typography.subtitle, fontSize: FontSize.body },
  issueDetail: { ...Typography.bodySmall, lineHeight: 20 },
  issueAction: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
  },
  issueActionLabel: { ...Typography.caption },
  issueActionValue: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyCard: {
    ...CardBase,
    ...Shadow.card,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xl,
  },
  emptyTitle: { ...Typography.subtitle },
  emptyBody: { ...Typography.bodySmall, textAlign: 'center' },
  explainCard: {
    ...CardBase,
    backgroundColor: Colors.surfaceAlt,
    gap: Spacing.sm,
  },
  explainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  explainIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explainTitle: { ...Typography.subtitle, fontSize: 16, flex: 1 },
  explainBody: { ...Typography.bodySmall, lineHeight: 20 },
});
