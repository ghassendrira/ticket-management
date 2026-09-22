import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguagePreferenceService } from './core/services/language-preference.service';
import { ApiErrorService } from './core/services/api-error.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="api-error-banner" *ngIf="apiErrorService.errorMessage() as errorMessage">
      <span>{{ errorMessage }}</span>
      <button type="button" class="ghost-button" (click)="apiErrorService.clear()">Fermer</button>
    </div>
    <router-outlet></router-outlet>
  `,
  styles: [
    `
      .api-error-banner {
        position: sticky;
        top: 0;
        z-index: var(--z-banner);
        display: flex;
        justify-content: space-between;
        gap: var(--space-3);
        align-items: center;
        padding: var(--space-3) var(--space-5);
        background: var(--danger-50);
        color: var(--danger-700);
        border-bottom: 1px solid color-mix(in srgb, var(--danger-500) 18%, transparent);
        font-family: var(--font-sans);
        font-size: var(--fs-base);
        line-height: var(--lh-normal);
      }
      :root[data-theme="dark"] .api-error-banner {
        background: color-mix(in srgb, var(--danger-500) 14%, transparent);
        color: var(--danger-300);
      }
      .ghost-button {
        flex-shrink: 0;
        background: transparent;
        border: 1px solid color-mix(in srgb, var(--danger-500) 28%, transparent);
        color: inherit;
        padding: 6px var(--space-3);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: var(--fs-sm);
        min-height: 32px;
        transition: background var(--transition-fast);
      }
      .ghost-button:hover {
        background: color-mix(in srgb, var(--danger-500) 10%, transparent);
      }
      .ghost-button:focus-visible {
        outline: none;
        box-shadow: var(--shadow-focus-danger);
      }
    `
  ]
})
export class AppComponent implements OnInit {
  private readonly languagePreferenceService = inject(LanguagePreferenceService);
  protected readonly apiErrorService = inject(ApiErrorService);

  ngOnInit() {
    this.languagePreferenceService.initialize();
  }
}
