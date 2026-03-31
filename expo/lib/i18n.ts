import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

export type Language = 'auto' | 'en' | 'tr';

const STORAGE_KEY = '@nutrilens_language';

// Turkish translations
const trTranslations = {
  // Common
  appName: 'NutriLens',
  cancel: 'İptal',
  save: 'Kaydet',
  delete: 'Sil',
  edit: 'Düzenle',
  done: 'Tamam',
  continue: 'Devam Et',
  back: 'Geri',
  next: 'İleri',
  getStarted: 'Başla',
  skip: 'Atla',
  loading: 'Yükleniyor...',
  error: 'Hata',
  success: 'Başarılı',
  confirm: 'Onayla',
  discard: 'Vazgeç',

  // Navigation
  home: 'Ana Sayfa',
  more_tab: 'Daha Fazla',
  more_subtitle: 'Öğün ekle, tara, geçmiş ve analiz',
  history: 'Geçmiş',
  analytics: 'Analiz',
  profile: 'Profil',
  addMeal: 'Öğün Ekle',

  // Onboarding
  onboardingWelcomeTitle: 'NutriLens\'e Hoş Geldiniz',
  onboardingWelcomeSubtitle: 'Daha akıllı takip et, daha iyi ye',
  onboardingNameTitle: 'Sizi tanıyalım',
  onboardingNameSubtitle: 'Size nasıl hitap etmeliyiz?',
  yourName: 'Adınız',
  gender: 'Cinsiyet',
  male: 'Erkek',
  female: 'Kadın',
  other: 'Diğer',
  onboardingStatsTitle: 'Fiziksel Özellikleriniz',
  onboardingStatsSubtitle: 'Kişiselleştirilmiş hedefler için',
  dateOfBirth: 'Doğum Tarihi',
  height: 'Boy (cm)',
  weight: 'Kilo (kg)',
  targetWeight: 'Hedef Kilo (kg) - İsteğe bağlı',
  onboardingActivityTitle: 'Aktivite Seviyeniz',
  onboardingActivitySubtitle: 'Günlük rutininizi seçin',
  sedentary: 'Hareketsiz',
  sedentaryDesc: 'Masa başı iş, egzersiz yok',
  lightlyActive: 'Hafif Aktif',
  lightlyActiveDesc: 'Haftada 1-3 gün egzersiz',
  moderatelyActive: 'Orta Aktif',
  moderatelyActiveDesc: 'Haftada 3-5 gün egzersiz',
  veryActive: 'Çok Aktif',
  veryActiveDesc: 'Haftada 6-7 gün egzersiz',
  athlete: 'Sporcu',
  athleteDesc: 'Günde 2 antrenman',
  onboardingGoalTitle: 'Hedefiniz',
  onboardingGoalSubtitle: 'Ne başarmak istiyorsunuz?',
  loseWeight: 'Kilo Vermek',
  loseWeightDesc: 'Sağlıklı bir şekilde kilo verin',
  maintainWeight: 'Kilomu Korumak',
  maintainWeightDesc: 'Mevcut kilonuzu koruyun',
  gainMuscle: 'Kas Yapmak',
  gainMuscleDesc: 'Kas kütlesi kazanın',

  // Home
  goodMorning: 'Günaydın',
  goodAfternoon: 'İyi Günler',
  goodEvening: 'İyi Akşamlar',
  today: 'Bugün',
  kcalLeft: 'kcal kaldı',
  consumed: 'Alınan',
  goal: 'Hedef',
  activityLevel: 'Aktivite Seviyesi',
  burned: 'Yakılan',
  todaysMeals: 'Bugünkü Öğünler',
  noMealsYet: 'Henüz öğün yok',
  logFirstMeal: 'İlk öğününüzü eklemek için + dokunun',
  premium: 'Premium',
  freePlan: 'Ücretsiz Plan',
  freeScanRemaining: 'Bugün 1 ücretsiz tarama hakkı',
  watchAdForScan: '1 tarama daha için reklam izleyin',
  noMoreScansToday: 'Bugünkü tarama hakkın bitti',
  watchAd: 'Reklam İzle',
  goPremium: 'Premium\'a Geç',

  // Add Meal
  takePhoto: 'Fotoğraf Çek',
  chooseFromGallery: 'Galeriden Seç',
  orAddManually: 'Veya manuel olarak ekle',
  analyzingMeal: 'Öğününüz analiz ediliyor...',
  detectingIngredients: 'Malzemeler tespit ediliyor...',
  estimatingPortions: 'Porsiyonlar tahmin ediliyor...',
  calculatingNutrition: 'Besin değerleri hesaplanıyor...',
  analyzeWithAI: 'Analiz Et',
  changePhoto: 'Fotoğrafı Değiştir',
  mealName: 'Öğün Adı',
  ingredients: 'Malzemeler',
  addIngredient: 'Malzeme Ekle',
  ingredient: 'Malzeme',
  weightUnit: 'Ağırlık (g)',
  calories: 'Kalori',
  protein: 'Protein',
  carbs: 'Karbonhidrat',
  fat: 'Yağ',
  total: 'Toplam',
  mealType: 'Öğün Tipi',
  breakfast: 'Kahvaltı',
  lunch: 'Öğle Yemeği',
  dinner: 'Akşam Yemeği',
  snack: 'Ara Öğün',
  notes: 'Notlar',
  optional: 'İsteğe bağlı',
  logThisMeal: 'Öğünü Kaydet',
  aiLowConfidence: 'AI güveni düşük - lütfen değerleri kontrol edin',
  aiEstimateEdit: 'AI tahmini — düzenlemek için dokunun',

  // Meal Detail
  mealDetails: 'Öğün Detayları',
  deleteMeal: 'Öğünü Sil',
  deleteMealConfirm: 'Bu öğünü silmek istediğinizden emin misiniz?',
  editMeal: 'Öğünü Düzenle',

  // History
  weekView: 'Haftalık',
  monthView: 'Aylık',
  weeklySummary: 'Haftalık Özet',
  monthlySummary: 'Aylık Özet',
  avgCalories: 'Ort. Kalori',
  daysUnderGoal: 'Hedef Altı',
  daysOverGoal: 'Hedef Üstü',
  bestDay: 'En İyi Gün',
  worstDay: 'En Kötü Gün',
  totalMeals: 'Toplam Öğün',
  noData: 'Veri yok',

  // Analytics (Premium)
  analyticsPremiumTitle: 'Analiz Premium Özelliğidir',
  analyticsPremiumDesc: 'Gelişmiş analizler için Premium\'a yükseltin',
  chatPremiumTitle: 'Sohbet Premium Özelliğidir',
  chatPremiumDesc: 'AI beslenme asistanına erişmek için Premium\'a geçin',
  dietPremiumTitle: 'Diyet Premium Özelliğidir',
  dietPremiumDesc: 'Kişiselleştirilmiş diyet planı için Premium\'a geçin',
  historyPremiumTitle: 'Geçmiş Premium Özelliğidir',
  historyPremiumDesc: 'Öğün geçmişinizi görüntülemek için Premium\'a geçin',
  scanPremiumTitle: 'Barkod Tarama Premium Özelliğidir',
  scanPremiumDesc: 'Ürün taramak için Premium\'a geçin',
  calorieTrend: 'Kalori Trendi',
  macrosDistribution: 'Makro Dağılımı',
  currentStreak: 'Mevcut Seri',
  bestStreak: 'En İyi Seri',
  days: 'gün',
  goalAchievement: 'Hedef Başarımı',
  daysHitGoal: 'Son 30 günde {count} gün hedefe ulaştınız',

  // Profile
  daysTracked: 'Takip Edilen Gün',
  mealsLogged: 'Kaydedilen Öğün',
  avgDailyCalories: 'Günlük Ort. Kalori',
  personalInfo: 'Kişisel Bilgiler',
  dailyGoal: 'Günlük Hedef',
  dailyGoalUpdated: 'Günlük hedef {calories} kcal olarak güncellendi',
  settings: 'Ayarlar',
  notificationReminders: 'Bildirim Hatırlatıcıları',
  language: 'Dil',
  auto: 'Otomatik',
  english: 'İngilizce',
  turkish: 'Türkçe',
  units: 'Birimler',
  metric: 'Metrik',
  imperial: 'İmparatorluk',
  exportData: 'Verileri Dışa Aktar',
  deleteAllData: 'Tüm Verileri Sil',
  deleteAllDataConfirm: 'TÜM verileriniz kalıcı olarak silinecek. Emin misiniz?',
  deleteAllDataDone: 'Veriler silindi. Uygulamayı yeniden başlatın.',
  deleteAllDataError: 'Veriler silinirken bir hata oluştu.',
  account: 'Hesap',
  subscription: 'Abonelik',
  manageSubscription: 'Aboneliği Yönet',
  appVersion: 'Uygulama Sürümü',
  privacyPolicy: 'Gizlilik Politikası',
  termsOfService: 'Kullanım Koşulları',

  // Paywall
  premiumTitle: 'NutriLens Premium',
  premiumSubtitle: 'Sınırsız özelliklerle sağlıklı yaşam',
  unlimitedScans: 'Günde sınırsız kalori tarama',
  noAds: 'Reklamsız deneyim',
  advancedAnalytics: 'Gelişmiş analizler',
  detailedMacros: 'Detaylı makro takibi',
  exportHistory: 'Öğün geçmişini dışa aktar',
  priorityAI: 'Öncelikli AI analizi',
  monthlyPlan: 'Aylık Plan',
  mostFlexible: 'En Esnek',
  quarterlyPlan: '3 Aylık Plan',
  annualPlan: 'Yıllık Plan',
  bestValue: 'En İyi Değer',
  savePercent: '%{percent} Tasarruf',
  per3Months: '/3 ay',
  lifetimePlan: 'Tek Seferlik',
  limitedOffer: 'Sınırlı Teklif',
  startFreeTrial: '3 Günlük Ücretsiz Deneme Başlat',
  cancelAnytime: 'İstediğiniz zaman iptal edin. Deneme sonuna kadar ücret alınmaz.',
  restorePurchases: 'Satın Alımları Geri Yükle',
  perMonth: '/ay',
  perYear: '/yıl',
  oneTime: 'tek seferlik',

  // Subscription screen extras
  mySubscription: 'Aboneliğim',
  upgradeForPremium: 'Premium özelliklere erişmek için yükseltin',
  lifetimeAccess: 'Ömür boyu erişim',
  expiresOn: 'Bitiş tarihi: {date}',
  premiumBenefits: 'Premium Avantajları',
  restorePurchasesHint: 'Önceki satın alımlarınızı geri yükleyin',
  getSubscription: 'Aboneliği Al',
  manageSubscriptionHint: 'Mağaza abonelik ayarlarını aç',
  cancelSubscription: 'Aboneliği iptal et',
  cancelSubscriptionConfirm: 'Aboneliğinizi iptal etmek istediğinize emin misiniz?',
  changePlan: 'Planı Değiştir',
  restoreNotFound: 'Geri yüklenecek satın alım bulunamadı',
  purchaseFailed:
    "Satın alma tamamlanamadı. İnternetinizi kontrol edin; ürünler App Store Connect ve RevenueCat'te current offering ile eşleşmeli.",
  adLoadFailed: 'Reklam yüklenemedi veya ödül verilemedi. Biraz sonra tekrar deneyin.',

  // Form placeholders
  dateFormatPlaceholder: 'GG/AA/YYYY',
  ingredientNamePlaceholder: 'Malzeme adı',
  weightPlaceholder: 'g',
  caloriesPlaceholder: 'kcal',
  notSet: 'Belirtilmedi',
  optionalPlaceholder: '-',
  exportDataReady: 'Veriler dışa aktarım için hazır',
  proteinShort: 'P',
  carbsShort: 'K',
  fatShort: 'Y',

  // Errors
  cameraPermission: 'Kamera izni gerekli',
  galleryPermission: 'Galeri izni gerekli',
  aiAnalysisFailed: 'AI analizi başarısız oldu. Lütfen manuel olarak girin.',
  saveFailed: 'Kaydetme başarısız oldu. Lütfen tekrar deneyin.',
  invalidDate: 'Geçersiz tarih',
  missingMealName: 'Lütfen öğün adı girin',
  discardConfirm: 'Değişiklikler kaybolacak. Devam etmek istiyor musunuz?',
  captureWithCamera: 'Kamerayla yemek fotoğrafı çekin',
  selectExisting: 'Galeriden fotoğraf seçin',

  // Diet Program (Premium)
  diet: 'Diyet',
  dietProgram: 'Diyet Programı',
  dietProgramDesc: 'AI destekli kişiselleştirilmiş diyet planı',
  dietPremiumOnly: 'Diyet programı Premium özelliğidir',
  dietStep0Title: 'Kaç kilo vermek istiyorsunuz?',
  dietStep0Subtitle: 'Mevcut kilonuz: {weight} kg',
  dietStep1Title: 'Ayda kaç kilo vermek istiyorsunuz?',
  dietStep1Subtitle: 'Hız seçin - yavaş daha sürdürülebilir',
  dietSpeedSlow: 'Yavaş',
  dietSpeedSlowDesc: 'Sağlıklı ve sürdürülebilir',
  dietSpeedMedium: 'Orta',
  dietSpeedMediumDesc: 'Dengeli ilerleme',
  dietSpeedFast: 'Hızlı',
  dietSpeedFastDesc: 'Hızlı sonuç',
  dietMonths: 'ay',
  dietStep2Title: 'Alerjiniz var mı?',
  dietStep2Subtitle: 'Kaçınmamız gereken besinleri ekleyin',
  dietAllergyPlaceholder: 'Örn: fındık, süt...',
  dietStep3Title: 'Yemeyi sevmediğiniz şeyler?',
  dietStep3Subtitle: 'Listeye ekleyin, diyete dahil etmeyelim',
  dietDislikedPlaceholder: 'Örn: patlıcan, karaciğer...',
  dietGenerate: 'Diyet Oluştur',
  dietPlan: 'Diyet Planım',
  dietDay: 'Gün',
  dietDailyTotal: 'Günlük Toplam',
  dietNoPlan: 'Henüz diyet planı yok',
  dietEnterWeightToLose: 'Lütfen vermek istediğiniz kilo miktarını girin',
  dietCreateNew: 'Yeni Plan Oluştur',
  dietShoppingList: 'Alışveriş Listesi',
  dietShoppingListSubtitle: '7 günlük programa göre haftalık ihtiyaçlar',
  dietShoppingListEmpty: 'Malzemeler gramajlı değilse liste boş görünebilir',
  dietExercise: 'Egzersiz',
  dietExerciseSubtitle: 'Günlük egzersiz önerileri',
  dietExerciseEmpty: 'Bu plan için egzersiz önerisi yok',

  // Water
  waterIntake: 'Su Tüketimi',
  waterGlasses: 'bardak',
  steps: 'adım',
  stepsNotAvailable: 'İzin vermek için dokun',

  // Barcode & Scanner
  scan_tab: 'Ürün Tara',
  food_mode: 'Gıda',
  medicine_mode: 'İlaç',
  medicine_info: 'İlaç Bilgisi',
  active_ingredients: 'Etken Maddeler',
  what_is_it_for: 'Ne İçin Kullanılır?',
  how_to_use: 'Nasıl Kullanılır?',
  warnings: 'Uyarılar',
  do_not_use: 'Kullanmayın:',
  ask_doctor: 'Doktora Danışın:',
  storage: 'Saklama Koşulları',
  inactive_ingredients: 'Yardımcı Maddeler',
  medicine_disclaimer: 'Bu bilgiler yalnızca referans amaçlıdır. Kullanmadan önce doktorunuza veya eczacınıza danışın.',
  medicine_not_found: 'İlaç bulunamadı. Bu ürün veritabanımızda henüz mevcut olmayabilir.',
  keep_out_of_reach: '🚫 Çocukların ulaşamayacağı yerde saklayın',

  // Chat / AI Assistant
  chat_tab: 'Sohbet',
  chat_title: 'NutriLens AI',
  chat_online: 'Çevrimiçi',
  chat_placeholder: 'Yiyecekler hakkında sor...',
  chat_welcome: 'Ben senin beslenme asistanınım.',
  chat_welcome_sub: 'Yiyecekler ve beslenme hakkında her şeyi sorabilirsin',
  chat_clear: 'Sohbeti Temizle',
  chat_clear_confirm: 'Tüm mesajlar silinsin mi?',
  chat_limit: 'Bugünkü 10 ücretsiz mesaj hakkını kullandın.',
  chat_error: 'Bir hata oluştu. Lütfen tekrar dene.',
  chat_retry: 'Tekrar Dene',
} as const;

