import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography } from '../constants/Theme';

/**
 * Horizontal read-out of a percentage, same visual language as the repayment
 * bar on LoanCard. Used for plot health, land section size and the savings
 * trend on the reports screen, so the app only has one kind of bar.
 *
 * `value` is a percentage; anything outside 0-100 is clamped rather than
 * drawn past the end of the track. The fill grows in once on mount, which
 * is short enough to read as the bar settling rather than as an effect.
 */
const FILLS = {
  success: Colors.success,
  warning: Colors.warning,
  error: Colors.error,
  info: Colors.info,
  accent: Colors.accent,
};

export default function ProgressBar({
  value = 0,
  label,
  valueLabel,
  tone = 'accent',
  height = 8,
  style,
}) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  const fill = FILLS[tone] || FILLS.accent;

  // Width cannot run on the native driver, but a handful of short tweens on
  // mount costs nothing. Screen readers get the real value, not the tween.
  const grow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(grow, {
      toValue: percent,
      duration: 520,
      useNativeDriver: false,
    }).start();
  }, [grow, percent]);

  const width = grow.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.wrap, style]}>
      {(!!label || !!valueLabel) && (
        <View style={styles.header}>
          {!!label && (
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
          )}
          {!!valueLabel && <Text style={styles.value}>{valueLabel}</Text>}
        </View>
      )}

      <View
        style={[styles.track, { height, borderRadius: height }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ now: Math.round(percent), min: 0, max: 100 }}
        accessibilityLabel={label}
      >
        <Animated.View
          style={[styles.fill, { width, backgroundColor: fill, borderRadius: height }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.xs + 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  label: {
    ...Typography.bodySmall,
    flexShrink: 1,
  },
  value: {
    fontSize: FontSize.small,
    fontWeight: '700',
    color: Colors.text,
  },
  track: {
    backgroundColor: Colors.surfaceMuted,
    overflow: 'hidden',
    borderRadius: Radius.pill,
  },
  fill: {
    height: '100%',
  },
});
