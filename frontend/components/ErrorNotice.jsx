import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography } from '../constants/Theme';
import SecondaryButton from './SecondaryButton';

/**
 * What went wrong, in the user's language.
 *
 * Every failure in the app renders through this one component so the wording,
 * tone and retry affordance stay consistent -- and so no screen is tempted to
 * quietly swallow an error and show stale or invented data instead.
 *
 * An ApiError's `kind` picks the tone: a permission problem is not a crash and
 * should not look like one, and a missing model is a "not yet" rather than a
 * fault the user can fix by trying harder.
 */

const TONES = {
  forbidden: { icon: 'lock-closed', color: Colors.warning, bg: Colors.warningSoft },
  unavailable: { icon: 'construct', color: Colors.info, bg: Colors.infoSoft },
  invalid: { icon: 'alert-circle', color: Colors.warning, bg: Colors.warningSoft },
  network: { icon: 'cloud-offline', color: Colors.error, bg: Colors.errorSoft },
  timeout: { icon: 'time', color: Colors.warning, bg: Colors.warningSoft },
  default: { icon: 'alert-circle', color: Colors.error, bg: Colors.errorSoft },
};

export default function ErrorNotice({ error, message, onRetry, retryLabel = 'Try again', style }) {
  const kind = error?.kind || 'default';
  const palette = TONES[kind] || TONES.default;
  const text = message || error?.message || 'Something went wrong. Please try again.';

  // Retrying a permission failure just fails again, so no button is offered.
  const canRetry = !!onRetry && kind !== 'forbidden';

  return (
    <View style={[styles.wrap, { backgroundColor: palette.bg }, style]}>
      <View style={styles.row}>
        <Ionicons name={palette.icon} size={20} color={palette.color} />
        <Text style={[styles.text, { color: palette.color }]}>{text}</Text>
      </View>
      {canRetry && <SecondaryButton label={retryLabel} icon="refresh" onPress={onRetry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  text: {
    ...Typography.bodySmall,
    fontSize: FontSize.small,
    flex: 1,
    lineHeight: 20,
  },
});
