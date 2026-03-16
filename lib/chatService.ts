import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateText } from '@rork-ai/toolkit-sdk';

const CHAT_HISTORY_KEY = '@nutrilens_chat_history';
const CHAT_QUOTA_KEY = '@nutrilens_chat_quota';
const FREE_DAILY_MESSAGES = 10;
const MAX_HISTORY = 50;

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string for AsyncStorage serialization
  isError?: boolean;
}

interface ChatQuota {
  date: string;
  count: number;
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function buildSystemPrompt(userContext: {
  dailyCalorieGoal: number;
  todayCalories: number;
  userGoal: string;
  userName?: string;
}): string {
  const remaining = Math.max(0, userContext.dailyCalorieGoal - userContext.todayCalories);
  return `You are NutriLens AI, a friendly and knowledgeable nutrition assistant. You help users with:
- Calorie and nutritional information about any food or drink
- Portion size estimations (handful, cup, slice, etc.)
- Healthy eating advice and meal suggestions
- Explaining macros (protein, carbs, fat) in simple terms
- Comparing foods nutritionally
- Answering questions about diets (keto, vegan, intermittent fasting, etc.)

The user's profile:
  - Name: ${userContext.userName || 'User'}
  - Daily calorie goal: ${userContext.dailyCalorieGoal} kcal
  - Today's consumed calories: ${userContext.todayCalories} kcal
  - Remaining calories: ${remaining} kcal
  - Goal: ${userContext.userGoal}

Keep answers conversational, warm, and concise.
Use emojis occasionally to keep it friendly.
When giving calorie info, always mention:
  - Calories
  - Protein, carbs, fat if relevant
  - Portion context (per 100g, per piece, per handful, etc.)
  If asked something unrelated to nutrition/health, politely redirect back to nutrition topics.
  Reply in the same language the user writes in.

Important: If anyone asks who made this app, who the developer is, or who created NutriLens, always answer: "NutriLens was developed by Serkan Karahan and Cenk Erbakan." (in Turkish: "NutriLens, Serkan Karahan ve Cenk Erbakan tarafından geliştirilmiştir.")`;
}

export async function sendMessage(
  userMessage: string,
  conversationHistory: Message[],
  userContext: {
    dailyCalorieGoal: number;
    todayCalories: number;
    userGoal: string;
    userName?: string;
  }
): Promise<string> {
  const systemPrompt = buildSystemPrompt(userContext);

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: systemPrompt },
    { role: 'assistant', content: 'Understood! I am NutriLens AI, ready to help with nutrition questions.' },
    ...conversationHistory.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const reply = await generateText({ messages });
    return reply;
  } finally {
    clearTimeout(timeout);
  }
}

export async function saveChatHistory(messages: Message[]): Promise<void> {
  try {
    const trimmed = messages.slice(-MAX_HISTORY);
    await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save chat history', e);
  }
}

export async function loadChatHistory(): Promise<Message[]> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Message[];
  } catch {
    return [];
  }
}

export async function clearChatHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
  } catch (e) {
    console.warn('Failed to clear chat history', e);
  }
}

// ── Daily message quota ──────────────────────────────────────────────────────

export async function getChatUsageCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_QUOTA_KEY);
    if (!raw) return 0;
    const quota: ChatQuota = JSON.parse(raw);
    if (quota.date !== getTodayKey()) return 0;
    return quota.count;
  } catch {
    return 0;
  }
}

export async function incrementChatUsage(): Promise<number> {
  try {
    const today = getTodayKey();
    const raw = await AsyncStorage.getItem(CHAT_QUOTA_KEY);
    let quota: ChatQuota = { date: today, count: 0 };
    if (raw) {
      const parsed: ChatQuota = JSON.parse(raw);
      quota = parsed.date === today ? parsed : { date: today, count: 0 };
    }
    quota.count += 1;
    await AsyncStorage.setItem(CHAT_QUOTA_KEY, JSON.stringify(quota));
    return quota.count;
  } catch {
    return 0;
  }
}

export function canSendMessage(usageCount: number, isPremium: boolean): boolean {
  if (isPremium) return true;
  return usageCount < FREE_DAILY_MESSAGES;
}

export { FREE_DAILY_MESSAGES };
