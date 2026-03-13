# Calorie Tracker with AI Food Photo Analysis

A beautiful 3-screen calorie tracking app that uses AI to analyze food photos and estimate nutrition information.

---

**Design Philosophy:**
Clean, mobile-native aesthetic inspired by modern health apps like MyFitnessPal and Apple Health. Light mode with organic green (#4CAF50) primary and energetic orange (#FF7043) accent colors. Cards feature soft rounded corners with subtle shadows. Typography uses system fonts (SF Pro on iOS) for native feel.

---

**Features:**

**Screen 1: Today's Log** ✅
- [x] Header displaying today's date
- [x] Circular progress ring showing calories consumed vs daily goal (2,000 kcal)
- [x] List of logged meals as swipeable cards with:
  - [x] Square food photo thumbnail with rounded corners
  - [x] Meal name, total calories, and time logged
  - [x] Expandable ingredients breakdown
- [x] Large green "+" floating action button for adding meals

**Screen 2: Add Meal (AI Analysis)** ✅
- [x] Two primary options: "Take Photo" (camera) or "Upload from Gallery"
- [x] Photo preview after selection
- [x] Animated loading state with "Analyzing your meal with AI..."
- [x] Results card showing:
  - [x] Detected meal name
  - [x] Ingredient list with individual calories (editable)
  - [x] Total calories (large, bold)
  - [x] Macros breakdown (Protein/Carbs/Fat)
  - [x] Disclaimer: "AI estimate — tap to edit"
- [x] Editable fields for adjusting ingredients, weights, calories
- [x] "Log This Meal" save button

**Screen 3: Meal Detail** ✅
- [x] Full-width food photo at top
- [x] Meal name and timestamp
- [x] Complete ingredient breakdown
- [x] Horizontal macros bar visualization
- [x] Total calories (large, bold)
- [x] "Delete Meal" option

**AI Integration:** ✅
- [x] Uses rork-toolkit SDK with GPT-4o vision
- [x] Analyzes food photos for nutrition estimates
- [x] Returns structured JSON with meal name, ingredients, calories, and macros
- [x] Graceful fallback to manual entry if AI fails

**Data & Storage:** ✅
- [x] Local storage via AsyncStorage
- [x] Meals include photo (base64), ingredients, timestamps
- [x] Daily calorie goal: 2,000 kcal

---

**Screens:**
1. `/` — Today's Log (main tab) ✅
2. `/add` — Add Meal with AI analysis ✅
3. `/meal/[id]` — Meal Detail view ✅

---

**Tech Stack:**
- [x] React Native + Expo Router
- [x] TypeScript throughout
- [x] AsyncStorage for local data
- [x] expo-image-picker for camera/gallery
- [x] rork-toolkit for AI analysis
- [x] createContextHook for state management
- [x] expo-haptics for tactile feedback
- [x] Animated API for smooth transitions
