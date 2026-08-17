import { Component, ElementRef, inject, input, OnChanges, OnInit, SimpleChanges, ViewChild, effect, signal } from '@angular/core';
import { DailyTicketStats } from '../../../core/services/ticket.service';
import { CommonModule } from '@angular/common';

/**
 * Modern SaaS-style native Canvas line chart: "Tickets Created vs Resolved"
 *  - Unified soft purple/gray fill under the upper envelope of the two series
 *  - Blue = Created, Red = Resolved
 *  - White-fill circular points, colored borders
 *  - Clean horizontal grid, Y labels (left), X labels (bottom)
 *  - HTML legend centered under the canvas
 *  - Hover interactions: nearest-point detection, vertical guide line,
 *    enlarged hovered point, and HTML tooltip card
 *  - Responsive via ResizeObserver; devicePixelRatio-aware rendering
 * No third-party chart library
 */
@Component({
  selector: 'app-canvas-line-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-root" #root>
      <div class="chart-canvas-wrap" #canvasWrap>
      <canvas #chart (mousemove)="onMouseMove($any($event))"
                (mouseleave)="onMouseLeave()"></canvas>
      @if (empty()) {
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <div class="empty-text">No data available for the selected period</div>
        </div>
      }
      <!-- Hover tooltip -->
      @if (tooltipVisible()) {
        <div class="chart-tooltip"
             [style.left.px]="tooltipPos().x"
             [style.top.px]="tooltipPos().y">
          <div class="tooltip-date">{{ tooltipDate() }}</div>
          @if (tooltipRow('created').show) {
            <div class="tooltip-row">
              <span class="tooltip-dot" style="background:#3b82f6"></span>
              <span class="tooltip-label">Created:</span>
              <span class="tooltip-value"><b>{{ tooltipRow('created').value }}</b></span>
            </div>
          }
          @if (tooltipRow('resolved').show) {
            <div class="tooltip-row">
              <span class="tooltip-dot" style="background:#ef4444"></span>
              <span class="tooltip-label">Resolved:</span>
              <span class="tooltip-value"><b>{{ tooltipRow('resolved').value }}</b></span>
            </div>
          }
        </div>
      }
    </div>
    <!-- Legend centered under canvas -->
    <div class="chart-legend">
      <div class="legend-item">
        <span class="legend-dot" style="background:#3b82f6"></span>
        <span class="legend-label">Created</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background:#ef4444"></span>
        <span class="legend-label">Resolved</span>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .chart-root {
      position: relative;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .chart-canvas-wrap {
      position: relative;
      width: 100%;
      height: 300px;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: crosshair;
    }

    .empty-state {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text-secondary, #64748b);
      pointer-events: none;
    }

    .empty-icon {
      font-size: 40px;
      opacity: 0.5;
    }

    .empty-text {
      font-size: 14px;
    }

    /* Tooltip */
    .chart-tooltip {
      position: absolute;
      pointer-events: none;
      transform: translate(-50%, -100%);
      background: #ffffff;
      color: var(--text-primary, #0f172a);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      padding: 10px 14px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.06);
      font-size: 13px;
      z-index: 10;
      min-width: 140px;
      transition: opacity 80ms ease-out;
      white-space: nowrap;
    }

    .tooltip-date {
      font-weight: 600;
      color: var(--text-primary, #0f172a);
      margin-bottom: 6px;
      font-size: 13px;
    }

    .tooltip-row {
      display: flex;
      align-items: center;
      gap: 8px;
      line-height: 1.5;
    }

    .tooltip-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex: 0 0 auto;
      box-shadow: 0 0 0 2px rgba(255,255,255);
    }

    .tooltip-label {
      color: var(--text-secondary, #64748b);
    }

    .tooltip-value {
      margin-left: auto;
      color: var(--text-primary, #0f172a);
      font-variant-numeric: tabular-nums;
    }

    /* Legend */
    .chart-legend {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 28px;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text-primary, #0f172a);
      font-weight: 500;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex: 0 0 auto;
    }
  `]
})
export class CanvasLineChartComponent implements OnInit, OnChanges {
  private readonly elementRef = inject(ElementRef);

  readonly data = input<DailyTicketStats[]>([]);

  @ViewChild('root', { static: true }) root!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasWrap', { static: true }) wrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('chart', { static: true }) canvasEl!: ElementRef<HTMLCanvasElement>;

  private resizeObserver?: ResizeObserver;
  private dpr = Math.max(1, window.devicePixelRatio || 1);

  readonly empty = signal(true);

  // Hover state
  private readonly hoverIndex = signal<number | null>(null);
  readonly tooltipVisible = signal(false);
  readonly tooltipPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  readonly tooltipDate = signal('');

  // Cached layout for hover lookups (rebuilt on each draw)
  private layout: {
    padding: { top: number; right: number; bottom: number; left: number };
    chartW: number;
    chartH: number;
    n: number;
    stepX: number;
    maxY: number;
    xFor: (i: number) => number;
    yFor: (v: number) => number;
    data: DailyTicketStats[];
  } | null = null;

  private readonly dataSig = signal<DailyTicketStats[]>([]);

  constructor() {
    effect(() => this.drawChart(this.dataSig()));
  }

  ngOnInit() {
    this.resizeObserver = new ResizeObserver(() => {
      this.drawChart(this.dataSig());
      // Update tooltip position after resize if hovered
      const idx = this.hoverIndex();
      if (idx != null) this.updateTooltipFromIndex(idx);
    });
    this.resizeObserver.observe(this.wrapper.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      const d = this.data() || [];
      this.dataSig.set(d);
      this.empty.set(d.length === 0 || d.every(b => b.created === 0 && b.resolved === 0));
      if (this.tooltipVisible()) this.onMouseLeave();
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  /** Returns the series to show for a tooltip row. */
  tooltipRow(series: 'created' | 'resolved'): { show: boolean; value: number } {
    const idx = this.hoverIndex();
    const d = this.dataSig();
    if (idx == null || !d[idx]) return { show: false, value: 0 };
    const value = Number(series === 'created' ? d[idx].created : d[idx].resolved) || 0;
    return { show: true, value };
  }

  // ---------- Hover handlers ----------

  onMouseMove(evt: MouseEvent) {
    const rect = (evt.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const L = this.layout;
    if (!L || L.n === 0) return;

    if (x < L.padding.left - 10 || x > L.padding.left + L.chartW + 10) {
      this.onMouseLeave();
      return;
    }

    // Find nearest index by X
    let nearest = Math.round((x - L.padding.left) / L.stepX);
    nearest = Math.max(0, Math.min(L.n - 1, !isFinite(nearest) || isNaN(nearest) ? 0 : nearest));
    if (L.n === 1) nearest = 0;

    this.hoverIndex.set(nearest);
    this.updateTooltipFromIndex(nearest, { mouseY: y, rect });
    this.drawChart(this.dataSig());
  }

  onMouseLeave() {
    this.hoverIndex.set(null);
    this.tooltipVisible.set(false);
    this.drawChart(this.dataSig());
  }

  private updateTooltipFromIndex(index: number, extra?: { mouseY: number; rect: DOMRect }) {
    const L = this.layout;
    const d = this.dataSig();
    if (!L || !d[index]) return;

    const x = L.xFor(index);
    const wrap = this.wrapper.nativeElement.getBoundingClientRect();
    const pointX = x;
    // Top-most point (pick whichever series is higher at this index)
    const cY = L.yFor(Number(d[index].created) || 0);
    const rY = L.yFor(Number(d[index].resolved) || 0);
    const topY = Math.min(cY, rY) - 12;

    // Tooltip position within wrapper (absolute within wrap)
    let tipX = pointX;
    let tipY = topY;

    // Prevent horizontal clamp
    const wrapW = wrap.width;
    if (tipX < 80) tipX = 80;
    if (tipX > wrapW - 80) tipX = wrapW - 80;
    if (tipY < 4) tipY = extra ? extra.mouseY - 8 : topY;

    this.tooltipPos.set({ x: tipX, y: tipY < 8 ? (cY - 16) : tipY });
    this.tooltipDate.set(this.prettyDate(d[index].date));
    this.tooltipVisible.set(true);
  }

  private prettyDate(iso: string): string {
    try {
      const d = new Date(iso + 'T00:00:00');
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  }

  // ---------- Drawing ----------

  private drawChart(data: DailyTicketStats[]) {
    const canvas = this.canvasEl.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = this.wrapper.nativeElement;
    const rect = parent.getBoundingClientRect();
    const cssW = Math.max(rect.width, 320);
    const cssH = Math.max(rect.height, 280);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.floor(cssW * this.dpr);
    canvas.height = Math.floor(cssH * this.dpr);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    if (!data || data.length === 0) {
      this.layout = null;
      return;
    }

    // Layout insets
    const padding = { top: 16, right: 12, bottom: 36, left: 48 };
    const chartW = cssW - padding.left - padding.right;
    const chartH = cssH - padding.top - padding.bottom;
    if (chartW <= 40 || chartH <= 40) return;

    const valuesCreated = data.map(d => Number(d.created) || 0);
    const valuesResolved = data.map(d => Number(d.resolved) || 0);
    const allValues = [...valuesCreated, ...valuesResolved, 0];
    const rawMax = Math.max(...allValues);
    const maxY = this.niceCeil(rawMax);

    const n = data.length;
    const stepX = n > 1 ? chartW / (n - 1) : 0;

    const xFor = (i: number) => padding.left + (n === 1 ? chartW / 2 : i * stepX);
    const yFor = (v: number) => padding.top + chartH - (maxY === 0 ? 0 : (v / maxY) * chartH);

    this.layout = { padding, chartW, chartH, n, stepX, maxY, xFor, yFor, data };

    // 1. Background soft unified fill (pale purple envelope) - area under upper(max(c,r))
    this.drawEnvelopeFill(ctx, data, xFor, yFor, chartH, padding);

    // 2. Horizontal grid + Y labels (5 ticks)
    this.drawGridAndYAxis(ctx, padding, chartW, chartH, maxY);

    // 3. Resolved line then Created on top (so blue overlays red when they cross — matches image-like stacking)
    this.drawSingleLine(ctx, data, d => Number(d.resolved) || 0, xFor, yFor, '#ef4444');
    this.drawSingleLine(ctx, data, d => Number(d.created) || 0, xFor, yFor, '#3b82f6');

    // 4. X axis labels
    this.drawXLabels(ctx, data, xFor, padding, chartH);

    // 5. Points (hovered drawn last)
    const hoverIdx = this.hoverIndex();
    for (let i = 0; i < n; i++) {
      const isHover = hoverIdx === i;
      const x = xFor(i);
      this.drawPoint(ctx, x, yFor(Number(data[i].resolved) || 0), '#ef4444', isHover);
      this.drawPoint(ctx, x, yFor(Number(data[i].created) || 0), '#3b82f6', isHover);
    }

    // 6. Hover guide line
    if (hoverIdx != null) {
      const x = xFor(hoverIdx);
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartH);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Draw the SaaS-style soft pale purple/gray fill under the MAX envelope of
   * the two series. Matches the reference screenshot where the fill is a
   * single muted region rather than two stacked gradient fills.
   */
  private drawEnvelopeFill(
    ctx: CanvasRenderingContext2D,
    data: DailyTicketStats[],
    xFor: (i: number) => number,
    yFor: (v: number) => number,
    chartH: number,
    padding: { top: number; left: number }
  ) {
    const n = data.length;
    if (n === 0) return;
    ctx.beginPath();
    const baseY = padding.top + chartH;
    ctx.moveTo(xFor(0), baseY);
    for (let i = 0; i < n; i++) {
      const c = Number(data[i].created) || 0;
      const r = Number(data[i].resolved) || 0;
      const upper = Math.max(c, r);
      ctx.lineTo(xFor(i), yFor(upper));
    }
    ctx.lineTo(xFor(n - 1), baseY);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    grad.addColorStop(0, 'rgba(139, 92, 246, 0.18)');
    grad.addColorStop(1, 'rgba(139, 92, 246, 0.04)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  private drawGridAndYAxis(
    ctx: CanvasRenderingContext2D,
    padding: { top: number; left: number; right: number },
    chartW: number,
    chartH: number,
    maxY: number
  ) {
    const tickCount = 5;
    ctx.save();
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= tickCount; i++) {
      const ratio = i / tickCount;
      const y = padding.top + chartH - ratio * chartH;
      const value = Math.round(ratio * maxY);
      // Grid line
      ctx.beginPath();
      ctx.strokeStyle = i === tickCount
        ? 'rgba(148, 163, 184, 0.55)'
        : 'rgba(148, 163, 184, 0.18)';
      ctx.lineWidth = 1;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      // Y label
      ctx.fillStyle = 'var(--text-secondary,#64748b)';
      ctx.textAlign = 'right';
      ctx.fillText(String(value), padding.left - 10, y);
    }
    ctx.restore();
  }

  private drawSingleLine(
    ctx: CanvasRenderingContext2D,
    data: DailyTicketStats[],
    valueFn: (d: DailyTicketStats) => number,
    xFor: (i: number) => number,
    yFor: (v: number) => number,
    color: string
  ) {
    const n = data.length;
    if (n === 0) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = xFor(i);
      const y = yFor(valueFn(data[i]));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawXLabels(
    ctx: CanvasRenderingContext2D,
    data: DailyTicketStats[],
    xFor: (i: number) => number,
    padding: { top: number; left: number; bottom: number },
    chartH: number
  ) {
    const n = data.length;
    const step = this.axisLabelStep(n);
    ctx.save();
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'var(--text-secondary,#64748b)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < n; i++) {
      if (i % step !== 0 && i !== n - 1) continue;
      const x = xFor(i);
      const y = padding.top + chartH + 10;
      ctx.fillText(this.formatXLabel(data[i].date, n), x, y);
    }
    ctx.restore();
  }

  private drawPoint(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    color: string,
    hovered: boolean
  ) {
    const rOuter = hovered ? 7 : 4.2;
    const border = hovered ? 3 : 2;
    ctx.save();
    // Outer white halo on hover (optional subtle)
    if (hovered) {
      ctx.beginPath();
      ctx.arc(x, y, rOuter + 3, 0, Math.PI * 2);
      ctx.fillStyle = color + '22';
      ctx.fill();
    }
    // White fill
    ctx.beginPath();
    ctx.arc(x, y, rOuter, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    // Colored border
    ctx.lineWidth = border;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }

  private niceCeil(v: number): number {
    if (v <= 0) return 5;
    if (v <= 10) return Math.ceil(v / 2) * 2 || 2;
    if (v <= 50) return Math.ceil(v / 5) * 5 || 5;
    if (v <= 500) return Math.ceil(v / 10) * 10 || 10;
    return Math.ceil(v / 50) * 50 || 50;
  }

  private axisLabelStep(n: number): number {
    if (n <= 8) return 1;
    if (n <= 14) return 2;
    if (n <= 21) return 3;
    return 5;
  }

  private formatXLabel(isoDate: string, total: number): string {
    try {
      const d = new Date(isoDate + 'T00:00:00');
      if (isNaN(d.getTime())) return isoDate.slice(5);
      if (total > 14) {
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return isoDate.slice(5);
    }
  }
}
