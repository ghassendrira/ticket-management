import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type SupportedLanguageCode = 'en' | 'fr' | 'ar';

export interface LanguageOption {
  code: SupportedLanguageCode;
  label: string;
  nativeLabel: string;
  shortLabel: string;
  flag: string;
}

export const LANGUAGE_STORAGE_KEY = 'preferredLang';

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    shortLabel: 'EN',
    flag: '🇬🇧'
  },
  {
    code: 'fr',
    label: 'French',
    nativeLabel: 'Français',
    shortLabel: 'FR',
    flag: '🇫🇷'
  },
  {
    code: 'ar',
    label: 'Arabic',
    nativeLabel: 'العربية',
    shortLabel: 'AR',
    flag: 'ع'
  }
];

const RTL_LANGUAGES = new Set<SupportedLanguageCode>(['ar']);

@Injectable({
  providedIn: 'root'
})
export class LanguagePreferenceService {
  private readonly translate = inject(TranslateService);

  private readonly currentLanguageSignal = signal<SupportedLanguageCode>(this.getStoredLanguage());

  readonly storageKey = LANGUAGE_STORAGE_KEY;
  readonly supportedLanguages = SUPPORTED_LANGUAGES;
  readonly currentLanguage = computed(() => this.currentLanguageSignal());

  constructor() {
    this.translate.addLangs(SUPPORTED_LANGUAGES.map(({ code }) => code));
    void this.translate.setFallbackLang('fr');

    const translateLanguage = this.getTranslateCurrentLanguage();
    if (this.isSupportedLanguage(translateLanguage)) {
      this.currentLanguageSignal.set(translateLanguage);
    }

    this.syncDocumentLanguage(this.currentLanguageSignal());

    this.translate.onLangChange.subscribe(({ lang }) => {
      if (!this.isSupportedLanguage(lang)) {
        return;
      }

      this.currentLanguageSignal.set(lang);
      this.persistLanguage(lang);
      this.syncDocumentLanguage(lang);
    });
  }

  initialize() {
    this.applyLanguage(this.getStoredLanguage());
  }

  setLanguage(language: string) {
    if (!this.isSupportedLanguage(language)) {
      return;
    }

    this.applyLanguage(language);
  }

  getLanguage(language: string | null | undefined): LanguageOption {
    return (
      this.supportedLanguages.find(option => option.code === language) ??
      this.supportedLanguages.find(option => option.code === 'fr')!
    );
  }

  private applyLanguage(language: SupportedLanguageCode) {
    this.currentLanguageSignal.set(language);
    this.persistLanguage(language);
    this.syncDocumentLanguage(language);
    void this.translate.use(language);
  }

  private getStoredLanguage(): SupportedLanguageCode {
    if (typeof window !== 'undefined') {
      const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (this.isSupportedLanguage(storedLanguage)) {
        return storedLanguage;
      }
    }

    const translateLanguage = this.getTranslateCurrentLanguage();
    return this.isSupportedLanguage(translateLanguage) ? translateLanguage : 'fr';
  }

  private getTranslateCurrentLanguage(): string | null {
    return typeof this.translate.currentLang === 'function'
      ? this.translate.currentLang()
      : (this.translate.currentLang as unknown as string | null);
  }

  private isSupportedLanguage(language: string | null | undefined): language is SupportedLanguageCode {
    return language === 'en' || language === 'fr' || language === 'ar';
  }

  private persistLanguage(language: SupportedLanguageCode) {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }

  private syncDocumentLanguage(language: SupportedLanguageCode) {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr');
  }
}
