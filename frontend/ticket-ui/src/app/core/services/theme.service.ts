import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, computed, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'ticket-ui-theme';
const THEME_STORAGE_KEY_LEGACY = 'rag-theme-mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeState = signal<ThemeMode>('light');

  readonly theme = computed(() => this.themeState());
  readonly currentTheme = computed(() => this.themeState());
  readonly isDark = computed(() => this.themeState() === 'dark');

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    const initialTheme = this.resolveInitialTheme();
    this.themeState.set(initialTheme);
    this.applyTheme(initialTheme);
  }

  toggleTheme(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(theme: ThemeMode): void {
    this.themeState.set(theme);
    this.applyTheme(theme);
    this.persistTheme(theme);
  }

  private resolveInitialTheme(): ThemeMode {
    const storedTheme = this.readStoredTheme();

    if (storedTheme) {
      return storedTheme;
    }

    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return 'light';
  }

  private applyTheme(theme: ThemeMode): void {
    this.document.documentElement.setAttribute('data-theme', theme);
  }

  private persistTheme(theme: ThemeMode): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  private readStoredTheme(): ThemeMode | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    let storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    storedTheme = localStorage.getItem(THEME_STORAGE_KEY_LEGACY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      localStorage.setItem(THEME_STORAGE_KEY, storedTheme);
      localStorage.removeItem(THEME_STORAGE_KEY_LEGACY);
      return storedTheme;
    }

    return null;
  }
}
