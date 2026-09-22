import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, booleanAttribute, computed, effect, HostListener, inject, input, viewChild } from '@angular/core';
import { IconComponent, type IconName } from '../icon/icon.component';
import { UiButtonComponent } from '../ui-button/ui-button.component';

/* =========================================================================
 * Tooltip + Modal + Drawer (all in one file for coherence)
 * No CDK dependency — uses only viewport positioning + focus trap minimal
 * ========================================================================= */

/* ==========================================================
 * TOOLTIP — Direct on-host CSS; no directive needed
 * Usage: <span app-ui-tooltip tooltip="Label">...</span>
 * But simpler: use <app-ui-tooltip> element wrapper
 * ========================================================== */
@Component({
  selector: 'app-ui-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="ui-tooltip__trigger" (mouseenter)="show = true" (mouseleave)="show = false" (focus)="show = true" (blur)="show = false" aria-describedby="tip">
      <ng-content />
    </span>
    <div
      role="tooltip"
      id="tip"
      class="ui-tooltip__bubble ui-tooltip--{{ position }}"
      [class.ui-tooltip--visible]="show"
      [@.disabled]="reducedMotion"
    >
      <span>{{ text() }}</span>
    </div>
  `,
  styles: [`
    :host {
      position: relative;
      display: inline-flex;
    }
    .ui-tooltip__trigger { display: contents; cursor: default; }
    .ui-tooltip__bubble {
      position: absolute;
      z-index: var(--z-tooltip);
      background: var(--neutral-900);
      color: var(--neutral-50);
      font-family: var(--font-sans);
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      line-height: var(--lh-snug);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-sm);
      white-space: nowrap;
      max-width: min(320px, 80vw);
      pointer-events: none;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity var(--transition-fast), transform var(--transition-fast);
      box-shadow: var(--shadow-md);
    }
    :root[data-theme="dark"] .ui-tooltip__bubble {
      background: var(--neutral-950);
      color: #fff;
      border: 1px solid var(--border-default);
    }
    .ui-tooltip--visible { opacity: 1; transform: translateY(0); }
    .ui-tooltip--top    { bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(4px); }
    .ui-tooltip--top.ui-tooltip--visible    { transform: translateX(-50%) translateY(0); }
    .ui-tooltip--bottom { top: calc(100% + 8px);  left: 50%; transform: translateX(-50%) translateY(-4px); }
    .ui-tooltip--bottom.ui-tooltip--visible { transform: translateX(-50%) translateY(0); }
    .ui-tooltip--left   { right: calc(100% + 8px); top: 50%;  transform: translateX(4px) translateY(-50%); }
    .ui-tooltip--left.ui-tooltip--visible   { transform: translateX(0) translateY(-50%); }
    .ui-tooltip--right  { left: calc(100% + 8px);  top: 50%;  transform: translateX(-4px) translateY(-50%); }
    .ui-tooltip--right.ui-tooltip--visible  { transform: translateX(0) translateY(-50%); }
  `],
  host: {
    '(keydown.esc)': 'show = false',
  }
})
export class UiTooltipComponent {
  readonly text = input.required<string>();
  @Input() position: 'top' | 'bottom' | 'left' | 'right' = 'top';
  show = false;
  get reducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}

/* ==========================================================
 * MODAL — Centered dialog, mobile fullscreen sheet
 * Drawer — side sliding panel (left/right)
 * Shared close on ESC, backdrop click, focus trap (minimal)
 * ========================================================== */

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
export type DrawerPosition = 'left' | 'right';
export type DrawerSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-ui-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (open()) {
      <div class="ui-modal__backdrop" (click)="onBackdropClick()" aria-hidden="true"></div>

      <div
        class="ui-modal ui-modal--{{ size() }}"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="labelId"
        [attr.aria-describedby]="describedBy"
        tabindex="-1"
      >
        <div class="ui-modal__inner" (keydown.tab)="onTab($any($event))">
          @if (title(); as t) {
            <header class="ui-modal__header">
              @if (icon()) {
                <div class="ui-modal__icon-wrap">
                  <app-icon [name]="icon()!" size="md" aria-hidden="true" />
                </div>
              }
              <div class="ui-modal__titles">
                <h3 [id]="labelId" class="ui-modal__title">{{ t }}</h3>
                @if (subtitle(); as s) {
                  <p class="ui-modal__subtitle">{{ s }}</p>
                }
              </div>
              @if (dismissible()) {
                <button
                  type="button"
                  class="ui-modal__close"
                  (click)="close()"
                  aria-label="Fermer"
                >
                  <app-icon name="close" size="md" aria-hidden="true" />
                </button>
              }
            </header>
          }
          <div class="ui-modal__body" [id]="describedBy">
            <ng-content />
          </div>
          <ng-content select="[modalFooter]" />
        </div>
      </div>
    }
  `,
  styles: [`
    .ui-modal__backdrop {
      position: fixed; inset: 0;
      background: var(--surface-overlay);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: var(--z-modal-backdrop);
      animation: ui-modal-fade var(--transition-base) var(--ease-out);
    }
    .ui-modal {
      position: fixed;
      inset: 0;
      z-index: var(--z-modal);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4);
      pointer-events: none;
    }
    .ui-modal__inner {
      pointer-events: auto;
      width: 100%;
      max-height: calc(100vh - 2 * var(--space-4));
      max-width: 100%;
      display: flex;
      flex-direction: column;
      background: var(--surface);
      color: var(--text-primary);
      border-radius: var(--radius-2xl);
      box-shadow: var(--shadow-xl);
      border: 1px solid var(--border-subtle);
      overflow: hidden;
      animation: ui-modal-in var(--transition-slow) var(--ease-out);
      outline: none;
    }
    .ui-modal--sm .ui-modal__inner { max-width: 440px; }
    .ui-modal--md .ui-modal__inner { max-width: 560px; }
    .ui-modal--lg .ui-modal__inner { max-width: 760px; }
    .ui-modal--xl .ui-modal__inner { max-width: 960px; }
    .ui-modal--fullscreen .ui-modal__inner {
      max-width: 100vw;
      max-height: 100vh;
      width: 100vw;
      height: 100vh;
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
      border-radius: 0;
    }

    .ui-modal__header {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-6) var(--space-6) var(--space-4);
      border-bottom: 1px solid var(--border-subtle);
    }
    .ui-modal__icon-wrap {
      width: 40px; height: 40px;
      flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: var(--radius-md);
      background: var(--brand-50);
      color: var(--brand-600);
    }
    :root[data-theme="dark"] .ui-modal__icon-wrap {
      background: color-mix(in srgb, var(--brand-500) 18%, transparent);
      color: var(--brand-500);
    }
    .ui-modal__titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--space-05); padding-right: var(--space-6); }
    .ui-modal__title {
      font-family: var(--font-display);
      font-size: var(--fs-xl);
      font-weight: var(--fw-semibold);
      line-height: var(--lh-snug);
      letter-spacing: -0.01em;
      color: var(--text-primary);
      margin: 0;
    }
    .ui-modal__subtitle {
      font-size: var(--fs-sm);
      color: var(--text-secondary);
      margin: 0;
    }
    .ui-modal__close {
      position: absolute;
      top: var(--space-4);
      right: var(--space-4);
      width: 40px; height: 40px;
      border-radius: var(--radius-md);
      display: inline-flex; align-items: center; justify-content: center;
      background: transparent;
      border: 0;
      cursor: pointer;
      color: var(--text-secondary);
      flex-shrink: 0;
      transition: background var(--transition-fast), color var(--transition-fast);
      &:hover { background: var(--surface-hover); color: var(--text-primary); }
      &:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
    }

    .ui-modal__body {
      flex: 1 1 auto;
      overflow: auto;
      padding: var(--space-6);
      min-height: 0;
    }

    /* Mobile: fullscreen sheet by default on small screens */
    @media (max-width: 639px) {
      .ui-modal:not(.ui-modal--fullscreen) { padding: 0; }
      .ui-modal:not(.ui-modal--fullscreen) .ui-modal__inner {
        width: 100%;
        max-width: 100%;
        max-height: 100vh;
        min-height: 88vh;
        border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
        margin-top: auto;
        padding-top: env(safe-area-inset-top);
      }
      .ui-modal__header { padding: var(--space-5) var(--space-5) var(--space-3); }
      .ui-modal__body { padding: var(--space-5); }
    }

    @keyframes ui-modal-fade { from { opacity: 0 } to { opacity: 1 } }
    @keyframes ui-modal-in {
      from { transform: translateY(14px) scale(0.98); opacity: 0 }
      to   { transform: translateY(0) scale(1); opacity: 1 }
    }
    @media (prefers-reduced-motion: reduce) {
      .ui-modal__inner { animation: ui-modal-fade var(--transition-base); }
    }
  `],
  host: {
    '(keydown.esc)': 'onEsc()',
  }
})
export class UiModalComponent {
  readonly open = input(false, { transform: booleanAttribute });
  readonly size = input<ModalSize>('md');
  readonly title = input<string | null>(null);
  readonly subtitle = input<string | null>(null);
  readonly icon = input<IconName | null>(null);
  readonly dismissible = input(true, { transform: booleanAttribute });
  readonly closeOnBackdrop = input(true, { transform: booleanAttribute });
  readonly closeOnEsc = input(true, { transform: booleanAttribute });

