import { CommonModule } from '@angular/common';
import { Component, Input, computed, booleanAttribute } from '@angular/core';
import { IconComponent, type IconName } from '../icon/icon.component';

/* =========================================================================
 * UiBadgeComponent — Badge / Chip with SEMANTIC icon + text (NEVER color alone).
 * Variants: status (open/in_progress/escalated/resolved/closed)
 *           priority (low/medium/high/urgent/critical)
 *           category (via custom tone)
 *           Tones: neutral | brand | info | success | warning | danger.
 * Styles: solid | soft | outline
 * Sizes: sm | md
 * ========================================================================= */
export type BadgeVariant = 'solid' | 'soft' | 'outline';
export type BadgeSize = 'sm' | 'md';
export type BadgeTone =
  | 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger'
  | 'status-open' | 'status-progress' | 'status-escalated' | 'status-resolved' | 'status-closed' | 'status-pending'
  | 'priority-low' | 'priority-medium' | 'priority-high' | 'priority-urgent' | 'priority-critical';

const TONE_ICON: Record<string, IconName> = {
  'neutral': 'info',
  'brand': 'sparkles',
  'info': 'info',
  'success': 'check-circle',
  'warning': 'alert-triangle',
  'danger': 'alert-circle',
  'status-open': 'circle',
  'status-progress': 'clock',
  'status-escalated': 'arrow-up',
  'status-resolved': 'check-circle',
  'status-closed': 'x-circle',
  'status-pending': 'clock',
  'priority-low': 'arrow-down',
  'priority-medium': 'minus',
  'priority-high': 'arrow-up',
  'priority-urgent': 'flag',
  'priority-critical': 'fire',
};

/* Each tone maps to a semantic base: brand/info/success/warning/danger/neutral */
type BadgeBaseTone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger';

const TONE_BASE: Record<string, BadgeBaseTone> = {
  'neutral': 'neutral',
  'brand': 'brand',
  'info': 'info',
  'success': 'success',
  'warning': 'warning',
  'danger': 'danger',
  'status-open': 'info',
  'status-progress': 'brand',
  'status-escalated': 'warning',
  'status-resolved': 'success',
  'status-closed': 'neutral',
  'status-pending': 'warning',
  'priority-low': 'neutral',
  'priority-medium': 'info',
  'priority-high': 'warning',
  'priority-urgent': 'danger',
  'priority-critical': 'danger',
};

