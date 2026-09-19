import { messagesEn } from "./messages.en";
import { messagesZhCN, type MessageKey } from "./messages.zh-CN";

export type Language = "zh-CN" | "en";

export const DEFAULT_LANGUAGE: Language = "zh-CN";
export const SUPPORTED_LANGUAGES: readonly Language[] = ["zh-CN", "en"];

const catalogs: Record<Language, Record<MessageKey, string>> = {
  "zh-CN": messagesZhCN,
  en: messagesEn,
};

export function translate(language: Language, key: string): string {
  return catalogs[language][key as MessageKey] ?? key;
}

export type { MessageKey };
