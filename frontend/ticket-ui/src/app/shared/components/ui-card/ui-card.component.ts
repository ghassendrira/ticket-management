import { CommonModule } from '@angular/common';
import { Component, Input, computed, booleanAttribute } from '@angular/core';
import { IconComponent, type IconName } from '../icon/icon.component';

/* =========================================================================
 * UiCardComponent — Presentational card with header/footer slots
 * Variants: elevated | bordered | subtle | flat
 * Padding:  cozy (default) | compact | spacious
 * ========================================================================= */
export type CardVariant = 'elevated' | 'bordered' | 'subtle' | 'flat';
export type CardPadding = 'compact' | 'default' | 'spacious';
export type CardRadius = 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-ui-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="ui-card__inner">
      @if (hasHeader()) {
        <header class="ui-card__header">
          <div class="ui-card__header-main">
            @if (icon) {
              <div class="ui-card__icon-wrap ui-card__icon-wrap--{{ iconTone }}">
                <app-icon [name]="icon" size="md" aria-hidden="true" />
              </div>
            }
            <div class="ui-card__header-text">
              @if (title) {
                <h3 class="ui-card__title" [class.truncate]="truncateTitle">{{ title }}</h3>
              }
              @if (subtitle) {
                <p class="ui-card__subtitle" [class.truncate]="truncateTitle">{{ subtitle }}</p>
              }
              <ng-content select="[cardTitle]" />
            </div>
          </div>
          <div class="ui-card__header-actions">
            <ng-content select="[cardHeaderActions]" />
          </div>
        </header>
      } @else {
        <ng-content select="[cardHeader]" />
      }

      <div class="ui-card__body" [class]="bodyClass()">
        <ng-content />
      </div>

      @if (footer || hasFooterContent()) {
        <footer class="ui-card__footer">
          @if (footer) { <span class="ui-card__footer-text">{{ footer }}</span> }
          <div class="ui-card__footer-actions">
            <ng-content select="[cardFooter]" />
          </div>
        </footer>
      } @else {
        <ng-content select="[cardFooterSlot]" />
      }
    </div>
  `,
  styles: [`
    :host {
      --card-bg: var(--surface);
      --card-border: var(--border-default);
      --card-shadow: var(--shadow-sm);
      --card-padding: var(--space-5);
      --card-radius: var(--radius-lg);
      --card-gap: var(--space-4);

      display: block;
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--card-radius);
      box-shadow: var(--card-shadow);
      overflow: hidden;
      transition: box-shadow var(--transition-base), transform var(--transition-base), border-color var(--transition-fast);
    }
    :host([data-variant="elevated"]) {
      --card-border: transparent;
      --card-shadow: var(--shadow-md);
      box-shadow: var(--card-shadow);
      &:hover { box-shadow: var(--shadow-lg); }
    }
    :host([data-variant="bordered"]) {
      --card-shadow: none;
    }
    :host([data-variant="subtle"]) {
      --card-bg: var(--surface-subtle);
      --card-shadow: none;
      --card-border: transparent;
    }
    :host([data-variant="flat"]) {
      --card-shadow: none;
      --card-border: transparent;
    }
    :host([data-padding="compact"])  { --card-padding: var(--space-3); --card-gap: var(--space-3); }
    :host([data-padding="spacious"]) { --card-padding: var(--space-8); --card-gap: var(--space-6); }
    :host([data-radius="md"]) { --card-radius: var(--radius-md); }
    :host([data-radius="xl"]) { --card-radius: var(--radius-xl); }

    :host([data-hoverable="true"]:hover) {
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
      border-color: var(--border-strong);
    }

    .ui-card__inner { display: flex; flex-direction: column; gap: var(--card-gap); padding: var(--card-padding); width: 100%; min-width: 0; }

    .ui-card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
    }
    .ui-card__header-main { display: flex; align-items: flex-start; gap: var(--space-3); min-width: 0; flex: 1; }
    .ui-card__header-text { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: var(--space-05); }
    .ui-card__header-actions { display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0; }

    .ui-card__icon-wrap {
      flex-shrink: 0;
      width: 40px; height: 40px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: var(--radius-md);
      background: var(--brand-50);
      color: var(--brand-600);
    }
    :root[data-theme="dark"] .ui-card__icon-wrap--brand { background: color-mix(in srgb, var(--brand-500) 18%, transparent); color: var(--brand-500); }
    .ui-card__icon-wrap--success  { background: var(--success-50); color: var(--success-600); }
    .ui-card__icon-wrap--warning  { background: var(--warning-50); color: var(--warning-600); }
    .ui-card__icon-wrap--danger   { background: var(--danger-50);  color: var(--danger-600); }
    .ui-card__icon-wrap--info     { background: var(--info-50);    color: var(--info-600); }
    .ui-card__icon-wrap--neutral  { background: var(--surface-subtle); color: var(--text-secondary); }
    :root[data-theme="dark"] {
      .ui-card__icon-wrap--success { background: color-mix(in srgb, var(--success-500) 18%, transparent); color: var(--success-400); }
      .ui-card__icon-wrap--warning { background: color-mix(in srgb, var(--warning-500) 18%, transparent); color: var(--warning-400); }
      .ui-card__icon-wrap--danger  { background: color-mix(in srgb, var(--danger-500) 18%, transparent);  color: var(--danger-400); }
      .ui-card__icon-wrap--info    { background: color-mix(in srgb, var(--info-500) 18%, transparent);    color: var(--info-400); }
    }

    .ui-card__title {
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: var(--fw-semibold);
      line-height: var(--lh-snug);
      letter-spacing: -0.01em;
      color: var(--text-primary);
      margin: 0;
    }
    .ui-card__subtitle {
      font-size: var(--fs-sm);
      color: var(--text-secondary);
      line-height: var(--lh-snug);
      margin: 0;
    }
    :host([data-padding="compact"]) .ui-card__title { font-size: var(--fs-base); }

    .ui-card__body { display: block; min-width: 0; }
    .ui-card__body--divider {
      border-top: 1px solid var(--border-subtle);
      padding-top: var(--card-gap);
    }

    .ui-card__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding-top: var(--card-gap);
      border-top: 1px solid var(--border-subtle);
    }
    .ui-card__footer-text { font-size: var(--fs-sm); color: var(--text-secondary); }
    .ui-card__footer-actions { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }

    @media (max-width: 639px) {
      .ui-card__header { flex-direction: column; align-items: stretch; }
      .ui-card__header-actions { justify-content: flex-start; }
    }
  `],
  host: {
    '[attr.data-variant]': 'variant',
    '[attr.data-padding]': 'padding',
    '[attr.data-radius]': 'radius',
    '[attr.data-hoverable]': 'hoverable',
  }
})
export class UiCardComponent {
  @Input() title: string | null = null;
  @Input() subtitle: string | null = null;
  @Input() footer: string | null = null;
  @Input() icon: IconName | null = null;
  @Input() iconTone: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'brand';
  @Input() headingTag: 'h2' | 'h3' | 'h4' | 'h5' = 'h3';
  @Input() variant: CardVariant = 'bordered';
  @Input() padding: CardPadding = 'default';
  @Input() radius: CardRadius = 'lg';
  @Input({ transform: booleanAttribute }) divider = false;
  @Input({ transform: booleanAttribute }) hoverable = false;
  @Input({ transform: booleanAttribute }) truncateTitle = false;
  @Input() customBodyClass = '';

  readonly hasHeader = computed(() => !!this.title || !!this.subtitle || !!this.icon);
  readonly hasFooterContent = computed(() => false);

  readonly bodyClass = computed(() => ['ui-card__body', this.divider ? 'ui-card__body--divider' : '', this.customBodyClass].filter(Boolean).join(' '));
}
