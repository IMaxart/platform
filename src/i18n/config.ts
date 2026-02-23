import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './en.json'
import pl from './pl.json'

const LANGUAGE_KEY = 'analytics-lang'

const getStoredLanguage = (): string => {
  if (typeof window === 'undefined') return 'en'

  try {
    return localStorage.getItem(LANGUAGE_KEY) ?? 'en'
  } catch {
    return 'en'
  }
}

export const initI18n = () => {
  if (i18n.isInitialized) return i18n

  void i18n.use(initReactI18next).init({
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    lng: getStoredLanguage(),
    resources: {
      en: { translation: en },
      pl: { translation: pl },
    },
  })

  return i18n
}

export const setLanguage = (lang: string) => {
  void i18n.changeLanguage(lang)

  try {
    localStorage.setItem(LANGUAGE_KEY, lang)
  } catch {
    // localStorage unavailable
  }
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pl', label: 'Polski' },
] as const
