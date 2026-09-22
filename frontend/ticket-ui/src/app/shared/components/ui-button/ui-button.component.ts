import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute, computed, input } from '@angular/core';
import { IconComponent, type IconName } from '../icon/icon.component';

/* =========================================================================
 * UiButtonComponent — Unified presentational button
 * Variants: primary | secondary | ghost | danger | danger-ghost
 * Sizes:    sm | md | lg
 * Supports: loading spinner, disabled, icon prefix/suffix (via inputs),
 *           full width, focus ring, keyboard accessible
 * ========================================================================= */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'button[appUiButton], a[appUiButton]',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (loading) {
      <app-icon aria-hidden="true" class="ui-btn__spinner" name="refresh" [size]="spinnerSize()" hostClass="ui-btn__spinner-svg" />
      <span class="sr-only" i18n="@@button.loading">Chargement…</span>
    } @else if (iconLeft) {
      <app-icon [name]="iconLeft" [size]="iconSize()" aria-hidden="true" hostClass="ui-btn__icon ui-btn__icon--left" />
    }

    <span class="ui-btn__label">
      <ng-content />
    </span>

    @if (!loading && iconRight) {
      <app-icon [name]="iconRight" [size]="iconSize()" aria-hidden="true" hostClass="ui-btn__icon ui-btn__icon--right" />
    }
  `,
  host: {
    '[class]': 'hostClass()',
    '[attr.type]': 'type',
    '[attr.disabled]': 'disabled || loading ? "" : null',
    '[attr.aria-disabled]': 'disabled || loading',
    '[attr.data-variant]': 'variant',
    '[attr.data-size]': 'size',
    '[class.ui-btn--loading]': 'loading',
    '[class.ui-btn--disabled]': 'disabled',
    '[class.ui-btn--block]': 'block',
  },
  styles: [`
    :host {
      --btn-py: 0.6rem;
      --btn-px: 1rem;
      --btn-fs: var(--fs-base);
      --btn-radius: var(--radius-md);
      --btn-gap: var(--space-2);
      --btn-icon-gap: var(--space-2);
      --btn-bg: transparent;
      --btn-fg: var(--text-primary);
      --btn-border: transparent;
      --btn-hover-bg: transparent;
      --btn-hover-fg: var(--text-primary);
      --btn-hover-border: transparent;
      --btn-active-bg: transparent;
      --btn-active-fg: var(--text-primary);
      --btn-shadow: none;
      --btn-disabled-opacity: 0.5;
      --btn-spinner: var(--btn-fg);

      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--btn-gap);
      padding: var(--btn-py) var(--btn-px);
      font-family: var(--font-sans);
      font-weight: var(--fw-semibold);
      font-size: var(--btn-fs);
      line-height: var(--lh-normal);
      letter-spacing: -0.005em;
      color: var(--btn-fg);
      background: var(--btn-bg);
      border: 1px solid var(--btn-border);
      border-radius: var(--btn-radius);
      text-align: center;
      text-decoration: none;
      white-space: nowrap;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
      min-height: var(--touch-target);
      min-width: var(--touch-target);
      transition:
        background-color var(--transition-fast),
        color var(--transition-fast),
        border-color var(--transition-fast),
        transform var(--dur-75) var(--ease-out),
        box-shadow var(--transition-fast),
        opacity var(--transition-fast);
      box-shadow: var(--btn-shadow);
    }
    @media (pointer: fine) {
      :host(:hover:not([disabled]):not(.ui-btn--loading)) {
        background: var(--btn-hover-bg);
        color: var(--btn-hover-fg);
        border-color: var(--btn-hover-border);
        transform: translateY(-1px);
      }
    }
    :host(:active:not([disabled]):not(.ui-btn--loading)) {
      background: var(--btn-active-bg);
      color: var(--btn-active-fg);
      transform: translateY(0);
    }
    :host(:focus-visible) {
      outline: none;
      box-shadow: var(--shadow-focus);
      z-index: 1;
    }
    :host(.ui-btn--disabled),
    :host([disabled]) {
      opacity: var(--btn-disabled-opacity);
      cursor: not-allowed;
      pointer-events: none;
      transform: none !important;
    }
    :host(.ui-btn--block) {
      width: 100%;
    }

    /* ===== VARIANTS ===== */
    :host([data-variant="primary"]) {
      --btn-bg: var(--gradient-brand-strong);
      --btn-fg: var(--text-on-brand);
      --btn-border: transparent;
      --btn-hover-bg: linear-gradient(135deg, var(--brand-700) 0%, var(--brand-600) 60%, #9B6BFF 100%);
      --btn-hover-fg: var(--text-on-brand);
      --btn-active-bg: linear-gradient(135deg, var(--brand-800) 0%, var(--brand-700) 100%);
      --btn-shadow: 0 2px 8px rgba(99, 102, 241, 0.25), inset 0 1px 0 rgba(255,255,255,0.15);
    }
    :host([data-variant="primary"]:not([disabled])) {
      background: var(--btn-bg);
    }
    :host([data-variant="primary"]:not([disabled]):hover) {
      background: var(--btn-hover-bg);
      box-shadow: 0 6px 18px rgba(99, 102, 241, 0.35), inset 0 1px 0 rgba(255,255,255,0.2);
    }

    :host([data-variant="secondary"]) {
      --btn-bg: var(--surface);
      --btn-fg: var(--text-primary);
      --btn-border: var(--border-default);
      --btn-hover-bg: var(--surface-hover);
      --btn-hover-border: var(--border-strong);
      --btn-active-bg: var(--surface-active);
      --btn-shadow: var(--shadow-xs);
    }

    :host([data-variant="outline"]) {
      --btn-bg: transparent;
      --btn-fg: var(--brand-600);
      --btn-border: var(--brand-300);
      --btn-hover-bg: var(--brand-50);
      --btn-hover-fg: var(--brand-700);
      --btn-hover-border: var(--brand-400);
      --btn-active-bg: var(--brand-100);
    }
    :root[data-theme="dark"] :host([data-variant="outline"]) {
      --btn-fg: var(--brand-500);
      --btn-border: var(--brand-400);
      --btn-hover-bg: color-mix(in srgb, var(--brand-500) 12%, transparent);
      --btn-hover-fg: var(--brand-600);
    }

    :host([data-variant="ghost"]) {
      --btn-bg: transparent;
      --btn-fg: var(--text-primary);
      --btn-border: transparent;
      --btn-hover-bg: var(--surface-hover);
      --btn-hover-fg: var(--text-primary);
      --btn-active-bg: var(--surface-active);
    }

    :host([data-variant="danger"]) {
      --btn-bg: var(--danger-600);
      --btn-fg: #FFFFFF;
      --btn-border: transparent;
      --btn-hover-bg: var(--danger-700);
      --btn-active-bg: var(--danger-700);
      --btn-shadow: 0 2px 8px rgba(239, 68, 68, 0.22);
    }
    :root[data-theme="dark"] :host([data-variant="danger"]) {
      --btn-bg: var(--danger-500);
      --btn-hover-bg: var(--danger-600);
    }

    :host([data-variant="danger-ghost"]) {
      --btn-bg: transparent;
      --btn-fg: var(--danger-600);
      --btn-border: transparent;
      --btn-hover-bg: var(--danger-50);
      --btn-hover-fg: var(--danger-700);
      --btn-active-bg: var(--danger-100);
    }
    :root[data-theme="dark"] :host([data-variant="danger-ghost"]) {
      --btn-fg: var(--danger-400);
      --btn-hover-bg: color-mix(in srgb, var(--danger-500) 12%, transparent);
      --btn-hover-fg: var(--danger-300);
    }

    /* ===== SIZES ===== */
    :host([data-size="sm"]) {
      --btn-py: 0.4rem;
      --btn-px: 0.75rem;
      --btn-fs: var(--fs-sm);
      --btn-radius: var(--radius-sm);
      --btn-gap: var(--space-1);
      min-height: 36px;
    }
    :host([data-size="lg"]) {
      --btn-py: 0.85rem;
      --btn-px: 1.35rem;
      --btn-fs: var(--fs-md);
      --btn-radius: var(--radius-lg);
      --btn-gap: var(--space-3);
      min-height: 52px;
    }

    /* ===== ICONS ===== */
    .ui-btn__icon { flex-shrink: 0; }
    .ui-btn__label { min-width: 0; overflow: visible; }
    :host(:not(.ui-btn--loading):not(:has(.ui-btn__label))) {
      --btn-px: 0.6rem;
      min-width: var(--touch-target);
    }

    /* ===== SPINNER ===== */
    .ui-btn__spinner {
      flex-shrink: 0;
      color: var(--btn-spinner);
      transform-origin: 50% 50%;
      animation: ui-btn-spin 0.8s linear infinite;
    }
    .ui-btn__spinner-svg {
      stroke-linecap: round;
    }
    @keyframes ui-btn-spin {
      to { transform: rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .ui-btn__spinner { animation: none; }
    }
  `]
})
export class UiButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) block = false;
  @Input() iconLeft: IconName | null = null;
  @Input() iconRight: IconName | null = null;
  @Input() customClass = '';

  readonly iconSize = computed<'sm' | 'md'>(() => (this.size === 'sm' ? 'sm' : 'md'));
  readonly spinnerSize = computed<'xs' | 'sm' | 'md'>(() => {
    if (this.size === 'sm') return 'xs';
    if (this.size === 'lg') return 'md';
    return 'sm';
  });

  readonly hostClass = computed(() => ['ui-btn', `ui-btn--${this.variant}`, `ui-btn--${this.size}`, this.customClass].filter(Boolean).join(' '));
}
