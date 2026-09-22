import { ApplicationRef, Component, computed, createComponent, EnvironmentInjector, Inject, Injectable, Injector, Input, signal, TemplateRef, Type } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { IconComponent, type IconName } from '../icon/icon.component';

/* =========================================================================
 * Toast Service + Host Component
 * Simple queued toasts (info/success/warning/error), auto-dismiss, keyboard accessible.
 * No CDK/primeng dependency.
 * ========================================================================= */
export type ToastTone = 'info' | 'success' | 'warning' | 'error';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface ToastOptions {
  tone?: ToastTone;
  title?: string;
  message?: string;
  icon?: IconName;
  durationMs?: number;          // 0 = persistent (user closes explicitly)
  action?: { label: string; handler: () => void };
  closeable?: boolean;
  position?: ToastPosition;
  template?: TemplateRef<any> | Type<any> | null;
  templateContext?: any;
}

interface ToastItem extends Required<Pick<ToastOptions, 'tone' | 'title' | 'closeable' | 'durationMs' | 'position'>> {
  id: string;
  title: string;
  message?: string;
  icon: IconName;
  action?: ToastOptions['action'];
  createdAt: number;
  timer?: any;
}

const TONE_ICON: Record<ToastTone, IconName> = {
  info:    'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  error:   'alert-circle',
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _items = signal<ToastItem[]>([]);
  private _hostAttached = false;

  readonly items = computed(() => this._items());

  constructor(
    private readonly _appRef: ApplicationRef,
    private readonly _injector: EnvironmentInjector,
    @Inject(DOCUMENT) private readonly _document: Document,
  ) {}

  /** Show a toast with full options. Returns the toast id. */
  show(opts: ToastOptions): string {
    this.ensureHost();
    const item: ToastItem = {
      id: `toast-${Math.random().toString(36).slice(2, 10)}`,
      tone: opts.tone ?? 'info',
      title: opts.title ?? (opts.tone === 'error' ? 'Erreur' : opts.tone === 'success' ? 'Succès' : opts.tone === 'warning' ? 'Attention' : 'Information'),
      message: opts.message,
      icon: opts.icon ?? TONE_ICON[opts.tone ?? 'info'],
      closeable: opts.closeable ?? true,
      durationMs: opts.durationMs ?? (opts.tone === 'error' ? 8000 : opts.tone === 'warning' ? 6000 : 4500),
      position: opts.position ?? 'top-right',
      action: opts.action,
      createdAt: Date.now(),
    };
    this._items.update(list => [...list, item]);

    if (item.durationMs > 0) {
      item.timer = setTimeout(() => this.dismiss(item.id), item.durationMs);
    }
    return item.id;
  }

  info(title: string, message?: string, opts?: Partial<ToastOptions>): string {
    return this.show({ tone: 'info', title, message, ...opts });
  }
  success(title: string, message?: string, opts?: Partial<ToastOptions>): string {
    return this.show({ tone: 'success', title, message, ...opts });
  }
  warning(title: string, message?: string, opts?: Partial<ToastOptions>): string {
    return this.show({ tone: 'warning', title, message, ...opts });
  }
  error(title: string, message?: string, opts?: Partial<ToastOptions>): string {
    return this.show({ tone: 'error', title, message, ...opts });
  }

  dismiss(id: string): void {
    const it = this._items().find(t => t.id === id);
    if (it?.timer) clearTimeout(it.timer);
    this._items.update(list => list.filter(t => t.id !== id));
  }

  dismissAll(): void {
    this._items().forEach(t => { if (t.timer) clearTimeout(t.timer); });
    this._items.set([]);
  }

  private ensureHost(): void {
    if (this._hostAttached) return;
    const compRef = createComponent(ToastHostComponent, {
      environmentInjector: this._injector,
      elementInjector: Injector.create({ providers: [{ provide: ToastService, useValue: this }] }),
    });
    this._appRef.attachView(compRef.hostView);
    this._document.body.appendChild(compRef.location.nativeElement);
    this._hostAttached = true;
  }
}

/* ============================================================
 * Toast Host Component — rendered once, attached to <body>.
 * ============================================================ */
