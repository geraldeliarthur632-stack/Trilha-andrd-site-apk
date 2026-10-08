import { AppLanguage, APP_LANGUAGES, AppLanguageOption } from '../types';

const STORAGE_KEY = 'estudahud_app_language';

export const languageService = {
  getLanguage(): AppLanguage {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && APP_LANGUAGES.some((l) => l.code === saved)) {
        return saved as AppLanguage;
      }
    } catch {}
    return 'pt';
  },

  setLanguage(lang: AppLanguage) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      window.dispatchEvent(
        new CustomEvent('estudahud_language_changed', { detail: { language: lang } })
      );
    } catch {}
  },

  getLanguageOption(code?: string): AppLanguageOption {
    const found = APP_LANGUAGES.find((l) => l.code === code);
    return found || APP_LANGUAGES[0];
  },
};
