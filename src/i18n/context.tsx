import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { translate, type Language } from "./core";

export type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export type I18nProviderProps = {
  language: Language;
  onLanguageChange?: (language: Language) => void;
  children?: ReactNode;
};

export function I18nProvider({
  language,
  onLanguageChange,
  children,
}: I18nProviderProps) {
  const t = useCallback((key: string) => translate(language, key), [language]);
  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: onLanguageChange ?? (() => undefined),
      t,
    }),
    [language, onLanguageChange, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return value;
}