// English translations
const enTranslations = {
  // Common
  appName: 'NutriLens',
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete',
  edit: 'Edit',
  done: 'Done',
  continue: 'Continue',
  back: 'Back',
  next: 'Next',
  getStarted: 'Get Started',
  skip: 'Skip',
  loading: 'Loading...',
  error: 'Error',
  success: 'Success',
  confirm: 'Confirm',
  discard: 'Discard',

  // Navigation
  home: 'Home',
  more_tab: 'More',
  more_subtitle: 'Add meal, scan, history and analytics',
  history: 'History',
  analytics: 'Analytics',
  profile: 'Profile',
  addMeal: 'Add Meal',

  // Onboarding
  onboardingWelcomeTitle: 'Welcome to NutriLens',
  onboardingWelcomeSubtitle: 'Track smarter, eat better',
  onboardingNameTitle: "Let's get to know you",
  onboardingNameSubtitle: 'What should we call you?',
  yourName: 'Your Name',
  gender: 'Gender',
  male: 'Male',
  female: 'Female',
  other: 'Other',
  onboardingStatsTitle: 'Your Physical Stats',
  onboardingStatsSubtitle: 'For personalized goals',
  dateOfBirth: 'Date of Birth',
  height: 'Height (cm)',
  weight: 'Weight (kg)',
  targetWeight: 'Target Weight (kg) - Optional',
  onboardingActivityTitle: 'Your Activity Level',
  onboardingActivitySubtitle: 'Select your daily routine',
  sedentary: 'Sedentary',
  sedentaryDesc: 'Desk job, no exercise',
  lightlyActive: 'Lightly Active',
  lightlyActiveDesc: 'Exercise 1-3 days/week',
  moderatelyActive: 'Moderately Active',
  moderatelyActiveDesc: 'Exercise 3-5 days/week',
  veryActive: 'Very Active',
  veryActiveDesc: 'Exercise 6-7 days/week',
  athlete: 'Athlete',
  athleteDesc: 'Training 2x per day',
  onboardingGoalTitle: 'Your Goal',
  onboardingGoalSubtitle: 'What do you want to achieve?',
  loseWeight: 'Lose Weight',
  loseWeightDesc: 'Lose weight healthily',
  maintainWeight: 'Maintain Weight',
  maintainWeightDesc: 'Keep your current weight',
  gainMuscle: 'Gain Muscle',
  gainMuscleDesc: 'Build muscle mass',

  // Home
  goodMorning: 'Good morning',
  goodAfternoon: 'Good afternoon',
  goodEvening: 'Good evening',
  today: 'Today',
  kcalLeft: 'kcal left',
  consumed: 'Consumed',
  goal: 'Goal',
  activityLevel: 'Activity Level',
  burned: 'Burned',
  todaysMeals: "Today's Meals",
  noMealsYet: 'No meals yet',
  logFirstMeal: 'Tap + to log your first meal',
  premium: 'Premium',
  freePlan: 'Free Plan',
  freeScanRemaining: '1 free scan remaining today',
  watchAdForScan: 'Watch ad for 1 more scan',
  noMoreScansToday: 'No more scans today',
  watchAd: 'Watch Ad',
  goPremium: 'Go Premium',

  // Add Meal
  takePhoto: 'Take Photo',
  chooseFromGallery: 'Choose from Gallery',
  orAddManually: 'Or add manually',
  analyzingMeal: 'Analyzing your meal...',
  detectingIngredients: 'Detecting ingredients...',
  estimatingPortions: 'Estimating portions...',
  calculatingNutrition: 'Calculating nutrition...',
  analyzeWithAI: 'Analyze',
  changePhoto: 'Change Photo',
  mealName: 'Meal Name',
  ingredients: 'Ingredients',
  addIngredient: 'Add Ingredient',
  ingredient: 'Ingredient',
  weightUnit: 'Weight (g)',
  calories: 'Calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  total: 'Total',
  mealType: 'Meal Type',
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  notes: 'Notes',
  optional: 'Optional',
  logThisMeal: 'Log This Meal',
  aiLowConfidence: 'AI confidence is low — please review values',
  aiEstimateEdit: 'AI estimate — tap to edit',

  // Meal Detail
  mealDetails: 'Meal Details',
  deleteMeal: 'Delete Meal',
  deleteMealConfirm: 'Are you sure you want to delete this meal?',
  editMeal: 'Edit Meal',

  // History
  weekView: 'Week',
  monthView: 'Month',
  weeklySummary: 'Weekly Summary',
  monthlySummary: 'Monthly Summary',
  avgCalories: 'Avg Calories',
  daysUnderGoal: 'Days Under',
  daysOverGoal: 'Days Over',
  bestDay: 'Best Day',
  worstDay: 'Worst Day',
  totalMeals: 'Total Meals',
  noData: 'No data',

  // Analytics (Premium)
  analyticsPremiumTitle: 'Analytics is Premium',
  analyticsPremiumDesc: 'Upgrade to Premium for advanced analytics',
  chatPremiumTitle: 'Chat is Premium',
  chatPremiumDesc: 'Upgrade to Premium for AI nutrition assistant',
  dietPremiumTitle: 'Diet is Premium',
  dietPremiumDesc: 'Upgrade to Premium for personalized diet plan',
  historyPremiumTitle: 'History is Premium',
  historyPremiumDesc: 'Upgrade to Premium to view meal history',
  scanPremiumTitle: 'Barcode Scan is Premium',
  scanPremiumDesc: 'Upgrade to Premium to scan products',
  calorieTrend: 'Calorie Trend',
  macrosDistribution: 'Macros Distribution',
  currentStreak: 'Current Streak',
  bestStreak: 'Best Streak',
  days: 'days',
  goalAchievement: 'Goal Achievement',
  daysHitGoal: 'You hit your goal {count} out of the last 30 days',

  // Profile
  daysTracked: 'Days Tracked',
  mealsLogged: 'Meals Logged',
  avgDailyCalories: 'Avg Daily Calories',
  personalInfo: 'Personal Info',
  dailyGoal: 'Daily Goal',
  dailyGoalUpdated: 'Daily goal updated to {calories} kcal',
  settings: 'Settings',
  notificationReminders: 'Notification Reminders',
  language: 'Language',
  auto: 'Auto',
  english: 'English',
  turkish: 'Turkish',
  units: 'Units',
  metric: 'Metric',
  imperial: 'Imperial',
  exportData: 'Export Data',
  deleteAllData: 'Delete All Data',
  deleteAllDataConfirm: 'ALL your data will be permanently deleted. Are you sure?',
  deleteAllDataDone: 'Data deleted. Please restart the app.',
  deleteAllDataError: 'An error occurred while deleting data.',
  account: 'Account',
  subscription: 'Subscription',
  manageSubscription: 'Manage Subscription',
  appVersion: 'App Version',
  privacyPolicy: 'Privacy Policy',
  termsOfService: 'Terms of Service',

  // Paywall
  premiumTitle: 'NutriLens Premium',
  premiumSubtitle: 'Healthy living with unlimited features',
  unlimitedScans: 'Unlimited calorie scans per day',
  noAds: 'Ad-free experience',
  advancedAnalytics: 'Advanced analytics',
  detailedMacros: 'Detailed macro tracking',
  exportHistory: 'Export meal history',
  priorityAI: 'Priority AI analysis',
  monthlyPlan: 'Monthly Plan',
  mostFlexible: 'Most Flexible',
  quarterlyPlan: '3-Month Plan',
  annualPlan: 'Annual Plan',
  bestValue: 'Best Value',
  savePercent: 'Save {percent}%',
  per3Months: '/3 months',
  lifetimePlan: 'Lifetime',
  limitedOffer: 'Limited Offer',
  startFreeTrial: 'Start 3-Day Free Trial',
  cancelAnytime: 'Cancel anytime. No charge until trial ends.',
  restorePurchases: 'Restore Purchases',
  perMonth: '/month',
  perYear: '/year',
  oneTime: 'one-time',

  // Subscription screen extras
  mySubscription: 'My Subscription',
  upgradeForPremium: 'Upgrade to unlock premium features',
  lifetimeAccess: 'Lifetime access',
  expiresOn: 'Renews on {date}',
  premiumBenefits: 'Premium Benefits',
  restorePurchasesHint: 'Restore your previous purchases',
  getSubscription: 'Get Subscription',
  manageSubscriptionHint: 'Open store subscription settings',
  cancelSubscription: 'Cancel Subscription',
  cancelSubscriptionConfirm: 'Are you sure you want to cancel your subscription?',
  changePlan: 'Change Plan',
  restoreNotFound: 'No purchases to restore found',
  purchaseFailed:
    'Purchase could not be completed. Check your connection; products must be linked in App Store Connect and match the RevenueCat current offering packages.',
  adLoadFailed: 'The ad could not load or the reward was not granted. Please try again later.',

  // Form placeholders
  dateFormatPlaceholder: 'DD/MM/YYYY',
  ingredientNamePlaceholder: 'Ingredient name',
  weightPlaceholder: 'g',
  caloriesPlaceholder: 'kcal',
  notSet: 'Not set',
  optionalPlaceholder: '-',
  exportDataReady: 'Data ready for export',
  proteinShort: 'P',
  carbsShort: 'C',
  fatShort: 'F',

  // Errors
  cameraPermission: 'Camera permission required',
  galleryPermission: 'Gallery permission required',
  aiAnalysisFailed: 'AI analysis failed. Please enter manually.',
  saveFailed: 'Failed to save. Please try again.',
  invalidDate: 'Invalid date',
  missingMealName: 'Please enter a meal name',
  discardConfirm: 'Your changes will be lost. Are you sure you want to continue?',
  captureWithCamera: 'Capture your meal with camera',
  selectExisting: 'Select an existing photo',

  // Diet Program (Premium)
  diet: 'Diet',
  dietProgram: 'Diet Program',
  dietProgramDesc: 'AI-powered personalized diet plan',
  dietPremiumOnly: 'Diet program is a Premium feature',
  dietStep0Title: 'How much weight do you want to lose?',
  dietStep0Subtitle: 'Your current weight: {weight} kg',
  dietStep1Title: 'How much per month?',
  dietStep1Subtitle: 'Choose your pace - slower is more sustainable',
  dietSpeedSlow: 'Slow',
  dietSpeedSlowDesc: 'Healthy and sustainable',
  dietSpeedMedium: 'Medium',
  dietSpeedMediumDesc: 'Balanced progress',
  dietSpeedFast: 'Fast',
  dietSpeedFastDesc: 'Faster results',
  dietMonths: 'months',
  dietStep2Title: 'Any allergies?',
  dietStep2Subtitle: 'Add foods we should avoid',
  dietAllergyPlaceholder: 'e.g. nuts, dairy...',
  dietStep3Title: 'Foods you dislike?',
  dietStep3Subtitle: 'Add to list, we won\'t include them',
  dietDislikedPlaceholder: 'e.g. eggplant, liver...',
  dietGenerate: 'Generate Diet',
  dietPlan: 'My Diet Plan',
  dietDay: 'Day',
  dietDailyTotal: 'Daily Total',
  dietNoPlan: 'No diet plan yet',
  dietEnterWeightToLose: 'Please enter how many kg you want to lose',
  dietCreateNew: 'Create New Plan',
  dietShoppingList: 'Shopping List',
  dietShoppingListSubtitle: 'Weekly needs based on 7-day plan',
  dietShoppingListEmpty: 'List may be empty if ingredients have no grams',
  dietExercise: 'Exercise',
  dietExerciseSubtitle: 'Daily exercise suggestions',
  dietExerciseEmpty: 'No exercise suggestions for this plan',

  // Water
  waterIntake: 'Water Intake',
  waterGlasses: 'glasses',
  steps: 'steps',
  stepsNotAvailable: 'Tap to grant permission',

  // Barcode & Scanner
  scan_tab: 'Scan',
  food_mode: 'Food',
  medicine_mode: 'Medicine',
  medicine_info: 'Medicine Info',
  active_ingredients: 'Active Ingredients',
  what_is_it_for: 'What Is It For?',
  how_to_use: 'How to Use',
  warnings: 'Warnings',
  do_not_use: 'Do Not Use If:',
  ask_doctor: 'Ask a Doctor If:',
  storage: 'Storage',
  inactive_ingredients: 'Inactive Ingredients',
  medicine_disclaimer: 'This information is for reference only. Always consult your doctor or pharmacist before use.',
  medicine_not_found: 'Medicine not found. This product may not be in our database yet.',
  keep_out_of_reach: '🚫 Keep out of reach of children',

  // Chat / AI Assistant
  chat_tab: 'Chat',
  chat_title: 'NutriLens AI',
  chat_online: 'Online',
  chat_placeholder: 'Ask about any food...',
  chat_welcome: "I'm your nutrition assistant.",
  chat_welcome_sub: 'Ask me anything about food and nutrition',
  chat_clear: 'Clear Chat',
  chat_clear_confirm: 'Clear all messages?',
  chat_limit: "You've used all 10 free messages today.",
  chat_error: 'Oops, something went wrong. Please try again.',
  chat_retry: 'Retry',
} as const;