@Component({
  selector: 'app-ui-badge',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <span class="ui-badge__label">
      @if (showIcon() && badgeIcon()) {
        <app-icon [name]="badgeIcon()!" size="xs" aria-hidden="true" hostClass="ui-badge__icon" />
      }
      <span class="ui-badge__text"><ng-content />{{ label }}</span>
    </span>
  `,
  styles: [`
    :host {
      --bdg-bg: var(--surface-subtle);
      --bdg-fg: var(--text-secondary);
      --bdg-border: transparent;
      --bdg-radius: var(--radius-full);
      --bdg-py: 2px;
      --bdg-px: var(--space-3);
      --bdg-gap: var(--space-1);
      --bdg-fs: var(--fs-xs);
      --bdg-fweight: var(--fw-semibold);
      --bdg-icon-fg: currentColor;

      display: inline-flex;
      align-items: center;
      gap: var(--bdg-gap);
      padding: var(--bdg-py) var(--bdg-px);
      min-height: 24px;
      max-width: 100%;
      background: var(--bdg-bg);
      color: var(--bdg-fg);
      border: 1px solid var(--bdg-border);
      border-radius: var(--bdg-radius);
      font-family: var(--font-sans);
      font-size: var(--bdg-fs);
      font-weight: var(--bdg-fweight);
      letter-spacing: 0.01em;
      line-height: var(--lh-snug);
      white-space: nowrap;
      vertical-align: middle;
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }
    :host([data-size="md"]) {
      --bdg-py: 4px;
      --bdg-px: var(--space-4);
      --bdg-fs: var(--fs-sm);
      --bdg-gap: 6px;
      min-height: 28px;
    }
    :host([data-shape="square"]) { --bdg-radius: var(--radius-sm); }
    :host([data-shape="rounded"]) { --bdg-radius: var(--radius-md); }

    .ui-badge__label {
      display: inline-flex; align-items: center; gap: var(--bdg-gap);
      min-width: 0;
    }
    .ui-badge__icon { color: var(--bdg-icon-fg); flex-shrink: 0; }
    .ui-badge__text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ===== SOFT (default) — bg tinted + fg high-contrast ===== */
    :host([data-variant="soft"][data-base="neutral"]) { --bdg-bg: var(--neutral-100); --bdg-fg: var(--neutral-700); }
    :root[data-theme="dark"] :host([data-variant="soft"][data-base="neutral"]) { --bdg-bg: var(--neutral-200); --bdg-fg: var(--neutral-600); }
    :host([data-variant="soft"][data-base="brand"]) { --bdg-bg: var(--brand-50); --bdg-fg: var(--brand-700); }
    :root[data-theme="dark"] :host([data-variant="soft"][data-base="brand"]) { --bdg-bg: color-mix(in srgb, var(--brand-500) 18%, transparent); --bdg-fg: var(--brand-600); }
    :host([data-variant="soft"][data-base="info"])    { --bdg-bg: var(--info-50);    --bdg-fg: var(--info-text); }
    :root[data-theme="dark"] :host([data-variant="soft"][data-base="info"])    { --bdg-bg: var(--info-100);   --bdg-fg: var(--info-300); }
    :host([data-variant="soft"][data-base="success"]) { --bdg-bg: var(--success-50); --bdg-fg: var(--success-text); }
    :root[data-theme="dark"] :host([data-variant="soft"][data-base="success"]) { --bdg-bg: var(--success-100); --bdg-fg: var(--success-300); }
    :host([data-variant="soft"][data-base="warning"]) { --bdg-bg: var(--warning-50); --bdg-fg: var(--warning-text); }
    :root[data-theme="dark"] :host([data-variant="soft"][data-base="warning"]) { --bdg-bg: var(--warning-100); --bdg-fg: var(--warning-300); }
    :host([data-variant="soft"][data-base="danger"])  { --bdg-bg: var(--danger-50);  --bdg-fg: var(--danger-text); }
    :root[data-theme="dark"] :host([data-variant="soft"][data-base="danger"])  { --bdg-bg: var(--danger-100);  --bdg-fg: var(--danger-300); }

    /* ===== SOLID — opaque high-contrast ===== */
    :host([data-variant="solid"][data-base="neutral"]) { --bdg-bg: var(--neutral-600); --bdg-fg: #fff; }
    :host([data-variant="solid"][data-base="brand"])   { --bdg-bg: var(--brand-600);   --bdg-fg: #fff; }
    :host([data-variant="solid"][data-base="info"])    { --bdg-bg: var(--info-600);    --bdg-fg: #fff; }
    :host([data-variant="solid"][data-base="success"]) { --bdg-bg: var(--success-600); --bdg-fg: #fff; }
    :host([data-variant="solid"][data-base="warning"]) { --bdg-bg: var(--warning-600); --bdg-fg: #fff; }
    :host([data-variant="solid"][data-base="danger"])  { --bdg-bg: var(--danger-600);  --bdg-fg: #fff; }

    /* ===== OUTLINE — border colored ===== */
    :host([data-variant="outline"][data-base="neutral"]) { --bdg-border: var(--neutral-300); --bdg-fg: var(--neutral-700); }
    :host([data-variant="outline"][data-base="brand"])   { --bdg-border: var(--brand-400); --bdg-fg: var(--brand-700); }
    :host([data-variant="outline"][data-base="info"])    { --bdg-border: var(--info-400);  --bdg-fg: var(--info-text); }
    :host([data-variant="outline"][data-base="success"]) { --bdg-border: var(--success-400); --bdg-fg: var(--success-text); }
    :host([data-variant="outline"][data-base="warning"]) { --bdg-border: var(--warning-400); --bdg-fg: var(--warning-text); }
    :host([data-variant="outline"][data-base="danger"])  { --bdg-border: var(--danger-400);  --bdg-fg: var(--danger-text); }
    :root[data-theme="dark"] :host([data-variant="outline"]) { --bdg-bg: transparent; }
  `],
  host: {
    '[attr.data-variant]': 'variant',
    '[attr.data-size]': 'size',
    '[attr.data-shape]': 'shape',
    '[attr.data-base]': 'baseTone()',
    '[attr.data-tone]': 'tone',
    'role': 'group',
  }
})
export class UiBadgeComponent {
  @Input() tone: BadgeTone = 'neutral';
  @Input() variant: BadgeVariant = 'soft';
  @Input() size: BadgeSize = 'sm';
  @Input() shape: 'pill' | 'square' | 'rounded' = 'pill';
  @Input() label: string = '';
  @Input() icon: IconName | null = null;
  @Input({ transform: booleanAttribute }) hideIcon = false;

  readonly baseTone = computed<BadgeBaseTone>(() => TONE_BASE[this.tone] ?? 'neutral');
  readonly badgeIcon = computed<IconName | null>(() => this.icon ?? TONE_ICON[this.tone] ?? null);
  readonly showIcon = computed(() => !this.hideIcon && !!this.badgeIcon());
}
