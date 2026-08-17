import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import {
  LanguagePreferenceService,
  LanguageOption,
  SupportedLanguageCode
} from '../../../core/services/language-preference.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <section class="settings-page">
      <header class="settings-header">
        <p class="eyebrow">{{ 'SETTINGS.PAGE_EYEBROW' | translate }}</p>
        <h1 class="title">{{ 'SETTINGS.TITLE' | translate }}</h1>
        <p class="subtitle">{{ 'SETTINGS.SUBTITLE' | translate }}</p>
      </header>

      <div class="settings-content">
        <section class="settings-section">
          <div class="section-heading">
            <div class="section-icon">🌍</div>
            <div>
              <h2 class="section-title">{{ 'APP.LANGUAGE' | translate }}</h2>
              <p class="section-desc">{{ 'SETTINGS.LANGUAGE_DESCRIPTION' | translate }}</p>
            </div>
          </div>

          <div class="language-cards" role="radiogroup" [attr.aria-label]="'APP.LANGUAGE' | translate">
            @for (language of languageService.supportedLanguages; track language.code) {
              <button
                type="button"
                class="language-card"
                role="radio"
                [attr.aria-checked]="language.code === languageService.currentLanguage()"
                [class.selected]="language.code === languageService.currentLanguage()"
                (click)="chooseLanguage(language.code)"
              >
                <div class="card-left">
                  <div class="card-main">
                    <span class="language-flag" aria-hidden="true">{{ language.flag }}</span>
                    <div class="language-meta">
                      <span class="language-native">{{ language.nativeLabel }}</span>
                      <span class="language-label">{{ language.label }}</span>
                    </div>
                  </div>
                </div>
                <div class="card-right">
                  <span
                    class="radio-circle"
                    [class.checked]="language.code === languageService.currentLanguage()"
                    aria-hidden="true"
                  >
                    @if (language.code === languageService.currentLanguage()) {
                      <span class="radio-dot"></span>
                    }
                  </span>
                </div>
              </button>
            }
          </div>
        </section>
      </div>
    </section>
  `,
  styles: [`
    .settings-page {
      width: 100%;
      max-width: 960px;
      padding: 24px 8px 48px;
    }

    .settings-header {
      margin-bottom: 32px;
    }

    .eyebrow {
      font-size: 13px;
      font-weight: 600;
      color: var(--accent-violet);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 8px 0;
    }

    .title {
      font-size: 32px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 8px 0;
    }

    .subtitle {
      font-size: 15px;
      color: var(--text-secondary);
      margin: 0;
      max-width: 640px;
      line-height: 1.55;
    }

    .settings-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .settings-section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 24px;
    }

    .section-heading {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .section-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
      font-size: 22px;
      flex-shrink: 0;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 4px 0;
    }

    .section-desc {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    .language-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }

    .language-card {
      text-align: left;
      width: 100%;
      min-height: 92px;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      background: var(--bg-secondary);
      border: 2px solid transparent;
      border-radius: 18px;
      color: var(--text-primary);
      cursor: pointer;
      font-family: inherit;
      transition: all 0.18s ease;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .language-card:hover {
      border-color: var(--border);
      transform: translateY(-1px);
    }

    .language-card.selected {
      border-color: var(--accent-violet);
      background: linear-gradient(180deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.04));
      box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.08);
    }

    .card-left {
      flex: 1;
      min-width: 0;
    }

    .card-main {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }

    .language-flag {
      font-size: 28px;
      line-height: 1;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--surface);
      border: 1px solid var(--border);
      flex-shrink: 0;
    }

    .language-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .language-native {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .language-label {
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .card-right {
      flex-shrink: 0;
    }

    .radio-circle {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid var(--border);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .radio-circle.checked {
      border-color: var(--accent-violet);
    }

    .radio-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
    }

    [dir="rtl"] .language-card {
      text-align: right;
    }

    [dir="rtl"] .card-main {
      flex-direction: row-reverse;
    }

    @media (max-width: 640px) {
      .settings-page { padding: 16px 4px 48px; }
      .title { font-size: 26px; }
      .settings-section { padding: 18px; border-radius: 20px; }
      .language-cards { grid-template-columns: 1fr; }
    }
  `]
})
export class SettingsComponent {
  readonly languageService = inject(LanguagePreferenceService);

  chooseLanguage(code: SupportedLanguageCode) {
    this.languageService.setLanguage(code);
  }
}
