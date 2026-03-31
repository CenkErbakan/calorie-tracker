import { getLocales } from 'expo-localization';
import type { Language } from '@/lib/i18n';
import { PAYWALL_FALLBACK_US, SUBSCRIPTION_PRICING } from '@/types';

export type PaywallPriceDisplay = {
  monthlyMain: string;
  quarterlyMain: string;
  quarterlyPerMonth: string;
  quarterlySavingsPercent: number;
  annualMain: string;
  annualPerMonth: string;
  annualSavingsPercent: number;
};

export function formatStoreMoney(amount: number, currencyCode: string, localeTag: string): string {
  try {
    return new Intl.NumberFormat(localeTag, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

/** Mağaza fiyatı yokken: bölge TR ise TL, değilse USD tabanı (App Store gerçek fiyatı gelince bunlar kullanılmaz). */
export function pickPaywallFallbackRegion(language: Language): 'tr' | 'us' {
  const region = getLocales()[0]?.regionCode?.toUpperCase();
  if (region === 'TR') return 'tr';
  if (language === 'tr') return 'tr';
  const lang = getLocales()[0]?.languageCode ?? 'en';
  if (lang === 'tr') return 'tr';
  return 'us';
}

export function computeFallbackPaywallPrices(
  region: 'tr' | 'us',
  localeTag: string
): PaywallPriceDisplay {
  if (region === 'tr') {
    const tr = SUBSCRIPTION_PRICING;
    return {
      monthlyMain: formatStoreMoney(tr.monthly.price, 'TRY', localeTag),
      quarterlyMain: formatStoreMoney(tr.quarterly.price, 'TRY', localeTag),
      quarterlyPerMonth: formatStoreMoney(tr.quarterly.price / 3, 'TRY', localeTag),
      quarterlySavingsPercent: tr.quarterly.savingsPercent,
      annualMain: formatStoreMoney(tr.annual.price, 'TRY', localeTag),
      annualPerMonth: formatStoreMoney(tr.annual.price / 12, 'TRY', localeTag),
      annualSavingsPercent: tr.annual.savingsPercent,
    };
  }

  const us = PAYWALL_FALLBACK_US;
  return {
    monthlyMain: formatStoreMoney(us.monthly.price, 'USD', localeTag),
    quarterlyMain: formatStoreMoney(us.quarterly.price, 'USD', localeTag),
    quarterlyPerMonth: formatStoreMoney(us.quarterly.price / 3, 'USD', localeTag),
    quarterlySavingsPercent: us.quarterly.savingsPercent,
    annualMain: formatStoreMoney(us.annual.price, 'USD', localeTag),
    annualPerMonth: formatStoreMoney(us.annual.price / 12, 'USD', localeTag),
    annualSavingsPercent: us.annual.savingsPercent,
  };
}
