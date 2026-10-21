/* eslint-disable import/no-named-as-default-member -- ใช้ instance ของ i18next โดยตรงเป็นรูปแบบปกติของไลบรารี */
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import th from './locales/th';

export type Language = 'th' | 'en';
export const LANGUAGES: Language[] = ['th', 'en'];

/** ภาษาเครื่อง: ไทยถ้าเครื่องเป็นไทย นอกนั้นอังกฤษ (SPEC C ขั้น 1) */
export function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return code === 'th' ? 'th' : 'en';
}

export const resources = { en: { translation: en }, th: { translation: th } } as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: deviceLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export function setLanguage(lng: Language): void {
  if (i18n.language !== lng) void i18n.changeLanguage(lng);
}

export function currentLanguage(): Language {
  return i18n.language === 'th' ? 'th' : 'en';
}

export const t = i18n.t.bind(i18n);
export default i18n;
