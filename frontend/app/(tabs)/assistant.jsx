import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import SahaiHeader from '../../components/SahaiHeader';
import ChatBubble from '../../components/ChatBubble';
import SuggestedQuestion from '../../components/SuggestedQuestion';
import AssistantInsightCard from '../../components/AssistantInsightCard';
import Colors from '../../constants/Colors';
import { Spacing, Radius, FontSize, Typography } from '../../constants/Theme';
import { sendAssistantMessage } from '../../services/assistantService';
import {
  welcomeMessage,
  suggestedQuestions,
  errorResponse,
} from '../../data/assistantPresets';
import { useAuth } from '../../contexts/AuthContext';

/**
 * SahAI Assistant.
 *
 * A conversational surface over the app's own services. There is no language
 * model behind it and no external API is called -- see
 * services/assistantService.js, which matches an intent and then performs the
 * SAME live call the corresponding screen would.
 *
 * The suggestion chips are filtered by role, so a member is never invited to
 * ask a question whose answer she is not permitted to see. The service checks
 * again before answering; this only avoids dangling the question in front of
 * her.
 *
 * Conversation state is session-only and intentionally not persisted.
 */

let messageCounter = 0;
const nextId = (prefix) => `${prefix}-${(messageCounter += 1)}`;

export default function AssistantScreen() {
  const { role } = useAuth();
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  /** Keeps the newest message in view without the user scrolling. */
  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(
    async (raw) => {
      const text = String(raw || '').trim();
      // Empty or whitespace-only input never creates a bubble.
      if (!text || thinking) return;

      setMessages((prev) => [...prev, { id: nextId('user'), role: 'user', text }]);
      setInput('');
      setThinking(true);
      scrollToEnd();

      try {
        const response = await sendAssistantMessage(text);
        setMessages((prev) => [
          ...prev,
          { id: nextId('assistant'), role: 'assistant', ...response },
        ]);
      } catch {
        // The reason stays in the service; the thread shows a calm message.
        setMessages((prev) => [
          ...prev,
          { id: nextId('assistant'), role: 'assistant', ...errorResponse },
        ]);
      } finally {
        setThinking(false);
        scrollToEnd();
      }
    },
    [thinking, scrollToEnd]
  );

  const resetChat = () => {
    setMessages([welcomeMessage]);
    setInput('');
    setThinking(false);
  };

  const canSend = input.trim().length > 0 && !thinking;

  // A chip with no `roles` is for everyone, signed out included.
  const visibleQuestions = suggestedQuestions.filter(
    (question) => !question.roles || question.roles.includes(role)
  );

  // Chips stay visible while the thread is short, then get out of the way --
  // except after a fallback, which tells the user to pick one of them.
  const lastMessage = messages[messages.length - 1];
  const showSuggestions = messages.length <= 3 || lastMessage?.intent === 'unknown';

  return (
    <View style={styles.screen}>
      <SahaiHeader title="SahAI Advisor" subtitle="Field and finance guidance" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {/* New chat ------------------------------------------------------ */}
        <View style={styles.toolbar}>
          <View style={styles.toolbarInner}>
            <Text style={styles.toolbarHint} numberOfLines={1}>
              Answers use your live SahAI data
            </Text>
            <Pressable
              onPress={resetChat}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="New conversation"
              style={({ pressed }) => [styles.newChat, pressed && styles.pressed]}
            >
              <Ionicons name="add" size={15} color={Colors.secondary} />
              <Text style={styles.newChatLabel}>New</Text>
            </Pressable>
          </View>
        </View>

        {/* Conversation -------------------------------------------------- */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
        >
          <View style={styles.threadInner}>
            {messages.map((message) => (
              <ChatBubble key={message.id} role={message.role} text={message.text}>
                {!!message.card && (
                  <AssistantInsightCard
                    card={message.card}
                    action={message.action}
                    onActionPress={() =>
                      message.action?.route && router.push(message.action.route)
                    }
                  />
                )}
              </ChatBubble>
            ))}

            {thinking && (
              <View style={styles.thinkingRow}>
                <ActivityIndicator size="small" color={Colors.secondary} />
                <Text style={styles.thinkingText}>Checking your records...</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Suggestions + composer ---------------------------------------- */}
        <View style={styles.footer}>
          <View style={styles.footerInner}>
            {showSuggestions && (
              <>
                <Text style={styles.suggestLabel}>Try asking</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {visibleQuestions.map((question) => (
                    <SuggestedQuestion
                      key={question.id}
                      label={question.label}
                      icon={question.icon}
                      disabled={thinking}
                      onPress={() => send(question.label)}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask about your field or your money"
                placeholderTextColor={Colors.textMuted}
                editable={!thinking}
                multiline
                // A multiline field never fires onSubmitEditing on web, so
                // Enter is handled here. Shift+Enter still adds a new line.
                onKeyPress={(event) => {
                  if (event.nativeEvent.key !== 'Enter' || event.nativeEvent.shiftKey) return;
                  event.preventDefault?.();
                  send(input);
                }}
                blurOnSubmit={false}
                accessibilityLabel="Message SahAI"
              />
              <Pressable
                onPress={() => send(input)}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                accessibilityState={{ disabled: !canSend }}
                style={({ pressed }) => [
                  styles.sendButton,
                  !canSend && styles.sendButtonDisabled,
                  pressed && canSend && styles.pressed,
                ]}
              >
                <Ionicons
                  name="send"
                  size={17}
                  color={canSend ? Colors.textOnPrimary : Colors.textMuted}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  toolbar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  toolbarInner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  toolbarHint: {
    ...Typography.caption,
    flexShrink: 1,
  },
  newChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentSoft,
  },
  newChatLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.secondary,
  },
  thread: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  threadInner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: Spacing.xl + Spacing.sm,
  },
  thinkingText: {
    ...Typography.caption,
    fontStyle: 'italic',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  footerInner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    // Clears the tab bar so the composer is never hidden behind it.
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  suggestLabel: {
    ...Typography.sectionLabel,
  },
  suggestRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
    paddingVertical: 2,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 110,
    fontSize: FontSize.small,
    color: Colors.text,
    paddingVertical: Spacing.sm,
    // Web only: keeps a visible focus ring, in the app's green rather than
    // the browser's default black rectangle.
    outlineColor: Colors.accent,
    outlineWidth: 1,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceMuted,
  },
  pressed: {
    opacity: 0.75,
  },
});
