import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Typography } from '../constants/Theme';
import RecommendationCard from './RecommendationCard';

/**
 * A fertilizer recommendation, shown identically wherever it comes from.
 *
 * The backend answers along two very different paths and the UI must not blur
 * them:
 *
 *   source = "model"           a trained prediction, with a probability
 *   source = "guideline_table" a published agronomic table, with NO probability
 *
 * So a guideline answer never shows a confidence figure or a confidence bar --
 * there is nothing behind it to draw. Presenting a table lookup as a model
 * output would be the single most misleading thing this screen could do.
 *
 * Shared by Crop Advisor and the standalone Fertilizer screen so the honesty
 * rules cannot drift apart between them.
 */
export default function FertilizerResult({ fertilizer }) {
  if (!fertilizer) return null;

  const fromModel = fertilizer.source === 'model';
  const hasConfidence = fromModel && fertilizer.confidence !== null;

  return (
    <>
      <RecommendationCard
        title="Fertilizer"
        icon="flask"
        badge={fromModel ? 'Model recommendation' : 'General guidance'}
        badgeTone={fromModel ? 'success' : 'info'}
        headline={fertilizer.fertilizer}
        subheadline={
          hasConfidence
            ? `${Math.round(fertilizer.confidence * 100)}% confidence`
            : undefined
        }
        message={fertilizer.note}
        tone={fromModel ? 'success' : 'info'}
        highlights={[fertilizer.soilNote].filter(Boolean)}
      />

      {!fromModel && (
        <View style={styles.note}>
          <Ionicons name="book-outline" size={16} color={Colors.info} />
          <Text style={[styles.noteText, { color: Colors.info }]}>
            This is published agricultural guidance for your crop, not a model
            prediction.
          </Text>
        </View>
      )}

      {fertilizer.mappingIsApproximate && (
        <View style={styles.note}>
          <Ionicons name="git-compare-outline" size={16} color={Colors.warning} />
          <Text style={[styles.noteText, { color: Colors.warning }]}>
            This fertilizer category uses the closest available crop match
            {fertilizer.cropTypeUsed ? ` (${fertilizer.cropTypeUsed})` : ''}.
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xs,
  },
  noteText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 16,
  },
});