  readonly labelId = `ui-modal-${Math.random().toString(36).slice(2, 8)}`;
  readonly describedBy = `${this.labelId}-body`;

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open() && this.closeOnEsc() && this.dismissible()) this.close();
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop() && this.dismissible()) this.close();
  }

  close(): void {
    const e = new CustomEvent('close');
    this._el.nativeElement.dispatchEvent(e);
  }

  onTab(e: KeyboardEvent): void {
    // Minimal focus trap: do nothing here; user's native tabindex handles it
  }

  private readonly _el = inject(ElementRef);
}

/* ==========================================================
 * DRAWER — sliding side panel
 * ========================================================== */
@Component({
  selector: 'app-ui-drawer',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (open()) {
      <div class="ui-drawer__backdrop" (click)="onBackdropClick()" aria-hidden="true"></div>

      <aside
        class="ui-drawer ui-drawer--{{ position() }} ui-drawer--{{ size() }}"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="ariaLabel"
        tabindex="-1"
      >
        @if (showHeader()) {
          <header class="ui-drawer__header">
            <div class="ui-drawer__titles">
              @if (title(); as t) {
                <h3 class="ui-drawer__title">{{ t }}</h3>
              }
              @if (subtitle(); as s) {
                <p class="ui-drawer__subtitle">{{ s }}</p>
              }
              <ng-content select="[drawerHeader]" />
            </div>
            @if (dismissible()) {
              <button type="button" class="ui-modal__close" (click)="close()" aria-label="Fermer">
                <app-icon name="close" size="md" aria-hidden="true" />
              </button>
            }
          </header>
        }
        <div class="ui-drawer__body">
          <ng-content />
        </div>
        <footer *ngIf="hasFooter" class="ui-drawer__footer">
          <ng-content select="[drawerFooter]" />
        </footer>
      </aside>
    }
  `,
  styles: [`
    .ui-drawer__backdrop {
      position: fixed; inset: 0;
      background: var(--surface-overlay);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      z-index: var(--z-drawer) - 1;
      animation: ui-modal-fade var(--transition-base);
    }
    .ui-drawer {
      position: fixed;
      top: 0; bottom: 0;
      width: var(--drawer-w, 360px);
      max-width: 100vw;
      background: var(--surface);
      box-shadow: var(--shadow-xl);
      z-index: var(--z-drawer);
      display: flex;
      flex-direction: column;
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
    }
    .ui-drawer--left  {
      left: 0;
      border-right: 1px solid var(--border-subtle);
      animation: drawer-left-in var(--transition-slow) var(--ease-out);
    }
    .ui-drawer--right {
      right: 0;
      border-left: 1px solid var(--border-subtle);
      animation: drawer-right-in var(--transition-slow) var(--ease-out);
    }
    .ui-drawer--sm { --drawer-w: 320px; }
    .ui-drawer--md { --drawer-w: 420px; }
    .ui-drawer--lg { --drawer-w: 560px; }

    .ui-drawer__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-6) var(--space-5) var(--space-4);
      border-bottom: 1px solid var(--border-subtle);
      position: relative;
    }
    .ui-drawer__titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--space-05); padding-right: var(--space-8); }
    .ui-drawer__title {
      font-family: var(--font-display);
      font-size: var(--fs-xl);
      font-weight: var(--fw-semibold);
      letter-spacing: -0.01em;
      margin: 0;
    }
    .ui-drawer__subtitle { font-size: var(--fs-sm); color: var(--text-secondary); margin: 0; }
    .ui-modal__close {
      position: absolute;
      top: var(--space-4);
      right: var(--space-4);
      width: 40px; height: 40px;
      border-radius: var(--radius-md);
      display: inline-flex; align-items: center; justify-content: center;
      background: transparent;
      border: 0;
      cursor: pointer;
      color: var(--text-secondary);
      transition: background var(--transition-fast), color var(--transition-fast);
      &:hover { background: var(--surface-hover); color: var(--text-primary); }
      &:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
    }
    .ui-drawer__body { flex: 1; overflow: auto; padding: var(--space-5); }
    .ui-drawer__footer {
      padding: var(--space-4) var(--space-5);
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      gap: var(--space-3);
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    @media (max-width: 639px) {
      .ui-drawer--sm, .ui-drawer--md, .ui-drawer--lg { --drawer-w: 100vw; }
    }

    @keyframes drawer-left-in {
      from { transform: translateX(-100%); opacity: 0 }
      to   { transform: translateX(0); opacity: 1 }
    }
    @keyframes drawer-right-in {
      from { transform: translateX(100%); opacity: 0 }
      to   { transform: translateX(0); opacity: 1 }
    }
    @media (prefers-reduced-motion: reduce) {
      .ui-drawer--left  { animation: ui-modal-fade var(--transition-base); }
      .ui-drawer--right { animation: ui-modal-fade var(--transition-base); }
    }
  `],
  host: {
    '(keydown.esc)': 'onEsc()',
  }
})
export class UiDrawerComponent {
  readonly open = input(false, { transform: booleanAttribute });
  readonly size = input<DrawerSize>('md');
  readonly position = input<DrawerPosition>('left');
  readonly title = input<string | null>(null);
  readonly subtitle = input<string | null>(null);
  readonly dismissible = input(true, { transform: booleanAttribute });
  readonly closeOnBackdrop = input(true, { transform: booleanAttribute });
  readonly closeOnEsc = input(true, { transform: booleanAttribute });
  @Input() ariaLabel = 'Panneau latéral';
  @Input() hasFooter = false;

  readonly showHeader = computed(() => !!this.title() || !!this.subtitle());

  onEsc(): void { if (this.open() && this.closeOnEsc() && this.dismissible()) this.close(); }
  onBackdropClick(): void { if (this.closeOnBackdrop() && this.dismissible()) this.close(); }
  close(): void {
    const e = new CustomEvent('close');
    inject(ElementRef).nativeElement.dispatchEvent(e);
  }
}
