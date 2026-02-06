import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const safeGetStorage = (key, fallback) => {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key) || fallback;
  } catch (_) { /* e.g. SecurityError in private/iframe */ }
  return fallback;
};

const safeSetStorage = (key, value) => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch (_) { /* ignore */ }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => safeGetStorage('language', 'en'));

  useEffect(() => {
    safeSetStorage('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'th' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};



