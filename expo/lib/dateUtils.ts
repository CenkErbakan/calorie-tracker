import { format as dateFnsFormat, type Locale } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getLocales } from 'expo-localization';
import { i18n } from '@/lib/i18n';

function getDateLocale(): Locale | undefined {
  const lang = i18n.getLanguage();
  if (lang === 'tr') return tr;
  if (lang === 'en') return undefined;
  if (lang === 'auto') {
    const code = getLocales()[0]?.languageCode ?? 'en';
    return code === 'tr' ? tr : undefined;
  }
  return undefined;
}

export function formatDate(date: Date | number, formatStr: string): string {
  const locale = getDateLocale();
  return dateFnsFormat(date, formatStr, { locale });
}
