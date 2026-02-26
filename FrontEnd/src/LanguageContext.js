import React, { createContext, useContext, useState, useEffect } from "react";
import { en, hi } from "./constants/strings";

const LanguageContext = createContext(null);

const allStrings = { en, hi };

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("saatSaheliLang") || "en";
  });

  useEffect(() => {
    localStorage.setItem("saatSaheliLang", language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useStrings() {
  const { language } = useLanguage();
  return allStrings[language] || allStrings.en;
}
