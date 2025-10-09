import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import main language files
import en from './locales/en.json';
import am from './locales/am.json';


// Define resources with namespaces for each feature
const resources = {
  en: { 
    translation: {
      ...en,  // main translations
    },
  },
  am: { 
    translation: {
      ...am,  // main translations
    },
  }
};

// Language Detector with AsyncStorage
const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const savedLanguage = await AsyncStorage.getItem('appLanguage');
      if (savedLanguage) {
        callback(savedLanguage); // Use saved language
      } else {
        const locales = Localization.getLocales();
        const detectedLanguage = locales.length > 0 && locales[0].languageCode ? locales[0].languageCode : 'en';
        callback(detectedLanguage);
      }
    } catch (error) {
      console.error('Failed to load language from AsyncStorage:', error);
      callback('en'); // Default 
    }
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem('appLanguage', language);
    } catch (error) {
      console.error('Failed to save language to AsyncStorage:', error);
    }
  },
};

// Initialize i18n
i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng:'en',
    interpolation: { escapeValue: false },
    returnEmptyString: false,

  });

export default i18n;
