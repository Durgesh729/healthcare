import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from '../locales/en.json';
import mr from '../locales/mr.json';

const resources = {
  en: { translation: en },
  mr: { translation: mr },
};

// Initialize i18n synchronously with default language
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language, will be updated from AsyncStorage
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3',
  });

export const initializeI18n = async () => {
  const savedLanguage = await AsyncStorage.getItem('language');
  if (savedLanguage && savedLanguage !== i18n.language) {
    await i18n.changeLanguage(savedLanguage);
  }
};

export const changeLanguage = async (language: string) => {
  await AsyncStorage.setItem('language', language);
  await i18n.changeLanguage(language);
};

export const getCurrentLanguage = async (): Promise<string> => {
  return await AsyncStorage.getItem('language') || 'en';
};

// Custom hook for translation with type safety
export const useAppTranslation = () => {
  const { t, i18n } = useTranslation();
  
  return {
    t: (key: string, options?: any): string => t(key, options) as string,
    language: i18n.language,
    changeLanguage: async (lang: string) => {
      await changeLanguage(lang);
    },
    isEnglish: i18n.language === 'en',
    isMarathi: i18n.language === 'mr',
  };
};

export default i18n;