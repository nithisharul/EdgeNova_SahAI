import { Animated, View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography } from '../constants/Theme';
import { useMeter } from '../utils/motion';

/**
 * Where this request sits on the risk scale.
 *
 * ONE visualisation, not three. A gauge plus a bar plus a percentage plus a
 * badge would be four ways of saying the same thing, and a reader would assume
 * they meant four different things.
 *
 * The band boundaries are the model's own (0.152 / 0.384), so the marker's
 * position against the coloured track is a true picture of how the backend
 * classified the request -- not a decorative scale invented here.
 *
 * The label is always words as well as colour, because "red" is not a
 * conclusion a colour-blind treasurer can act on.
 */
const BANDS = [
  { key: 'LOW', label: 'Low', upTo: 15.2, color: Colors.success },
  { key: 'MEDIUM', label: 'Medium', upTo: 38.4, color: Colors.warning },
  { key: 'HIGH', label: 'High', upTo: 100, color: Colors.error },
];

export default function RiskMeter({ percent, label, threshold }) {
  const position = useMeter(Math.max(0, Math.min(100, percent)), { duration: 800 });
  const active = BANDS.find((band) => band.key === label) || BANDS[1];

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.score}>{Math.round(percent)}%</Text>
        <Text style={styles.scoreLabel}>
          risk score{threshold !== undefined ? ` · flagged above ${Math.round(threshold)}%` : ''}
        </Text>
      </View>

      <View style={styles.track}>
        {BANDS.map((band, index) => {
          const start = index === 0 ? 0 : BANDS[index - 1].upTo;
          return (
            <View
              key={band.key}
              style={{
                width: `${band.upTo - start}%`,
                backgroundColor: band.color,
                opacity: band.key === active.key ? 0.95 : 0.22,
                height: '100%',
              }}
            />
          );
        })}

        {/* The marker rides on top so its position can be read against the
            bands rather than replacing them. */}
        <Animated.View
          style={[
            styles.marker,
            {
              left: position.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        >
          <View style={[styles.markerDot, { borderColor: active.color }]} />
        </Animated.View>
      </View>

      <View style={styles.scale}>
        {BANDS.map((band) => (
          <Text
            key={band.key}
            style={[styles.scaleLabel, band.key === active.key && { color: band.color, fontWeight: '700' }]}
          >
            {band.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  score: {
    ...Typography.display,
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    ...Typography.caption,
    flex: 1,
  },
  track: {
    height: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceMuted,
    overflow: 'visible',
    flexDirection: 'row',
    // Clip the band fills to the rounded track without clipping the marker.
    borderRadius: Radius.sm,
  },
  marker: {
    position: 'absolute',
    top: -5,
    // Pull back by half the dot so the centre lands on the value.
    marginLeft: -10,
  },
  markerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 3,
  },
  scale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
