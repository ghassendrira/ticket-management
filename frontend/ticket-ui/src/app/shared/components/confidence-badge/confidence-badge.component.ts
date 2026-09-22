import { Component, Input, computed } from '@angular/core';

@Component({
  selector: 'app-confidence-badge',
  standalone: true,
  template: `
    <span class="conf-badge" [class]="toneClass()">
      <span class="conf-dot"></span>
      <span class="conf-label">Confiance</span>
      <span class="conf-value">{{ percentage() }}%</span>
    </span>
  `,
  styles: [
    `
      .conf-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 1.2;
        border: 1px solid transparent;
        transition: all var(--transition-fast);
      }

      .conf-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .conf-label {
        opacity: 0.9;
        font-weight: 500;
      }

      .conf-value {
        font-variant-numeric: tabular-nums;
        font-weight: 700;
      }

      .conf-badge.high {
        background: var(--accent-100);
        color: var(--accent);
        border-color: rgba(16, 185, 129, 0.2);
      }
      .conf-badge.high .conf-dot {
        background: var(--accent);
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
      }

      .conf-badge.medium {
        background: var(--warning-100);
        color: var(--warning);
        border-color: rgba(245, 158, 11, 0.2);
      }
      .conf-badge.medium .conf-dot {
        background: var(--warning);
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
      }

      .conf-badge.low {
        background: var(--danger-100);
        color: var(--danger);
        border-color: rgba(239, 68, 68, 0.2);
      }
      .conf-badge.low .conf-dot {
        background: var(--danger);
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18);
      }
    `
  ]
})
export class ConfidenceBadgeComponent {
  @Input({ required: true }) confidence = 0;

  readonly percentage = computed(() => Math.round(this.confidence * 100));

  readonly tone = computed(() => {
    if (this.confidence > 0.8) return 'high';
    if (this.confidence >= 0.5) return 'medium';
    return 'low';
  });

  toneClass(): string {
    return this.tone();
  }
}
