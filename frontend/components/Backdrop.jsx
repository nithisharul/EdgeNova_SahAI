import { View, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

/**
 * Background texture for the two halves of the product.
 *
 * WHY NOT SVG
 * -----------
 * These are Haikei-style layered shapes built from plain Views with
 * borderRadius, not react-native-svg. The library is not in package.json, and
 * adding a native dependency days before a demo to draw decorative shapes is a
 * bad trade.
 *
 * WHY LINES AND NOT FILLS
 * -----------------------
 * The first version used large tinted ellipses. Inside a max-width container
 * the clip turned them into a visible grey RECTANGLE with hard edges -- the
 * opposite of organic. Outlined arcs solve it: a clipped line simply ends,
 * where a clipped fill shows its straight cut. It also reads more like the
 * topographic contours of a field, which is the intent.
 *
 * TWO PERSONALITIES, ONE BRAND
 * ----------------------------
 *   field -> curved contour lines, layered and asymmetric
 *   fund  -> straight ruled lines, evenly spaced: a passbook page
 *
 * Everything sits at low opacity behind content and is pointerEvents="none",
 * so it can never intercept a tap. If you can clearly see the decoration
 * rather than feel it, it is too strong.
 */

/** Layered land contours. Agriculture screens. */
function FieldBackdrop({ height = 260, tone = 'accent' }) {
  const base = tone === 'deep' ? Colors.secondary : Colors.accent;

  // Each arc is a very wide, very tall rounded box showing only its top edge.
  // Overflowing the container horizontally means the curve is cut where it is
  // flattest, which is where a cut is least visible.
  const arcs = [
    { top: height * 0.30, inset: -60, thickness: 1.5, opacity: 0.30 },
    { top: height * 0.46, inset: -140, thickness: 1, opacity: 0.22 },
    { top: height * 0.62, inset: -40, thickness: 1, opacity: 0.16 },
    { top: height * 0.80, inset: -200, thickness: 1, opacity: 0.12 },
  ];

  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]}>
      {arcs.map((arc, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            top: arc.top,
            left: arc.inset,
            right: arc.inset,
            height: height * 2,
            borderTopWidth: arc.thickness,
            borderColor: base,
            borderRadius: 9999,
            opacity: arc.opacity,
          }}
        />
      ))}
    </View>
  );
}

/** Evenly ruled lines. Finance screens: a passbook, not a field. */
function FundBackdrop({ height = 200, lines = 7 }) {
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]}>
      {Array.from({ length: lines }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.rule,
            {
              top: (height / (lines + 1)) * (index + 1),
              // Fading downward keeps the ruling from competing with content.
              opacity: 0.45 - index * (0.35 / lines),
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * One soft shape, used sparingly behind a single focal figure.
 *
 * This one IS a fill, because it is only ever placed inside a rounded panel
 * that already has its own edges -- so the clip follows a corner that is meant
 * to be there.
 */
function BlobBackdrop({ size = 220, tone = 'accent', style }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.blob,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone === 'deep' ? Colors.accent : Colors.secondary,
        },
        style,
      ]}
    />
  );
}

export default function Backdrop({ variant = 'field', ...rest }) {
  if (variant === 'fund') return <FundBackdrop {...rest} />;
  if (variant === 'blob') return <BlobBackdrop {...rest} />;
  return <FieldBackdrop {...rest} />;
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    bottom: undefined,
    overflow: 'hidden',
  },
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.border,
  },
  blob: {
    position: 'absolute',
    opacity: 0.14,
  },
});
