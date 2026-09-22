import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute, computed } from '@angular/core';

/* =========================================================================
 * UiSkeletonComponent — Loading placeholder shimmer
 * Shapes: line | text | circle | card | image | table-row | custom
 * Supports: lines count, animated shimmer
 * ========================================================================= */
export type SkeletonShape = 'line' | 'text' | 'circle' | 'square' | 'card' | 'image' | 'table-row' | 'custom';

@Component({
  selector: 'app-ui-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    @switch (shape) {
      @case ('line') {
        <div class="ui-skeleton-line" [style.width.%]="width" [style.height.px]="height"></div>
      }
      @case ('text') {
        <div class="ui-skeleton-text" [style.max-width.%]="width">
          @for (n of linesArray(); track $index) {
            <div
              class="ui-skeleton-line"
              [style.height.px]="lineHeight"
              [style.width.%]="lineWidth($index)"
              [style.margin-bottom.px]="$last ? 0 : lineGap"
            ></div>
          }
        </div>
      }
      @case ('circle') {
        <div class="ui-skeleton-circle" [style.width.px]="size" [style.height.px]="size"></div>
      }
      @case ('square') {
        <div class="ui-skeleton-square" [style.width.px]="size" [style.height.px]="size"></div>
      }
      @case ('image') {
        <div class="ui-skeleton-image" [style.aspect-ratio]="aspectRatio" [style.width]="'100%'"></div>
      }
      @case ('card') {
        <div class="ui-skeleton-card">
          <div class="ui-skeleton-card__row" style="display:flex; gap:var(--space-3); align-items:flex-start;">
            <div class="ui-skeleton-circle" style="width:40px;height:40px;flex-shrink:0;"></div>
            <div style="flex:1; display:flex; flex-direction:column; gap:var(--space-2);">
              <div class="ui-skeleton-line" style="height:14px; width:60%;"></div>
              <div class="ui-skeleton-line" style="height:12px; width:40%;"></div>
            </div>
          </div>
          <div class="ui-skeleton-card__body">
            <div class="ui-skeleton-line" style="height:12px;"></div>
            <div class="ui-skeleton-line" style="height:12px; width:85%;"></div>
            <div class="ui-skeleton-line" style="height:12px; width:55%;"></div>
          </div>
        </div>
      }
      @case ('table-row') {
        <div class="ui-skeleton-trow" [attr.style]="rowStyle()">
          @for (n of colsArray(); track $index) {
            <div class="ui-skeleton-tcell">
              <div class="ui-skeleton-line" [style.width.%]="colWidth($index)"></div>
            </div>
          }
        </div>
      }
      @default {
        <ng-content />
      }
    }
  `,
  styles: [`
    @keyframes ui-skeleton-pulse {
      0%, 100% { opacity: 0.6; }
      50%      { opacity: 0.35; }
    }
    @keyframes ui-skeleton-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    :host { display: block; width: 100%; }

    .ui-skeleton-line,
    .ui-skeleton-circle,
    .ui-skeleton-square,
    .ui-skeleton-card,
    .ui-skeleton-trow > *,
    .ui-skeleton-image {
      background: linear-gradient(
        90deg,
        var(--neutral-200) 0%,
        var(--neutral-100) 40%,
        var(--neutral-200) 80%
      );
      background-size: 200% 100%;
      border-radius: var(--radius-md);
      animation:
        ui-skeleton-shimmer 1.4s linear infinite,
        ui-skeleton-pulse 2.2s ease-in-out infinite;
      color: transparent !important;
      pointer-events: none !important;
      user-select: none;
    }
    :root[data-theme="dark"] .ui-skeleton-line,
    :root[data-theme="dark"] .ui-skeleton-circle,
    :root[data-theme="dark"] .ui-skeleton-square,
    :root[data-theme="dark"] .ui-skeleton-card,
    :root[data-theme="dark"] .ui-skeleton-trow > *,
    :root[data-theme="dark"] .ui-skeleton-image {
      background: linear-gradient(
        90deg,
        var(--neutral-200) 0%,
        var(--neutral-100) 40%,
        var(--neutral-200) 80%
      );
      background-size: 200% 100%;
    }

    .ui-skeleton-line { min-height: 14px; border-radius: var(--radius-sm); }
    .ui-skeleton-circle { border-radius: var(--radius-full); }
    .ui-skeleton-square { border-radius: var(--radius-md); }
    .ui-skeleton-image { border-radius: var(--radius-lg); overflow: hidden; }

    .ui-skeleton-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding: var(--space-5);
      background-color: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      background-clip: padding-box;
      box-shadow: none;
    }
    .ui-skeleton-card__body {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .ui-skeleton-card .ui-skeleton-circle,
    .ui-skeleton-card .ui-skeleton-line {
      background: linear-gradient(
        90deg,
        var(--neutral-200) 0%,
        var(--neutral-100) 40%,
        var(--neutral-200) 80%
      );
      background-size: 200% 100%;
    }

    .ui-skeleton-trow {
      display: grid;
      align-items: center;
      padding: var(--space-4) var(--space-5);
      gap: var(--space-3);
      border-bottom: 1px solid var(--border-subtle);
    }
    .ui-skeleton-tcell { min-width: 0; display: flex; align-items: center; }

    @media (prefers-reduced-motion: reduce) {
      .ui-skeleton-line,
      .ui-skeleton-circle,
      .ui-skeleton-square,
      .ui-skeleton-card,
      .ui-skeleton-trow > *,
      .ui-skeleton-image {
        animation: ui-skeleton-pulse 3.2s ease-in-out infinite;
      }
    }
  `],
  host: {
    '[attr.aria-busy]': '"true"',
    '[attr.aria-hidden]': '"true"',
  }
})
export class UiSkeletonComponent {
  @Input({ transform: (v: any) => (typeof v === 'string' ? v : 'line') as SkeletonShape })
  shape: SkeletonShape | 'line' | 'text' | 'circle' | 'square' | 'card' | 'image' | 'table-row' | 'custom' = 'line';
  @Input({ transform: (v: string | number) => Number(v) }) width = 100;
  @Input({ transform: (v: string | number) => Number(v) }) height = 14;
  @Input({ transform: (v: string | number) => Number(v) }) size = 40;
  @Input() aspectRatio = '16 / 9';
  @Input({ transform: (v: string | number) => Number(v) }) lines = 3;
  @Input({ transform: (v: string | number) => Number(v) }) lineHeight = 12;
  @Input({ transform: (v: string | number) => Number(v) }) lineGap = 8;
  @Input({ transform: (v: string | number) => Number(v) }) cols = 4;
  @Input() colsTemplate = 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr)';

  readonly linesArray = computed(() => Array.from({ length: Math.max(1, this.lines) }, (_, i) => i));
  readonly colsArray  = computed(() => Array.from({ length: Math.max(1, this.cols) },  (_, i) => i));
  readonly lineWidth = (idx: number): number => {
    const last = this.linesArray().length - 1;
    if (idx === last) return Math.max(35, this.width - 30);
    if (idx === 0) return this.width;
    return this.width - (idx * 6);
  };
  readonly colWidth = (idx: number): number => {
    if (idx === 0) return 90;
    if (idx === this.colsArray().length - 1) return 40;
    return 65;
  };
  readonly rowStyle = computed(() => `grid-template-columns: ${this.colsTemplate};`);
}
