import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography } from '../constants/Theme';

/**
 * Shows one hash from a ledger record.
 *
 * Nothing is computed here -- the value always arrives from the ledger
 * service. The hash is abbreviated by default because a full 64 character
 * digest wrecks a phone layout; tapping expands it so it can still be read
 * or selected in full.
 */
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/** 7f83b165...26d9069 */
function abbreviate(hash, head = 8, tail = 7) {
  if (typeof hash !== 'string' || hash.length <= head + tail + 3) return hash || '';
  return `${hash.slice(0, head)}...${hash.slice(-tail)}`;
}

export default function HashDisplay({ label, hash, caption, tone = 'neutral', style }) {
  const [expanded, setExpanded] = useState(false);
  const isCurrent = tone === 'current';

  return (
    <Pressable
      onPress={() => setExpanded((open) => !open)}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${expanded ? 'showing full hash' : 'showing shortened hash'}`}
      accessibilityHint="Double tap to show the full hash"
      style={({ pressed }) => [styles.wrap, isCurrent && styles.wrapCurrent, pressed && styles.pressed, style]}
    >
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={Colors.textMuted}
        />
      </View>

      <Text
        style={[styles.hash, expanded && styles.hashExpanded]}
        selectable
        numberOfLines={expanded ? undefined : 1}
      >
        {expanded ? hash : abbreviate(hash)}
      </Text>

      {!!caption && <Text style={styles.caption}>{caption}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  wrapCurrent: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  label: {
    ...Typography.sectionLabel,
    flexShrink: 1,
  },
  hash: {
    fontFamily: MONO,
    fontSize: FontSize.small,
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  hashExpanded: {
    fontSize: FontSize.caption,
    lineHeight: 18,
  },
  caption: {
    ...Typography.caption,
  },
  pressed: {
    opacity: 0.7,
  },
});
