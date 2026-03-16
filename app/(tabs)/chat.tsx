import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { useUser } from '@/context/UserContext';
import { useMeals } from '@/context/MealsContext';
import { useSubscription } from '@/context/SubscriptionContext';
import {
  sendMessage,
  saveChatHistory,
  loadChatHistory,
  clearChatHistory,
  getChatUsageCount,
  incrementChatUsage,
  canSendMessage,
  FREE_DAILY_MESSAGES,
  type Message,
} from '@/lib/chatService';
import { Trash2, ArrowUp, UserRound } from 'lucide-react-native';
import { PremiumGate } from '@/components/PremiumGate';

// ── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  '🥜 Bir avuç ceviz kaç kalori?',
  '🍌 Muz ile elma arasındaki fark?',
  '🥗 Bugün ne yemeliyim?',
  '💪 Protein için en iyi yiyecekler?',
  '🍕 Pizza yesem ne olur?',
  '🥤 Smoothie tarifi öner',
  '🥚 Yumurtanın besin değerleri neler?',
  '🏃 Kilo vermek için ne yemeliyim?',
];

// ── NutriLens AI avatar ───────────────────────────────────────────────────────

function NAvatar({ size = 28 }: { size?: number }) {
  return (
    <LinearGradient
      colors={['#7C5CBF', '#00D4AA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, justifyContent: 'center', alignItems: 'center' }}
    >
      <UserRound size={size * 0.55} color="#fff" strokeWidth={2} />
    </LinearGradient>
  );
}

// ── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - i * 150),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingBubble}>
      <NAvatar size={28} />
      <View style={styles.bubbleAssistant}>
        <View style={styles.typingDots}>
          {dots.map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                styles.typingDot,
                { transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Date separator ────────────────────────────────────────────────────────────

function DateSeparator({ dateStr }: { dateStr: string }) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let label = dateStr;
  if (dateStr === today) label = 'Bugün';
  else if (dateStr === yesterday) label = 'Dün';
  else {
    const d = new Date(dateStr);
    label = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  }

  return (
    <View style={styles.dateSeparator}>
      <View style={styles.dateLine} />
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={styles.dateLine} />
    </View>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message, onRetry }: { message: Message; onRetry?: () => void }) {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const { t } = useTranslation();

  if (isUser) {
    return (
      <View style={styles.rowUser}>
        <LinearGradient colors={Colors.gradientPrimary} style={styles.bubbleUser}>
          <Text style={styles.bubbleUserText}>{message.content}</Text>
        </LinearGradient>
        <Text style={[styles.timestamp, styles.timestampRight]}>{time}</Text>
      </View>
    );
  }

  return (
    <View style={styles.rowAssistant}>
      <NAvatar size={28} />
      <View style={{ maxWidth: '80%' }}>
        <View style={[styles.bubbleAssistant, message.isError && styles.bubbleError]}>
          <Text style={styles.bubbleAssistantText}>{message.content}</Text>
          {message.isError && onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryText}>{t('chat_retry')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.timestamp, styles.timestampLeft]}>{time}</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { profile, getGreeting } = useUser();
  const { getTodaysCalories } = useMeals();
  const { isPremium } = useSubscription();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const lastUserMsgRef = useRef<string>('');
  const sendScale = useRef(new Animated.Value(1)).current;
  const welcomePulse = useRef(new Animated.Value(1)).current;

  const todayCalories = getTodaysCalories();
  const dailyCalorieGoal = profile.dailyCalorieGoal ?? 2000;
  const userGoal =
    profile.goal === 'lose_weight'
      ? 'lose weight'
      : profile.goal === 'gain_muscle'
      ? 'gain muscle'
      : 'maintain weight';

  // Pulse animation for welcome emoji
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(welcomePulse, { toValue: 1.12, duration: 1000, useNativeDriver: true }),
        Animated.timing(welcomePulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Load history on mount
  useEffect(() => {
    const init = async () => {
      const [history, count] = await Promise.all([loadChatHistory(), getChatUsageCount()]);
      setMessages(history);
      setUsageCount(count);
      setIsLoaded(true);
    };
    void init();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  const getDateKey = (isoString: string) => isoString.split('T')[0];

  // Build list with date separators
  type ListItem = Message | { type: 'separator'; dateStr: string; id: string };

  const listData: ListItem[] = [];
  let lastDate = '';
  for (const msg of messages) {
    const d = getDateKey(msg.timestamp);
    if (d !== lastDate) {
      listData.push({ type: 'separator', dateStr: d, id: `sep_${d}` });
      lastDate = d;
    }
    listData.push(msg);
  }

  const doSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      const limitReached = !canSendMessage(usageCount, isPremium);
      if (limitReached) return;

      lastUserMsgRef.current = trimmed;
      setInputText('');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const userMsg: Message = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => {
        const next = [...prev, userMsg];
        void saveChatHistory(next);
        return next;
      });

      const newCount = await incrementChatUsage();
      setUsageCount(newCount);

      setIsTyping(true);

      try {
        const reply = await sendMessage(trimmed, [...messages, userMsg], {
          dailyCalorieGoal,
          todayCalories,
          userGoal,
          userName: profile.name,
        });

        const assistantMsg: Message = {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => {
          const next = [...prev, assistantMsg];
          void saveChatHistory(next);
          return next;
        });
      } catch {
        const errMsg: Message = {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: t('chat_error'),
          timestamp: new Date().toISOString(),
          isError: true,
        };
        setMessages((prev) => {
          const next = [...prev, errMsg];
          void saveChatHistory(next);
          return next;
        });
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, usageCount, isPremium, messages, dailyCalorieGoal, todayCalories, userGoal, profile.name, t]
  );

  const handleSend = () => doSend(inputText);

  const handleRetry = () => doSend(lastUserMsgRef.current);

  const handleSuggestion = (chip: string) => {
    void doSend(chip);
  };

  const handleClear = () => {
    Alert.alert(t('chat_clear'), t('chat_clear_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await clearChatHistory();
          setMessages([]);
        },
      },
    ]);
  };

  const animateSend = () => {
    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(sendScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    handleSend();
  };

  const limitReached = !canSendMessage(usageCount, isPremium);
  const canSend = inputText.trim().length > 0 && !isTyping && !limitReached;

  const firstName = profile.name?.split(' ')[0] || '';
  const greeting = getGreeting(); // günaydın / iyi günler / iyi akşamlar

  const renderItem = ({ item }: { item: ListItem }) => {
    if ('type' in item && item.type === 'separator') {
      return <DateSeparator dateStr={item.dateStr} />;
    }
    const msg = item as Message;
    return <MessageBubble message={msg} onRetry={msg.isError ? handleRetry : undefined} />;
  };

  if (!isPremium) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <PremiumGate titleKey="chatPremiumTitle" subtitleKey="chatPremiumDesc" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <NAvatar size={36} />
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('chat_tab')}</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>{t('chat_online')}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerRight} onPress={handleClear} activeOpacity={0.7}>
          <Trash2 size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages or welcome */}
        {isLoaded && messages.length === 0 ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.welcomeContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.Text style={[styles.welcomeEmoji, { transform: [{ scale: welcomePulse }] }]}>
              🥗
            </Animated.Text>
            <LinearGradient
              colors={['#7C5CBF', '#9B6FD4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.greetingBadge}
            >
              <Text style={styles.welcomeGreeting}>{greeting}! 👋</Text>
            </LinearGradient>
            <Text style={styles.welcomeTitle}>{t('chat_welcome')}</Text>
            <Text style={styles.welcomeSub}>{t('chat_welcome_sub')}</Text>

            <View style={styles.chipsContainer}>
              {SUGGESTIONS.map((chip) => (
                <TouchableOpacity key={chip} style={styles.chip} onPress={() => handleSuggestion(chip)} activeOpacity={0.75}>
                  <Text style={styles.chipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listData}
            keyExtractor={(item) => ('id' in item ? item.id : item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListFooterComponent={isTyping ? <TypingDots /> : null}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Limit banner */}
        {limitReached && (
          <View style={styles.limitBanner}>
            <Text style={styles.limitText}>{t('chat_limit')}</Text>
            <TouchableOpacity onPress={() => router.push('/paywall')} style={styles.limitButton}>
              <Text style={styles.limitButtonText}>{t('goPremium')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={[styles.input, limitReached && styles.inputDisabled]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('chat_placeholder')}
            placeholderTextColor={Colors.textSecondary}
            multiline
            maxLength={500}
            editable={!limitReached}
            returnKeyType="default"
            onSubmitEditing={canSend ? handleSend : undefined}
          />
          <Animated.View style={{ transform: [{ scale: sendScale }] }}>
            <Pressable
              onPress={animateSend}
              disabled={!canSend}
              style={({ pressed }) => [styles.sendButton, !canSend && styles.sendButtonDisabled, pressed && { opacity: 0.85 }]}
            >
              {canSend ? (
                <LinearGradient colors={Colors.gradientPrimary} style={styles.sendGradient}>
                  <ArrowUp size={20} color="#000" strokeWidth={2.5} />
                </LinearGradient>
              ) : (
                <View style={styles.sendGradient}>
                  <ArrowUp size={20} color={Colors.textSecondary} strokeWidth={2.5} />
                </View>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: { marginRight: Spacing.sm },
  headerCenter: { flex: 1 },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  onlineText: { ...Typography.small, color: Colors.primary },
  headerRight: { padding: 6 },

  /* Welcome */
  welcomeContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  welcomeEmoji: { fontSize: 64, marginBottom: Spacing.sm },
  greetingBadge: {
    borderRadius: 24,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  welcomeGreeting: {
    ...Typography.h2,
    color: '#fff',
    textAlign: 'center',
  },
  welcomeTitle: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 2,
  },
  welcomeSub: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { ...Typography.caption, color: Colors.text },

  /* Messages */
  messageList: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexGrow: 1,
  },

  /* User bubble */
  rowUser: {
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  bubbleUser: {
    maxWidth: '75%',
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  bubbleUserText: { ...Typography.body, color: '#fff', lineHeight: 22 },

  /* Assistant bubble */
  rowAssistant: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  bubbleAssistant: {
    backgroundColor: Colors.surface2,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  bubbleError: {
    borderWidth: 1,
    borderColor: Colors.error,
  },
  bubbleAssistantText: { ...Typography.body, color: Colors.text, lineHeight: 22 },
  retryButton: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.primaryGlow,
    borderRadius: BorderRadius.sm,
  },
  retryText: { ...Typography.small, color: Colors.primary },

  /* Timestamp */
  timestamp: { ...Typography.small, color: Colors.textSecondary, marginTop: 3 },
  timestampRight: { alignSelf: 'flex-end' },
  timestampLeft: { alignSelf: 'flex-start', marginLeft: 4 },

  /* Typing */
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  typingDots: { flexDirection: 'row', gap: 5, paddingVertical: 6, paddingHorizontal: 4 },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  /* Date separator */
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dateLabel: { ...Typography.small, color: Colors.textSecondary },

  /* Limit banner */
  limitBanner: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  limitText: { ...Typography.small, color: Colors.textSecondary, flex: 1 },
  limitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  limitButtonText: { ...Typography.smallMedium, color: '#000' },

  /* Input bar */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: 'rgba(17,24,39,0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputDisabled: { opacity: 0.5 },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 2,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
  },
});
