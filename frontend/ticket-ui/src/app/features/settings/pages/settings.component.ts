import { Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguagePreferenceService, SupportedLanguageCode } from '../../../core/services/language-preference.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="settings-page">
      <header class="page-header">
        <div>
          <p class="page-eyebrow">{{ 'SETTINGS.PAGE_EYEBROW' | translate }}</p>
          <h1 class="page-title">{{ 'SETTINGS.TITLE' | translate }}</h1>
          <p class="page-subtitle">{{ 'SETTINGS.SUBTITLE' | translate }}</p>
        </div>
      </header>

      <section class="settings-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">{{ 'APP.LANGUAGE' | translate }}</h2>
            <p class="section-description">
              {{ 'SETTINGS.LANGUAGE_DESCRIPTION' | translate }}
            </p>
          </div>
        </div>

        <div class="language-grid">
          @for (language of languages; track language.code) {
            <button
              type="button"
              class="language-card"
              [class.active]="language.code === currentLanguage()"
              (click)="setLanguage(language.code)"
              [attr.aria-pressed]="language.code === currentLanguage()"
            >
              <div class="language-card-header">
                <span class="language-flag">{{ language.flag }}</span>
                @if (language.code === currentLanguage()) {
                  <span class="language-check">✓</span>
                }
              </div>
              <span class="language-name">{{ language.nativeLabel }}</span>
              <span class="language-meta">{{ language.shortLabel }}</span>
            </button>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .settings-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    .page-eyebrow {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent-violet);
    }

    .page-title {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .page-subtitle {
      margin: 12px 0 0;
      max-width: 560px;
      color: var(--text-secondary);
      font-size: 15px;
      line-height: 1.6;
    }

    .settings-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 12px 40px var(--shadow);
    }

    .section-header {
      margin-bottom: 24px;
    }

    .section-title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .section-description {
      margin: 8px 0 0;
      color: var(--text-secondary);
      font-size: 14px;
      line-height: 1.6;
    }

    .language-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .language-card {
      padding: 20px;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: var(--bg-secondary);
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
      gap: 16px;
      text-align: start;
      align-items: flex-start;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .language-card:hover {
      border-color: var(--accent-violet);
      transform: translateY(-2px);
      box-shadow: 0 16px 32px rgba(79, 70, 229, 0.12);
    }

    .language-card.active {
      border-color: var(--accent-violet);
      background: rgba(139, 92, 246, 0.08);
      box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.24);
    }

    .language-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .language-flag {
      font-size: 2rem;
      line-height: 1;
    }

    .language-check {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--accent-violet);
      color: white;
      font-size: 14px;
      font-weight: 700;
    }

    .language-name {
      font-size: 20px;
      font-weight: 700;
    }

    .language-meta {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text-secondary);
    }

    @media (max-width: 768px) {
      .settings-card {
        padding: 20px;
      }

      .page-title {
        font-size: 28px;
      }
    }
  `]
})
export class SettingsComponent {
  private readonly languagePreferenceService = inject(LanguagePreferenceService);

  readonly languages = this.languagePreferenceService.supportedLanguages;
  readonly currentLanguage = computed(() => this.languagePreferenceService.currentLanguage());

  setLanguage(language: SupportedLanguageCode) {
    this.languagePreferenceService.setLanguage(language);
  }
}
