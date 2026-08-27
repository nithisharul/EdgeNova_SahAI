import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, Radius, FontSize, Typography, Shadow } from '../constants/Theme';

/**
 * One message in the Assistant conversation.
 *
 * User messages sit right on deep green; assistant messages sit left on a
 * white card, which is what makes the thread readable at a glance.
 */
export default function ChatBubble({ role = 'assistant', text, children, style }) {
  const isUser = role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant, style]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Ionicons name="sparkles" size={14} color={Colors.secondary} />
        </View>
      )}

      <View style={styles.stack}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          {!!text && (
            <Text style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}>
              {text}
            </Text>
          )}
        </View>
        {/* Structured cards render under the bubble, still left aligned. */}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    width: '100%',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stack: {
    flexShrink: 1,
    maxWidth: '86%',
    gap: Spacing.sm,
  },
  bubble: {
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    ...Shadow.card,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: Radius.sm,
    alignSelf: 'flex-end',
  },
  bubbleAssistant: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopLeftRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FontSize.small,
    lineHeight: 21,
  },
  textUser: {
    color: Colors.textOnPrimary,
  },
  textAssistant: {
    color: Colors.text,
  },
});