type Translations = typeof enTranslations;

class I18n {
  private currentLanguage: Language = 'en';
  private listeners: (() => void)[] = [];

  constructor() {
    void this.loadLanguage();
  }

  private async loadLanguage() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.currentLanguage = stored as Language;
        this.notifyListeners();
        return;
      }

      // Auto-detect based on device locale
      const locales = getLocales();
      const locale = locales[0]?.languageCode ?? 'en';
      if (locale === 'tr') {
        this.currentLanguage = 'tr';
      } else {
        this.currentLanguage = 'en';
      }
      await AsyncStorage.setItem(STORAGE_KEY, this.currentLanguage);
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  }

  async setLanguage(lang: Language) {
    this.currentLanguage = lang;
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    this.notifyListeners();
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  t(key: keyof Translations, params?: Record<string, string | number>): string {
    const translations = this.currentLanguage === 'tr' ? trTranslations : enTranslations;
    let text: string = translations[key] ?? enTranslations[key] ?? (key as string);

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, String(value));
      });
    }

    return text;
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

export const i18n = new I18n();

// React hook for translations
import { useState, useEffect, useCallback } from 'react';

export function useTranslation() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return i18n.subscribe(() => forceUpdate({}));
  }, []);

  const t = useCallback((key: keyof Translations, params?: Record<string, string | number>) => {
    return i18n.t(key, params);
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    await i18n.setLanguage(lang);
  }, []);

  const language = i18n.getLanguage();

  return { t, setLanguage, language };
}
