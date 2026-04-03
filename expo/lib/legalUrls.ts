/**
 * App Store (3.1.2): çalışan Gizlilik + Kullanım Şartları (EULA) bağlantıları.
 * Gizlilik: repo kökündeki PRIVACY.md (GitHub’da public olmalı) veya EXPO_PUBLIC_PRIVACY_POLICY_URL.
 * EULA: Apple standart lisansı (özel EULA kullanıyorsan EXPO_PUBLIC_TERMS_OF_USE_URL ile değiştir).
 */

const APPLE_STANDARD_EULA =
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/** GitHub repo public değilse veya yol farklıysa EAS env ile kendi HTTPS sayfanı ver. */
const DEFAULT_PRIVACY_FROM_GITHUB =
  'https://github.com/CenkErbakan/calorie-tracker/blob/main/PRIVACY.md';

export function getPrivacyPolicyUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_PRIVACY_FROM_GITHUB;
}

export function getTermsOfUseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_TERMS_OF_USE_URL?.trim();
  if (fromEnv) return fromEnv;
  return APPLE_STANDARD_EULA;
}
