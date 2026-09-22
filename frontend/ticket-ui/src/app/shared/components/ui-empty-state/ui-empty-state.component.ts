import { CommonModule } from '@angular/common';
import { Component, Input, computed, input, output, TemplateRef } from '@angular/core';
import { IconComponent, type IconName } from '../icon/icon.component';
import { UiButtonComponent } from '../ui-button/ui-button.component';

/* =========================================================================
 * UiEmptyStateComponent — Standard empty/zero state pattern
 * UiErrorStateComponent — Standard error state with retry button
 * Both use shared tokens, mobile-responsive, keyboard accessible.
 * ========================================================================= */

@Component({
  selector: 'app-ui-empty-state',
  standalone: true,
  imports: [CommonModule, IconComponent, UiButtonComponent],
  template: `
    <div class="ui-empty">
      <div class="ui-empty__icon {{ iconBgClass() }}">
        <app-icon [name]="resolvedIcon()" size="2xl" aria-hidden="true" class="ui-empty__icon-svg" />
      </div>

      <div class="ui-empty__text">
        @if (title) {
          <h3 class="ui-empty__title">{{ title }}</h3>
        }
        @if (description) {
          <p class="ui-empty__desc">{{ description }}</p>
        }
        <ng-content select="[emptyText]" />
      </div>

      @if (actionLabel || actionTemplate()) {
        <div class="ui-empty__actions">
          @if (actionTemplate()) {
            <ng-container *ngTemplateOutlet="actionTemplate()!" />
          }
          @if (actionLabel && !actionTemplate()) {
            <button
              appUiButton
              type="button"
              variant="primary"
              size="md"
              [iconLeft]="actionIcon()"
              (click)="action.emit()"
            >
              {{ actionLabel }}
            </button>
          }
          <ng-content select="[emptyActions]" />
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .ui-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: clamp(3rem, 8vw, 5rem) clamp(1.25rem, 4vw, 2rem);
      gap: clamp(1rem, 3vw, 1.5rem);
      min-height: 320px;
      background: var(--surface);
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius-2xl);
    }

    .ui-empty__icon {
      width: clamp(64px, 12vw, 96px);
      height: clamp(64px, 12vw, 96px);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-full);
      flex-shrink: 0;
    }
    .ui-empty__icon--brand   { background: var(--brand-50);  color: var(--brand-600); }
    .ui-empty__icon--neutral { background: var(--neutral-100); color: var(--neutral-500); }
    .ui-empty__icon--info    { background: var(--info-50);   color: var(--info-600); }
    .ui-empty__icon--success { background: var(--success-50);color: var(--success-600); }
    .ui-empty__icon--warning { background: var(--warning-50);color: var(--warning-600); }
    .ui-empty__icon--danger  { background: var(--danger-50); color: var(--danger-600); }

    :root[data-theme="dark"] {
      .ui-empty__icon--brand   { background: color-mix(in srgb, var(--brand-500) 18%, transparent); color: var(--brand-500); }
      .ui-empty__icon--neutral { background: var(--neutral-200); color: var(--neutral-400); }
      .ui-empty__icon--info    { background: var(--info-100);   color: var(--info-400); }
      .ui-empty__icon--success { background: var(--success-100);color: var(--success-400); }
      .ui-empty__icon--warning { background: var(--warning-100);color: var(--warning-400); }
      .ui-empty__icon--danger  { background: var(--danger-100); color: var(--danger-400); }
    }

    .ui-empty__text {
      max-width: 48ch;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .ui-empty__title {
      font-family: var(--font-display);
      font-size: clamp(1.125rem, 2.2vw, 1.375rem);
      font-weight: var(--fw-semibold);
      line-height: var(--lh-tight);
      letter-spacing: -0.01em;
      color: var(--text-primary);
      margin: 0;
    }
    .ui-empty__desc {
      font-size: var(--fs-base);
      line-height: var(--lh-normal);
      color: var(--text-secondary);
      margin: 0;
    }

    .ui-empty__actions {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      flex-wrap: wrap;
      margin-top: var(--space-2);
    }
  `],
  host: {
    '[attr.role]': '"status"',
    'aria-live': 'polite',
  }
})
export class UiEmptyStateComponent {
  @Input() title = 'Aucun contenu';
  @Input() description = '';
  @Input() icon: IconName | null = null;
  @Input() tone: 'brand' | 'neutral' | 'info' | 'success' | 'warning' | 'danger' = 'neutral';
  @Input() actionLabel = '';
  @Input() actionIconName: IconName | null = null;
  readonly actionTemplate = input<TemplateRef<any> | null>(null);

