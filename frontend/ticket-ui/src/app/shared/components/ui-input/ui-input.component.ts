import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute, computed, contentChild, ElementRef, forwardRef, HostBinding, input, model, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, Validator, AbstractControl, ValidationErrors, NG_VALIDATORS } from '@angular/forms';
import { IconComponent, type IconName } from '../icon/icon.component';

/* =========================================================================
 * UiInputComponent — Wraps native input / textarea / select.
 * Variants: default, filled. Sizes: sm | md. States: error, disabled, loading.
 * Supports: label (floating optional), helper / error text, prefix/suffix icons,
 *           prefix/suffix buttons projection (ng-content selectors), clear button.
 * Presentational ONLY — does not modify value logic; pure ControlValueAccessor.
 * ========================================================================= */
export type UiInputSize = 'sm' | 'md';
export type UiInputVariant = 'default' | 'filled';

const VALUE_ACCESSOR = {
  provide: NG_VALUE_ACCESSOR,
  multi: true,
  useExisting: forwardRef(() => UiInputComponent),
};

const VALIDATOR = {
  provide: NG_VALIDATORS,
  multi: true,
  useExisting: forwardRef(() => UiInputComponent),
};

@Component({
  selector: 'app-ui-input',
  standalone: true,
  imports: [CommonModule, IconComponent],
  providers: [VALUE_ACCESSOR, VALIDATOR],
  template: `
    <div class="ui-input" [class]="hostClass()">
      @if (label) {
        <label class="ui-input__label" [for]="inputId()" [class.ui-input__label--required]="required">
          {{ label }}
          @if (required) {<span aria-hidden="true" class="ui-input__required">*</span>}
        </label>
      }

      <div
        class="ui-input__wrap"
        [class.ui-input__wrap--focus]="focused()"
        [class.ui-input__wrap--error]="hasError()"
        [class.ui-input__wrap--disabled]="disabled"
        [class.ui-input__wrap--with-prefix]="iconPrefix || hasPrefixContent()"
        [class.ui-input__wrap--with-suffix]="iconSuffix || clearable || hasSuffixContent()"
      >
        @if (iconPrefix) {
          <app-icon class="ui-input__icon ui-input__icon--prefix" [name]="iconPrefix" size="md" aria-hidden="true" />
        }
        <ng-content select="[uiInputPrefix]" />

        @switch (type) {
          @case ('textarea') {
            <textarea
              #control
              [id]="inputId()"
              class="ui-input__control ui-input__control--textarea"
              [attr.placeholder]="placeholder"
              [attr.disabled]="disabled ? '' : null"
              [attr.required]="required ? '' : null"
              [attr.rows]="textareaRows"
              [attr.aria-invalid]="hasError()"
              [attr.aria-describedby]="describedById()"
              [value]="value()"
              (input)="onInput($any($event).target.value)"
              (change)="onInput($any($event).target.value)"
              (blur)="onBlur()"
              (focus)="onFocus()"
            ></textarea>
          }
          @case ('select') {
            <select
              #control
              [id]="inputId()"
              class="ui-input__control ui-input__control--select"
              [attr.disabled]="disabled ? '' : null"
              [attr.required]="required ? '' : null"
              [attr.aria-invalid]="hasError()"
              [attr.aria-describedby]="describedById()"
              [value]="value()"
              (change)="onInput($any($event).target.value)"
              (blur)="onBlur()"
              (focus)="onFocus()"
            >
              @if (placeholder) {
                <option [value]="placeholder" disabled>{{ placeholder }}</option>
              }
              <ng-content />
            </select>
            <app-icon name="chevron-down" size="sm" aria-hidden="true" class="ui-input__select-arrow" />
          }
          @default {
            <input
              #control
              [id]="inputId()"
              class="ui-input__control"
              [type]="type === 'password' && showPassword() ? 'text' : (type || 'text')"
              [attr.placeholder]="placeholder"
              [attr.disabled]="disabled ? '' : null"
              [attr.required]="required ? '' : null"
              [attr.aria-invalid]="hasError()"
              [attr.aria-describedby]="describedById()"
              [attr.min]="min"
              [attr.max]="max"
              [attr.step]="step"
              [attr.inputmode]="inputmode"
              [attr.autocomplete]="autocomplete"
              [value]="value()"
              (input)="onInput($any($event).target.value)"
              (change)="onInput($any($event).target.value)"
              (blur)="onBlur()"
              (focus)="onFocus()"
              (keydown.enter)="onEnter($any($event))"
            />
          }
        }

        @if (type === 'password') {
          <button type="button" class="ui-input__icon-btn" (click)="toggleShowPassword()" [attr.aria-label]="showPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
            <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" size="md" aria-hidden="true" />
          </button>
        }

        @if (iconSuffix && type !== 'password') {
          <app-icon class="ui-input__icon ui-input__icon--suffix" [name]="iconSuffix" size="md" aria-hidden="true" />
        }

        @if (clearable && value()) {
          <button type="button" class="ui-input__icon-btn" (click)="clear($event)" aria-label="Effacer">
            <app-icon name="close-circle" size="md" aria-hidden="true" />
          </button>
        }

        <ng-content select="[uiInputSuffix]" />
      </div>

      @if (helperText || errorText) {
        <div [id]="describedById()" class="ui-input__helper" [class.ui-input__helper--error]="hasError()" role="status">
          @if (hasError() && errorText) {
            <app-icon name="alert-circle" size="xs" aria-hidden="true" />
          } @else if (!hasError() && helperIcon) {
            <app-icon [name]="helperIcon" size="xs" aria-hidden="true" />
          }
          <span>{{ hasError() ? errorText : helperText }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .ui-input { display: flex; flex-direction: column; gap: var(--space-1); width: 100%; }

    .ui-input__label {
      display: block;
      font-family: var(--font-sans);
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      line-height: var(--lh-snug);
      color: var(--text-primary);
      margin-inline: var(--space-05);
      letter-spacing: -0.005em;
    }
    .ui-input__label--required::after { content: ''; }
    .ui-input__required { color: var(--danger-500); margin-left: 2px; }

    .ui-input__wrap {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      min-height: 44px;
      background: var(--surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      padding-inline: var(--space-3);
      gap: var(--space-2);
      transition:
        border-color var(--transition-fast),
        background-color var(--transition-fast),
        box-shadow var(--transition-fast);
    }
    :host([data-size="sm"]) .ui-input__wrap { min-height: 38px; border-radius: var(--radius-sm); padding-inline: var(--space-2); }

    .ui-input__wrap:hover:not(.ui-input__wrap--disabled) { border-color: var(--border-strong); }
    .ui-input__wrap--focus {
      border-color: var(--brand-500);
      box-shadow: var(--shadow-focus);
      background: var(--surface);
    }
    .ui-input__wrap--error {
      border-color: var(--danger-400);
      &.ui-input__wrap--focus { box-shadow: var(--shadow-focus-danger); }
    }
    .ui-input__wrap--disabled {
      background: var(--surface-subtle);
      border-color: var(--border-subtle);
      cursor: not-allowed;
      opacity: 0.75;
      :deep(input), :deep(select), :deep(textarea) { cursor: not-allowed; }
    }
    :host([data-variant="filled"]) .ui-input__wrap {
      background: var(--surface-subtle);
      border-color: transparent;
      &.ui-input__wrap--focus { background: var(--surface); border-color: var(--brand-500); }
    }

    .ui-input__icon { flex-shrink: 0; color: var(--text-tertiary); }
    .ui-input__wrap--error .ui-input__icon--prefix { color: var(--danger-500); }

    .ui-input__control {
      flex: 1 1 auto;
      min-width: 0;
      min-height: 40px;
      background: transparent;
      border: 0;
      outline: none;
      padding: 0;
      font-family: var(--font-sans);
      font-size: var(--fs-base);
      line-height: var(--lh-normal);
      color: var(--text-primary);
      &::placeholder { color: var(--text-muted); opacity: 1; }
    }
    .ui-input__control--textarea {
      resize: vertical;
      padding-block: 10px;
      min-height: 96px;
      max-height: 320px;
      line-height: var(--lh-relaxed);
    }
    .ui-input__control--select {
      padding-right: 32px;
      cursor: pointer;
      background-image: none;
    }
    :host([data-size="sm"]) .ui-input__control {
      font-size: var(--fs-sm);
      min-height: 32px;
    }

    .ui-input__select-arrow {
      position: absolute;
      right: var(--space-3);
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--text-tertiary);
    }

    .ui-input__icon-btn {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px; height: 28px;
      border-radius: var(--radius-sm);
      background: transparent;
      border: 0;
      cursor: pointer;
      color: var(--text-tertiary);
      transition: background var(--transition-fast), color var(--transition-fast);
      &:hover { color: var(--text-secondary); background: var(--surface-hover); }
      &:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
    }

    .ui-input__helper {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      margin-inline: var(--space-1);
      font-family: var(--font-sans);
      font-size: var(--fs-sm);
      line-height: var(--lh-snug);
      color: var(--text-secondary);
      min-height: 18px;
      &.ui-input__helper--error { color: var(--danger-600); }
    }
    :root[data-theme="dark"] .ui-input__helper--error { color: var(--danger-300); }

    @media (max-width: 639px) {
      .ui-input__wrap { min-height: 48px; }
    }
  `],
  host: {
    '[attr.data-size]': 'size()',
    '[attr.data-variant]': 'variant()',
    '[style.display]': '"block"',
    '[style.width]': '"100%"',
  }
})
export class UiInputComponent implements ControlValueAccessor, Validator {
  @Input() id: string | null = null;
  @Input() label: string | null = null;
  @Input() placeholder: string = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'textarea' | 'select' = 'text';
  @Input() required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) clearable = false;
  @Input() errorText: string | null = null;
  @Input() helperText: string | null = null;
  @Input() helperIcon: IconName | null = null;
  @Input() iconPrefix: IconName | null = null;
  @Input() iconSuffix: IconName | null = null;
  @Input() textareaRows: number = 4;
  @Input() min: number | string | null = null;
  @Input() max: number | string | null = null;
  @Input() step: number | string | null = null;
  @Input() inputmode: 'text' | 'numeric' | 'decimal' | 'email' | 'search' | 'tel' | 'url' | null = null;
  @Input() autocomplete: string | null = null;
  @Input({ transform: booleanAttribute }) customError = false;

  readonly size = input<UiInputSize>('md');
  readonly variant = input<UiInputVariant>('default');
  readonly value = model<string | number | null>(null);

  readonly showPassword = model(false);

  @ViewChild('control') control!: ElementRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  readonly prefixContent = contentChild<ElementRef>('uiInputPrefix');
  readonly suffixContent = contentChild<ElementRef>('uiInputSuffix');

  private _onChange: (v: any) => void = () => {};
  private _onTouched: () => void = () => {};
  private _onValidatorChange: () => void = () => {};
  private _focused = false;

  readonly focused = computed(() => this._focused);
  readonly inputId = computed(() => this.id ?? `ui-input-${Math.random().toString(36).slice(2, 9)}`);
  readonly describedById = computed(() => `${this.inputId()}-helper`);
  readonly hasError = computed(() => !!this.errorText || this.customError);
  readonly hasPrefixContent = computed(() => !!this.prefixContent());
  readonly hasSuffixContent = computed(() => !!this.suffixContent());

  readonly hostClass = computed(() => [
    'ui-input-root',
    `ui-input-root--${this.size()}`,
    `ui-input-root--${this.variant()}`,
  ].join(' '));

  onInput(v: any): void {
    let parsed: any = v;
    if (this.type === 'number' && v !== '' && v != null) {
      parsed = Number.isNaN(Number(v)) ? v : Number(v);
    }
    this.value.set(parsed ?? null);
    this._onChange(this.value());
  }

  onEnter(e: KeyboardEvent): void {
    // handled by user forms, no-op
  }

  onFocus(): void {
    this._focused = true;
  }

  onBlur(): void {
    this._focused = false;
    this._onTouched();
  }

  clear(e: MouseEvent): void {
    e.stopPropagation();
    this.value.set(null);
    this._onChange(null);
    this._onTouched();
    try { this.control?.nativeElement.focus(); } catch {}
  }

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  /* ===== ControlValueAccessor ===== */
  writeValue(obj: any): void { this.value.set(obj ?? null); }
  registerOnChange(fn: any): void { this._onChange = fn; }
  registerOnTouched(fn: any): void { this._onTouched = fn; }
  setDisabledState?(isDisabled: boolean): void {
    // handled via disabled input
  }

  /* ===== Validator ===== */
  validate(control: AbstractControl): ValidationErrors | null {
    return null; // no built-in validation, purely presentational wrapper
  }
  registerOnValidatorChange(fn: () => void): void { this._onValidatorChange = fn; }
}
