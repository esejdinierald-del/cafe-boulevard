import { useState, useEffect } from 'react';

export type Language = 'sq' | 'en';

export const useLanguage = () => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'en' ? 'en' : 'sq') as Language;
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'sq' ? 'en' : 'sq');
  };

  return { language, setLanguage, toggleLanguage };
};