@Component({
  selector: 'app-ui-toast-host',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @for (position of positions(); track position) {
      @let itemsFor = itemsByPosition(position);
      @if (itemsFor.length) {
        <div
          class="ui-toast-region ui-toast-region--{{ position }}"
          [attr.aria-live]="'polite'"
          [attr.aria-atomic]="'true'"
          role="region"
          [attr.aria-label]="ariaLabel(position)"
        >
          @for (t of itemsFor; track t.id) {
            <div
              class="ui-toast ui-toast--{{ t.tone }}"
              role="status"
              [@.disabled]="reducedMotion"
            >
              <div class="ui-toast__icon-wrap">
                <app-icon [name]="t.icon" size="md" aria-hidden="true" />
              </div>

              <div class="ui-toast__body">
                @if (t.title) {
                  <p class="ui-toast__title">{{ t.title }}</p>
                }
                @if (t.message) {
                  <p class="ui-toast__message">{{ t.message }}</p>
                }
                @if (t.action) {
                  <button type="button" class="ui-toast__action" (click)="runAction(t)">{{ t.action.label }}</button>
                }
              </div>

              @if (t.closeable) {
                <button
                  type="button"
                  class="ui-toast__close"
                  (click)="service.dismiss(t.id)"
                  aria-label="Fermer la notification"
                >
                  <app-icon name="close" size="sm" aria-hidden="true" />
                </button>
              }

              @if (t.durationMs > 0) {
                <div
                  class="ui-toast__progress"
                  [style.animation-duration.px]="null"
                  [attr.style]="progressStyle(t)"
                  aria-hidden="true"
                ></div>
              }
            </div>
          }
        </div>
      }
    }
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: var(--z-toast);
    }
    .ui-toast-region {
      position: absolute;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-4);
      min-width: min(360px, calc(100vw - 32px));
      max-width: 420px;
      pointer-events: none;
    }
    .ui-toast-region--top-right,
    .ui-toast-region--bottom-right { right: 0; }
    .ui-toast-region--top-left,
    .ui-toast-region--bottom-left   { left: 0; }
    .ui-toast-region--top-right,
    .ui-toast-region--top-left,
    .ui-toast-region--top-center    { top: 0; padding-top: calc(var(--space-4) + env(safe-area-inset-top)); }
    .ui-toast-region--bottom-right,
    .ui-toast-region--bottom-left,
    .ui-toast-region--bottom-center { bottom: 0; padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom)); }
    .ui-toast-region--top-center,
    .ui-toast-region--bottom-center {
      left: 50%; transform: translateX(-50%);
    }

    .ui-toast {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
      background: var(--surface-raised);
      color: var(--text-primary);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      pointer-events: auto;
      overflow: hidden;
      animation: toast-in var(--transition-slow) var(--ease-spring);
      min-width: 0;
    }
    .ui-toast::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 4px;
    }
    :root[dir="rtl"] .ui-toast::before { left: auto; right: 0; }

    .ui-toast--info    { --accent: var(--info-500);    }
    .ui-toast--success { --accent: var(--success-500); }
    .ui-toast--warning { --accent: var(--warning-500); }
    .ui-toast--error   { --accent: var(--danger-500);  }
    .ui-toast::before  { background: var(--accent); }

    .ui-toast__icon-wrap {
      flex-shrink: 0;
      width: 32px; height: 32px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: var(--radius-full);
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 14%, transparent);
    }
    .ui-toast__body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .ui-toast__title {
      margin: 0;
      font-family: var(--font-sans);
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      line-height: var(--lh-snug);
      letter-spacing: -0.005em;
      color: var(--text-primary);
    }
    .ui-toast__message {
      margin: 0;
      font-size: var(--fs-sm);
      line-height: var(--lh-normal);
      color: var(--text-secondary);
      word-break: break-word;
    }
    .ui-toast__action {
      align-self: flex-start;
      margin-top: var(--space-2);
      padding: 4px var(--space-2);
      background: transparent;
      border: 0;
      color: var(--accent);
      font-family: var(--font-sans);
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      cursor: pointer;
      border-radius: var(--radius-sm);
      &:hover { background: color-mix(in srgb, var(--accent) 10%, transparent); }
      &:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
    }
    .ui-toast__close {
      flex-shrink: 0;
      width: 32px; height: 32px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: var(--radius-sm);
      background: transparent;
      border: 0;
      color: var(--text-tertiary);
      cursor: pointer;
      transition: background var(--transition-fast), color var(--transition-fast);
      &:hover { background: var(--surface-hover); color: var(--text-primary); }
      &:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
    }
    .ui-toast__progress {
      position: absolute;
      bottom: 0;
      left: 0; right: 0;
      height: 3px;
      background: color-mix(in srgb, var(--accent) 40%, transparent);
      transform-origin: 0% 0%;
      animation: toast-progress linear forwards;
    }

    @keyframes toast-in {
      from { opacity: 0; transform: translateY(-6px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes toast-progress {
      from { transform: scaleX(1); }
      to   { transform: scaleX(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .ui-toast { animation: none; }
      .ui-toast__progress { display: none; }
    }
    @media (max-width: 639px) {
      .ui-toast-region--top-right,
      .ui-toast-region--top-left,
      .ui-toast-region--bottom-right,
      .ui-toast-region--bottom-left {
        left: 50%; right: auto;
        transform: translateX(-50%);
        min-width: calc(100vw - var(--space-4));
      }
    }
  `]
})
export class ToastHostComponent {
  constructor(readonly service: ToastService) {}

  readonly positions = computed<ToastPosition[]>(() =>
    ['top-right', 'top-left', 'top-center', 'bottom-right', 'bottom-left', 'bottom-center']
  );
  itemsByPosition(position: ToastPosition): ToastItem[] {
    return this.service.items().filter(t => t.position === position);
  }
  ariaLabel(position: ToastPosition): string {
    return `Notifications ${position.replace('-', ' ')}`;
  }
  runAction(t: ToastItem): void {
    try { t.action?.handler?.(); } catch (e) { console.error(e); }
    this.service.dismiss(t.id);
  }
  progressStyle(t: ToastItem): string {
    return `animation-name: toast-progress; animation-duration: ${t.durationMs}ms;`;
  }
  get reducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
