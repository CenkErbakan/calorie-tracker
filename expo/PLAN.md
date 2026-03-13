# NutriLens - AI-Powered Calorie Tracker

A comprehensive 8-screen calorie tracking mobile app with AI food photo analysis, premium features, Turkish/English localization, and dark theme design.

---

**Design Philosophy:**
Premium health app aesthetic inspired by Whoop + MyFitnessPal + Apple Health. Dark mode with deep navy black (#0A0F1E) background, vibrant mint green (#00D4AA) primary, and coral accents. Glass morphism cards with gradient accents. Smooth spring animations throughout.

---

## Features:

### **Onboarding (5 Slides)** ✅
- [x] Welcome screen with app logo and tagline
- [x] Name & Gender collection
- [x] Physical stats (DOB, height, weight, target weight)
- [x] Activity level selection (5 levels)
- [x] Goal selection (lose weight, maintain, gain muscle)
- [x] Automatic daily calorie goal calculation (Mifflin-St Jeor formula)

### **Screen 1: Home (Today's Dashboard)** ✅
- [x] Greeting with user's name and current date
- [x] Large circular progress ring with gradient stroke
- [x] Mini stats row (consumed, goal, burned)
- [x] Macros progress bars (protein, carbs, fat)
- [x] Today's meals list with swipe-to-delete
- [x] Free user banner with scan quota
- [x] Floating action button for adding meals

### **Screen 2: Add Meal (AI Photo Analysis)** ✅
- [x] Photo selection (camera or gallery)
- [x] Photo preview with "Change Photo" option
- [x] Free user gate with paywall trigger
- [x] AI analysis with animated loading states
- [x] Editable ingredient table with column headers
- [x] Auto-recalculation when weight/calories change
- [x] Meal type selector (breakfast/lunch/dinner/snack)
- [x] Totals card with calories and macros
- [x] Notes field
- [x] Save and discard buttons
- [x] Full state reset on every screen open (fixes stale data bug)

### **Screen 3: Meal Detail** ✅
- [x] Full-width food photo with rounded bottom corners
- [x] Meal name, type badge, and timestamp
- [x] Macros horizontal bar visualization
- [x] Total calories display
- [x] Ingredient table (read-only)
- [x] Delete meal option with confirmation

### **Screen 4: History** ✅
- [x] Week/Month view toggle
- [x] Week view: horizontal bar chart (7 days)
- [x] Month view: calendar grid with daily dots
- [x] Day selection showing meals for that day
- [x] Monthly summary stats (avg calories, days under/over goal)
- [x] Average line across chart
- [x] Modal for viewing selected day meals

### **Screen 5: Analytics (Premium)** ✅
- [x] Premium gate with blurred content + upgrade prompt
- [x] Time filter: 7D | 30D | 90D
- [x] Calorie trend line chart with gradient fill
- [x] Goal line as dashed horizontal line
- [x] Macros distribution donut chart
- [x] Streak card (current/best streak)
- [x] Last 14 days visualization as colored circles
- [x] Goal achievement rate indicator

### **Screen 6: Profile** ✅
- [x] User avatar (initials-based colored circle)
- [x] User stats summary (days tracked, meals logged, avg daily kcal)
- [x] Editable profile fields
- [x] Daily goal display with explanation
- [x] Settings (notifications, language, units)
- [x] Export data option
- [x] Delete all data option with confirmation
- [x] Premium/Free plan indicator
- [x] Upgrade to Premium button for free users

### **Screen 7: Paywall/Subscription** ✅
- [x] Premium feature list with checkmarks
- [x] Pricing cards (monthly, annual, lifetime)
- [x] "Best Value" and "Save X%" badges
- [x] CTA button for free trial
- [x] Restore purchases link
- [x] Privacy/Terms links

---

## Additional Features:

### **Localization** ✅
- [x] Turkish/English language support
- [x] Auto-detection based on device locale
- [x] All UI labels, buttons, and messages translated
- [x] Language preference stored locally
- [x] Language selector in profile

### **Premium System** ✅
- [x] Free tier: 1 scan per day
- [x] Ad-supported: 1 extra scan per ad watched
- [x] Premium: unlimited scans
- [x] Daily quota tracking with midnight reset
- [x] Subscription management

### **Data & Storage** ✅
- [x] User profile with calculated goals
- [x] Meals stored by date key
- [x] Subscription status and scan quota
- [x] App settings and preferences

---

## Screens & Routes:
1. `/onboarding` — Onboarding flow (5 slides) ✅
2. `/(tabs)` — Main app with bottom tabs
   - `/` — Home dashboard ✅
   - `/history` — History view ✅
   - `/analytics` — Analytics (premium) ✅
   - `/profile` — Profile & settings ✅
3. `/add` — Add meal with AI analysis ✅
4. `/meal/[id]` — Meal detail view ✅
5. `/paywall` — Premium subscription ✅

---

## Tech Stack:
- [x] React Native + Expo Router
- [x] TypeScript throughout
- [x] React Query for server state
- [x] AsyncStorage for local data
- [x] expo-image-picker for camera/gallery
- [x] expo-localization for language detection
- [x] rork-toolkit SDK for AI analysis
- [x] createContextHook for state management
- [x] expo-haptics for tactile feedback
- [x] react-native-reanimated for animations
- [x] expo-linear-gradient for gradients
- [x] expo-blur for glass morphism effects
- [x] react-native-svg for charts and rings
- [x] KeyboardAvoidingView for all screens
- [x] ScrollView with keyboardShouldPersistTaps="handled"
