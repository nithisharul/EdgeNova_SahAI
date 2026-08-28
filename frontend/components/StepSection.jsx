import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { Spacing, Typography } from '../constants/Theme';
import StatusBadge from './StatusBadge';

/**
 * A numbered step in a long form.
 *
 * Crop Advisor asks for a dozen values. Presented as one continuous form that
 * reads as a tax return; broken into "01 LOCATION / 02 FIELD & SOIL /
 * 03 SOIL TEST" it reads as three short questions. The number is the cheapest
 * possible progress indicator -- no state to manage, and the farmer can see
 * how much is left.
 *
 * The step sits on the page itself rather than inside a card: the rule below
 * the heading does the separating, so the form has no nested boxes.
 */
export default function StepSection({ number, title, hint, optional = false, children, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {!!number && <Text style={styles.number}>{number}</Text>}
          <Text style={styles.title}>{title}</Text>
          {optional && <StatusBadge label="Optional" tone="neutral" size="sm" />}
        </View>
        {!!hint && <Text style={styles.hint}>{hint}</Text>}
      </View>

      <View style={styles.rule} />

      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.md,
  },
  header: {
    gap: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  number: {
    ...Typography.stepNumber,
  },
  title: {
    ...Typography.subtitle,
    flexShrink: 1,
  },
  hint: {
    ...Typography.caption,
    lineHeight: 17,
  },
  rule: {
    height: 1,
    backgroundColor: Colors.border,
  },
  body: {
    gap: Spacing.lg,
  },
});
