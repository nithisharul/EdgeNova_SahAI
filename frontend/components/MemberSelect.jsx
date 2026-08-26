import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography, Shadow } from '../constants/Theme';

/**
 * Lightweight member picker: a field that looks like an InputField and opens
 * a simple modal list. Built in-house rather than pulling in a picker
 * dependency for a list of a dozen names.
 */
export default function MemberSelect({
  label = 'Member',
  placeholder = 'Select member',
  members = [],
  selectedId,
  onSelect,
  error,
  required = false,
  disabled = false,
  style,
}) {
  const [open, setOpen] = useState(false);
  const selected = members.find((member) => member.id === selectedId);

  const choose = (member) => {
    onSelect(member);
    setOpen(false);
  };

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={selected ? `${label}: ${selected.name}` : placeholder}
        style={({ pressed }) => [
          styles.field,
          !!error && styles.fieldError,
          disabled && styles.fieldDisabled,
          pressed && !disabled && styles.fieldPressed,
        ]}
      >
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.name : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </Pressable>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Stops a tap inside the sheet from closing it. */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select member</Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {members.length === 0 && (
                <Text style={styles.emptyText}>No members available.</Text>
              )}
              {members.map((member) => {
                const active = member.id === selectedId;
                return (
                  <Pressable
                    key={member.id}
                    onPress={() => choose(member)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.option,
                      active && styles.optionActive,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <View style={styles.optionText}>
                      <Text style={styles.optionName}>{member.name}</Text>
                      {!!member.village && (
                        <Text style={styles.optionMeta}>{member.village}</Text>
                      )}
                    </View>
                    {active && (
                      <Ionicons name="checkmark" size={18} color={Colors.secondary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs + 2,
  },
  label: {
    ...Typography.label,
  },
  required: {
    color: Colors.error,
    fontWeight: '700',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.md,
  },
  fieldError: {
    borderColor: Colors.error,
  },
  fieldDisabled: {
    backgroundColor: Colors.surfaceAlt,
  },
  fieldPressed: {
    borderColor: Colors.secondary,
  },
  value: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.text,
  },
  placeholder: {
    color: Colors.textMuted,
  },
  error: {
    fontSize: FontSize.caption,
    color: Colors.error,
    fontWeight: '500',
  },
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    maxHeight: '70%',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.raised,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    ...Typography.subtitle,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  optionActive: {
    backgroundColor: Colors.accentSoft,
  },
  optionPressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  optionText: {
    flex: 1,
    gap: 1,
  },
  optionName: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.text,
  },
  optionMeta: {
    ...Typography.caption,
  },
  emptyText: {
    ...Typography.bodySmall,
    paddingVertical: Spacing.lg,
    textAlign: 'center',
  },
});
