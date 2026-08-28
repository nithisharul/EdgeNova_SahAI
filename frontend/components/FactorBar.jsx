import { Animated, View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography } from '../constants/Theme';
import { useMeter } from '../utils/motion';

/**
 * One input's influence on the model's choice.
 *
 * A bar, not a chart. The crop model returns a gradient-times-input attribution
 * per feature; a reader needs to see which inputs mattered and whether each
 * pushed toward or away from the answer. A bar length plus a word does that
 * without anyone having to learn how to read it.
 *
 * Direction is carried by TEXT as well as colour ("supports" / "counts
 * against"), so the meaning survives for a colour-blind reader and in print.
 * The bar animates from zero to a value that has already arrived.
 */
export default function FactorBar({ label, value, influence, direction, delay = 0 }) {
  const supports = direction === 'supports';
  // Attribution shares are often small in absolute terms; the strongest factor
  // in a set can sit at 0.3. Scaling makes the comparison legible without
  // misrepresenting the ordering, which is what the reader is actually using.
  const percent = Math.max(4, Math.min(100, (influence || 0) * 100));
  const width = useMeter(percent, { duration: 700 + delay });

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
          {value !== undefined && <Text style={styles.value}> · {value}</Text>}
        </Text>
        <Text style={[styles.direction, supports ? styles.supports : styles.against]}>
          {supports ? 'supports' : 'counts against'}
        </Text>
      </View>

      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: supports ? Colors.accent : Colors.warning,
              width: width.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.xs,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.text,
    flex: 1,
  },
  value: {
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  direction: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  supports: { color: Colors.success },
  against: { color: Colors.warning },
  track: {
    height: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.sm,
  },
});
