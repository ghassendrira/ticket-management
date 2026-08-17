import { Component, ElementRef, HostListener, computed, inject, input, signal } from '@angular/core';
import { LanguagePreferenceService, SupportedLanguageCode } from '../../../core/services/language-preference.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [],
  template: `
    <div
      class="lang-switcher"
      [class.dashboard]="variant() === 'dashboard'"
      [class.landing]="variant() === 'landing'"
    >
      <button
        type="button"
        class="lang-trigger"
        (click)="toggleDropdown($event)"
        [attr.aria-expanded]="isOpen()"
        aria-haspopup="menu"
        aria-label="Change language"
      >
        <span class="lang-trigger-label">{{ currentLanguage().shortLabel }}</span>
        <span class="lang-trigger-chevron" [class.open]="isOpen()">▾</span>
      </button>

      @if (isOpen()) {
        <div class="lang-dropdown" role="menu">
          @for (language of languages; track language.code) {
            <button
              type="button"
              class="lang-option"
              [class.active]="language.code === currentLanguage().code"
              (click)="selectLanguage(language.code)"
              role="menuitemradio"
              [attr.aria-checked]="language.code === currentLanguage().code"
            >
              <span class="lang-option-main">
                <span class="lang-flag">{{ language.flag }}</span>
                <span class="lang-name">{{ language.nativeLabel }}</span>
              </span>
              @if (language.code === currentLanguage().code) {
                <span class="lang-check">✓</span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .lang-switcher {
      position: relative;
      display: inline-flex;
    }

    .lang-trigger {
      height: 40px;
      min-width: 64px;
      padding: 0 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-primary);
      font-size: 0.875rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-align: start;
      transition: all 0.2s ease;
    }

    .lang-switcher.landing .lang-trigger {
      height: 44px;
      border-radius: 999px;
      padding: 0 16px;
      background-color: var(--surface);
    }

    .lang-trigger:hover {
      background-color: var(--bg-secondary);
      border-color: var(--accent-violet);
    }

    .lang-trigger-chevron {
      font-size: 0.75rem;
      color: var(--text-secondary);
      transition: transform 0.2s ease;
    }

    .lang-trigger-chevron.open {
      transform: rotate(180deg);
    }

    .lang-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      inset-inline-end: 0;
      min-width: 180px;
      padding: 8px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
      z-index: 1100;
    }

    .lang-option {
      width: 100%;
      padding: 10px 12px;
      border: none;
      border-radius: 12px;
      background: transparent;
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-family: inherit;
      text-align: start;
      transition: all 0.2s ease;
    }

    .lang-option:hover,
    .lang-option.active {
      background: var(--bg-secondary);
    }

    .lang-option.active {
      color: var(--accent-violet);
    }

    .lang-option-main {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .lang-flag {
      font-size: 1rem;
      line-height: 1;
    }

    .lang-name {
      font-size: 0.9375rem;
      font-weight: 500;
    }

    .lang-check {
      font-size: 0.875rem;
      font-weight: 700;
    }

    :host-context([dir="rtl"]) .lang-trigger,
    :host-context([dir="rtl"]) .lang-option,
    :host-context([dir="rtl"]) .lang-option-main {
      flex-direction: row-reverse;
    }

    @media (max-width: 640px) {
      .lang-switcher.landing .lang-trigger {
        min-width: 56px;
        padding: 0 14px;
      }
    }
  `]
})
export class LanguageSwitcherComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly languagePreferenceService = inject(LanguagePreferenceService);

  readonly variant = input<'dashboard' | 'landing'>('dashboard');
  readonly isOpen = signal(false);
  readonly languages = this.languagePreferenceService.supportedLanguages;
  readonly currentLanguage = computed(() =>
    this.languagePreferenceService.getLanguage(this.languagePreferenceService.currentLanguage())
  );

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isOpen.update(isOpen => !isOpen);
  }

  selectLanguage(language: SupportedLanguageCode) {
    this.languagePreferenceService.setLanguage(language);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.isOpen.set(false);
  }
}
