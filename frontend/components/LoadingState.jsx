import { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, Easing } from 'react-native';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography } from '../constants/Theme';

/**
 * Waiting, with something to read.
 *
 * A bare spinner tells the user nothing except that the app is busy. Naming the
 * work -- "Verifying record chain", "Checking your field conditions" -- turns
 * the same two seconds into an explanation of what the product does, which is
 * worth a great deal during a demo.
 *
 * Skeleton rows stand in for content whose SHAPE is known, so the layout does
 * not jump when the data lands. They are grey blocks on purpose: never a
 * plausible-looking fake number that a viewer might read as real.
 */
export default function LoadingState({ message, rows = 0, style }) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.wrap, style]}>
      {!!message && (
        <View style={styles.messageRow}>
          <Animated.View style={[styles.dot, { opacity: pulse }]} />
          <Text style={styles.message}>{message}</Text>
        </View>
      )}

      {rows > 0 && (
        <View style={styles.skeletonList}>
          {Array.from({ length: rows }).map((_, index) => (
            <View key={index} style={styles.skeletonRow}>
              <Animated.View style={[styles.skeletonLabel, { opacity: pulse }]} />
              <Animated.View style={[styles.skeletonValue, { opacity: pulse }]} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  message: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  skeletonList: {
    gap: Spacing.lg,
  },
  skeletonRow: {
    gap: Spacing.sm,
  },
  skeletonLabel: {
    height: 10,
    width: '35%',
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceMuted,
  },
  skeletonValue: {
    height: 26,
    width: '60%',
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceMuted,
  },
});
