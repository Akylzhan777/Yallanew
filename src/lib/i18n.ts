import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import ru from '../locales/ru.json';
import ar from '../locales/ar.json';

function detectInitialLang(): string {
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang && ['en', 'ru', 'ar'].includes(urlLang)) {
    localStorage.setItem('yalla_lang', urlLang);
    return urlLang;
  }
  const saved = localStorage.getItem('yalla_lang');
  if (saved && ['en', 'ru', 'ar'].includes(saved)) {
    return saved;
  }
  const browser = navigator.language || '';
  const detected = browser.startsWith('ru') ? 'ru' : 'en';
  localStorage.setItem('yalla_lang', detected);
  return detected;
}

const initialLang = detectInitialLang();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      ar: { translation: ar },
    },
    lng: initialLang,
    fallbackLng: 'en',
    returnObjects: false,
    interpolation: { escapeValue: false },
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('yalla_lang', lng);
  const isRtl = lng === 'ar';
  document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lng);
});

const isRtl = initialLang === 'ar';
document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
document.documentElement.setAttribute('lang', initialLang);

export default i18n;