  readonly action = output<void>();

  readonly resolvedIcon = computed<IconName>(() => this.icon ?? (this.tone === 'danger' ? 'alert-circle' : this.tone === 'warning' ? 'alert-triangle' : this.tone === 'success' ? 'check-circle' : this.tone === 'info' ? 'info' : this.tone === 'brand' ? 'sparkles' : 'folder'));
  readonly actionIcon = computed<IconName | null>(() => this.actionIconName ?? (this.actionLabel ? 'plus' : null));

  readonly iconBgClass = computed(() => `ui-empty__icon--${this.tone}`);
}

/* ============================================================
 * ERROR STATE
 * ============================================================ */
@Component({
  selector: 'app-ui-error-state',
  standalone: true,
  imports: [CommonModule, IconComponent, UiButtonComponent],
  template: `
    <div class="ui-error">
      <div class="ui-error__icon">
        <app-icon name="alert-circle" size="2xl" aria-hidden="true" />
      </div>

      <div class="ui-error__text">
        @if (title) {
          <h3 class="ui-error__title">{{ title }}</h3>
        }
        @if (description) {
          <p class="ui-error__desc">{{ description }}</p>
        }
        @if (details) {
          <details class="ui-error__details">
            <summary>Détails techniques</summary>
            <pre class="ui-error__details-body"><code>{{ details }}</code></pre>
          </details>
        }
        <ng-content select="[errorText]" />
      </div>

      <div class="ui-error__actions">
        <button
          appUiButton
          type="button"
          variant="primary"
          size="md"
          iconLeft="retry"
          (click)="retry.emit()"
        >
          {{ retryLabel }}
        </button>
        @if (secondaryLabel) {
          <button
            appUiButton
            type="button"
            variant="ghost"
            size="md"
            (click)="secondary.emit()"
          >
            {{ secondaryLabel }}
          </button>
        }
        <ng-content select="[errorActions]" />
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .ui-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: clamp(2.5rem, 7vw, 4rem) clamp(1.25rem, 4vw, 2rem);
      gap: var(--space-4);
      max-width: 640px;
      margin-inline: auto;
      background: var(--surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-2xl);
      box-shadow: var(--shadow-sm);
    }
    .ui-error__icon {
      width: clamp(64px, 12vw, 96px);
      height: clamp(64px, 12vw, 96px);
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: var(--radius-full);
      background: var(--danger-50);
      color: var(--danger-600);
      flex-shrink: 0;
    }
    :root[data-theme="dark"] .ui-error__icon {
      background: color-mix(in srgb, var(--danger-500) 16%, transparent);
      color: var(--danger-400);
    }
    .ui-error__text { display: flex; flex-direction: column; gap: var(--space-2); max-width: 54ch; }
    .ui-error__title {
      font-family: var(--font-display);
      font-size: clamp(1.125rem, 2.2vw, 1.375rem);
      font-weight: var(--fw-semibold);
      line-height: var(--lh-tight);
      letter-spacing: -0.01em;
      color: var(--text-primary);
      margin: 0;
    }
    .ui-error__desc { font-size: var(--fs-base); line-height: var(--lh-normal); color: var(--text-secondary); margin: 0; }
    .ui-error__details {
      margin-top: var(--space-3);
      text-align: left;
      background: var(--surface-subtle);
      border-radius: var(--radius-md);
      padding: var(--space-2) var(--space-3);
      summary {
        cursor: pointer;
        color: var(--text-tertiary);
        font-size: var(--fs-sm);
        font-weight: var(--fw-medium);
        &:focus-visible { outline: none; }
      }
      summary::-webkit-details-marker { display: none; }
    }
    .ui-error__details-body {
      margin: var(--space-2) 0 0;
      padding: var(--space-3);
      background: var(--surface-base);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      line-height: var(--lh-relaxed);
      color: var(--text-secondary);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 220px;
      overflow: auto;
    }
    .ui-error__actions {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      flex-wrap: wrap;
      margin-top: var(--space-2);
    }
  `],
  host: {
    role: 'alert',
    'aria-live': 'assertive',
  }
})
export class UiErrorStateComponent {
  @Input() title = 'Impossible de charger le contenu';
  @Input() description = 'Une erreur est survenue. Veuillez réessayer ou contacter le support si le problème persiste.';
  @Input() details: string | null = null;
  @Input() retryLabel = 'Réessayer';
  @Input() secondaryLabel = '';

  readonly retry = output<void>();
  readonly secondary = output<void>();
}
