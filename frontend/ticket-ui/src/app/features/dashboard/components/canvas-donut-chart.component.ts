import {
  Component,
  ElementRef,
  input,
  OnChanges,
  OnInit,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  effect,
  signal,
  computed
} from '@angular/core';
import { CategoryStats } from '../../../core/services/ticket.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-canvas-donut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-body">
      <!-- Donut -->
      <div class="canvas-wrap" #wrap>
        <canvas #chart></canvas>
        @if (empty()) {
          <div class="empty-state">
            <div class="empty-icon">🍩</div>
            <div class="empty-text">No category data</div>
          </div>
        }
      </div>

      <!-- Legend -->
      @if (!empty()) {
        <div class="legend">
          @for (item of legendItems(); track item.category) {
            <div class="legend-row" [style.--cat-color]="item.color">
              <span class="legend-swatch"></span>
              <span class="legend-name">{{ item.label }}</span>
              <span class="legend-count">{{ item.count }}</span>
              <span class="legend-pct">{{ item.percentage }}%</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .chart-body {
      display: flex;
      align-items: center;
      gap: 28px;
      flex-wrap: wrap;
    }
    .canvas-wrap {
      position: relative;
      flex: 1 1 220px;
      min-width: 220px;
      max-width: 280px;
      aspect-ratio: 1 / 1;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .empty-state {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #64748b;
      pointer-events: none;
    }
    .empty-icon { font-size: 40px; opacity: 0.5; }
    .empty-text { font-size: 14px; }

    /* Legend */
    .legend {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 170px;
      flex: 0 1 auto;
    }
    .legend-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: #334155;
    }
    .legend-swatch {
      width: 12px;
      height: 12px;
      border-radius: 3px;
      background: var(--cat-color);
      flex-shrink: 0;
    }
    .legend-name {
      flex: 1;
      font-weight: 500;
    }
    .legend-count {
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
    .legend-pct {
      width: 36px;
      text-align: right;
      font-weight: 600;
      color: var(--cat-color);
      font-variant-numeric: tabular-nums;
    }
  `]
})
export class CanvasDonutChartComponent implements OnInit, OnChanges, OnDestroy {
  readonly data = input<CategoryStats[]>([]);

  @ViewChild('wrap', { static: true }) wrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('chart', { static: true }) canvasEl!: ElementRef<HTMLCanvasElement>;

  private resizeObserver?: ResizeObserver;
  private dpr = Math.max(1, window.devicePixelRatio || 1);

  readonly empty = signal(true);
  private readonly dataSig = signal<CategoryStats[]>([]);

  readonly legendItems = computed(() => {
    const d = this.dataSig();
    return d
      .filter(r => Number(r.count) > 0)
      .map(r => ({
        category: r.category,
        label: this.labelFor(r.category),
        count: Number(r.count),
        percentage: r.percentage,
        color: this.colorFor(r.category)
      }))
      .sort((a, b) => b.count - a.count);
  });

  private static readonly CATEGORY_COLORS: Record<string, string> = {
    BILLING:        '#6366f1', // indigo
    TECHNICAL:      '#0ea5e9', // sky blue
    ACCOUNT_ACCESS: '#10b981', // emerald
    ORDER:          '#f59e0b', // amber
    DELIVERY:       '#ec4899', // pink  ← fixed: was too close to BILLING
    OTHER:          '#94a3b8', // slate
    SECURITY:       '#ef4444', // red
    INFORMATION:    '#22c55e'  // green
  };

  constructor() {
    effect(() => this.draw(this.dataSig()));
  }

  ngOnInit() {
    this.resizeObserver = new ResizeObserver(() => this.draw(this.dataSig()));
    this.resizeObserver.observe(this.wrapper.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      const d = (this.data() || []).filter(s => Number(s.count) >= 0);
      this.dataSig.set(d);
      this.empty.set(d.length === 0 || d.reduce((s, r) => s + Number(r.count), 0) === 0);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  private colorFor(cat: string): string {
    return CanvasDonutChartComponent.CATEGORY_COLORS[cat] ?? '#64748b';
  }

  private labelFor(cat: string): string {
    return cat
      .split('_')
      .map(w => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  }

  private draw(data: CategoryStats[]) {
    const canvas = this.canvasEl.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = this.wrapper.nativeElement;
    const rect = parent.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = rect.height;

    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.floor(cssW * this.dpr);
    canvas.height = Math.floor(cssH * this.dpr);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    if (!data || data.length === 0) return;

    const total = data.reduce((s, r) => s + Number(r.count), 0);
    if (total === 0) return;

    const cx = cssW / 2;
    const cy = cssH / 2;
    const outerR = Math.min(cx, cy) * 0.94;
    const innerR = outerR * 0.62;
    const midR = (outerR + innerR) / 2;

    let angle = -Math.PI / 2;

    const segments = data
      .filter(r => Number(r.count) > 0)
      .map(r => {
        const cnt = Number(r.count);
        const sweep = (cnt / total) * Math.PI * 2;
        const start = angle;
        const end = angle + sweep;
        const mid = start + sweep / 2;
        angle = end;
        return {
          row: r,
          start,
          end,
          mid,
          sweep,
          color: this.colorFor(r.category),
          pct: r.percentage
        };
      });

    // Tiny gap between slices
    const gap = 0.012;
    for (const s of segments) {
      s.start += gap;
      s.end -= gap;
    }

    /* 1. Draw segments */
    for (const seg of segments) {
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, seg.start, seg.end);
      ctx.arc(cx, cy, innerR, seg.end, seg.start, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      // Subtle depth
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
      grad.addColorStop(0, 'rgba(0,0,0,0.07)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }

    /* 2. Percentage inside every segment */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const seg of segments) {
      const tx = cx + Math.cos(seg.mid) * midR;
      const ty = cy + Math.sin(seg.mid) * midR;

      // Adaptive font size: smaller for tiny slices
      const fontSize = seg.pct < 5 ? 10 : seg.pct < 10 ? 11 : 13;
      ctx.font = `bold ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;

      // Dark outline for readability on any color
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillText(`${seg.pct}%`, tx + 1, ty + 1);
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${seg.pct}%`, tx, ty);
    }

    /* 3. Center text */
    this.drawCenterText(ctx, cx, cy, innerR, total);
  }

  private drawCenterText(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    innerR: number,
    total: number
  ) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleSize = Math.max(22, Math.floor(innerR * 0.55));
    ctx.font = `bold ${titleSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = '#0f172a';
    ctx.fillText(total.toLocaleString(), cx, cy - 6);

    const subSize = Math.max(12, Math.floor(innerR * 0.28));
    ctx.font = `${subSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = '#64748b';
    ctx.fillText('Total', cx, cy + titleSize * 0.55);

    ctx.restore();
  }
}