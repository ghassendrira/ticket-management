import { CommonModule } from '@angular/common';
import { Component, Input, computed, booleanAttribute, output } from '@angular/core';
import { IconComponent, type IconName } from '../icon/icon.component';

/* =========================================================================
 * UiAlertComponent — Alert / Banner info/success/warning/error with dismiss
 * Variants: inline (default) | toast | banner | card
 * ========================================================================= */
export type AlertTone = 'info' | 'success' | 'warning' | 'error' | 'neutral';
export type AlertVariant = 'inline' | 'toast' | 'banner' | 'card';

const TONE_ICON: Record<AlertTone, IconName> = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  error: 'alert-circle',
  neutral: 'info',
};

@Component({
  selector: 'app-ui-alert',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="ui-alert__icon-wrap">
      <app-icon [name]="resolvedIcon()" size="md" aria-hidden="true" hostClass="ui-alert__icon" />
    </div>

    <div class="ui-alert__content">
      @if (title) {
        <p class="ui-alert__title" role="heading" aria-level="4">
          {{ title }}
          <ng-content select="[alertTitle]" />
        </p>
      }
      @if (message || hasDefaultContent()) {
        <div class="ui-alert__body">
          <p *ngIf="message">{{ message }}</p>
          <ng-content />
        </div>
      }
      <ng-content select="[alertActions]" class="ui-alert__actions" />
    </div>

    @if (dismissible) {
      <button
        type="button"
        class="ui-alert__close"
        (click)="onClose()"
        [attr.aria-label]="closeLabel"
      >
        <app-icon name="close" size="sm" aria-hidden="true" />
      </button>
    }
  `,
  styles: [`
    :host {
      --alert-bg: var(--info-50);
      --alert-fg: var(--info-text);
      --alert-border: color-mix(in srgb, var(--info-500) 20%, transparent);
      --alert-icon-fg: var(--info-600);
      --alert-accent: var(--info-500);
      --alert-radius: var(--radius-lg);
      --alert-padding: var(--space-4) var(--space-5);
      --alert-gap: var(--space-3);

      display: flex;
      align-items: flex-start;
      gap: var(--alert-gap);
      width: 100%;
      padding: var(--alert-padding);
      background: var(--alert-bg);
      color: var(--alert-fg);
      border: 1px solid var(--alert-border);
      border-radius: var(--alert-radius);
      position: relative;
      overflow: hidden;
      line-height: var(--lh-normal);
      font-family: var(--font-sans);
    }
    :host([data-variant="banner"]) {
      --alert-radius: 0;
      --alert-padding: var(--space-4) var(--container-padding-x);
    }
    :host([data-variant="toast"]) {
      --alert-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
    }
    :host::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 4px;
      background: var(--alert-accent);
    }
    :host([dir="rtl"])::before,
    :root[dir="rtl"] :host::before { left: auto; right: 0; }

    :host([data-tone="info"])    { --alert-bg: var(--info-50);    --alert-fg: var(--info-text);   --alert-border: color-mix(in srgb, var(--info-500) 20%, transparent); --alert-icon-fg: var(--info-600);  --alert-accent: var(--info-500); }
    :host([data-tone="success"]) { --alert-bg: var(--success-50); --alert-fg: var(--success-text);--alert-border: color-mix(in srgb, var(--success-500) 20%, transparent); --alert-icon-fg: var(--success-600); --alert-accent: var(--success-500); }
    :host([data-tone="warning"]) { --alert-bg: var(--warning-50); --alert-fg: var(--warning-text);--alert-border: color-mix(in srgb, var(--warning-500) 20%, transparent); --alert-icon-fg: var(--warning-600); --alert-accent: var(--warning-500); }
    :host([data-tone="error"])   { --alert-bg: var(--danger-50);  --alert-fg: var(--danger-text); --alert-border: color-mix(in srgb, var(--danger-500) 24%, transparent); --alert-icon-fg: var(--danger-600);  --alert-accent: var(--danger-500); }
    :host([data-tone="neutral"]) { --alert-bg: var(--neutral-100);--alert-fg: var(--neutral-700); --alert-border: var(--border-default); --alert-icon-fg: var(--neutral-600); --alert-accent: var(--neutral-500); }

    :root[data-theme="dark"] :host {
      &[data-tone="info"]    { --alert-bg: color-mix(in srgb, var(--info-500) 12%, transparent);   --alert-fg: var(--info-300);    --alert-icon-fg: var(--info-400);    --alert-border: color-mix(in srgb, var(--info-500) 25%, transparent); }
      &[data-tone="success"] { --alert-bg: color-mix(in srgb, var(--success-500) 12%, transparent);--alert-fg: var(--success-300); --alert-icon-fg: var(--success-400); --alert-border: color-mix(in srgb, var(--success-500) 25%, transparent); }
      &[data-tone="warning"] { --alert-bg: color-mix(in srgb, var(--warning-500) 12%, transparent);--alert-fg: var(--warning-300); --alert-icon-fg: var(--warning-400); --alert-border: color-mix(in srgb, var(--warning-500) 25%, transparent); }
      &[data-tone="error"]   { --alert-bg: color-mix(in srgb, var(--danger-500) 14%, transparent); --alert-fg: var(--danger-300);  --alert-icon-fg: var(--danger-400);  --alert-border: color-mix(in srgb, var(--danger-500) 30%, transparent); }
      &[data-tone="neutral"] { --alert-bg: var(--neutral-100); --alert-fg: var(--neutral-600); --alert-icon-fg: var(--neutral-500); }
    }

    .ui-alert__icon-wrap {
      flex-shrink: 0;
      width: 28px; height: 28px;
      margin-top: 2px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--alert-icon-fg) 12%, transparent);
      color: var(--alert-icon-fg);
    }

    .ui-alert__content {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .ui-alert__title {
      margin: 0;
      font-family: var(--font-sans);
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      line-height: var(--lh-snug);
      letter-spacing: -0.005em;
      color: inherit;
    }
    .ui-alert__body {
      font-size: var(--fs-sm);
      line-height: var(--lh-normal);
      color: inherit;
      p { margin: 0; }
    }
    .ui-alert__actions {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
      margin-top: var(--space-2);
    }

    .ui-alert__close {
      flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px;
      border-radius: var(--radius-sm);
      background: transparent;
      border: 0;
      color: inherit;
      cursor: pointer;
      opacity: 0.75;
      transition: background var(--transition-fast), opacity var(--transition-fast);
      &:hover { background: color-mix(in srgb, currentColor 8%, transparent); opacity: 1; }
      &:focus-visible { outline: none; box-shadow: var(--shadow-focus); opacity: 1; }
    }
  `],
  host: {
    '[attr.data-tone]': 'tone',
    '[attr.data-variant]': 'variant',
    '[attr.role]': 'role()',
    '[attr.aria-live]': 'tone === "error" || tone === "warning" ? "polite" : null',
  }
})
export class UiAlertComponent {
  @Input() tone: AlertTone = 'info';
  @Input() variant: AlertVariant = 'inline';
  @Input() title: string | null = null;
  @Input() message: string | null = null;
  @Input() icon: IconName | null = null;
  @Input({ transform: booleanAttribute }) dismissible = false;
  @Input() closeLabel = 'Fermer';

  readonly dismissed = output<void>();

  readonly resolvedIcon = computed<IconName>(() => this.icon ?? TONE_ICON[this.tone]);
  readonly role = computed(() => this.tone === 'error' ? 'alert' : 'status');

  hasDefaultContent(): boolean { return false; }

  onClose(): void {
    this.dismissed.emit();
  }
}
