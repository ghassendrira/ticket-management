import { Component, input, forwardRef, inject, signal } from '@angular/core';
import {
  ControlValueAccessor,
  NgControl,
  ReactiveFormsModule,
} from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="input-wrapper">
      @if (label()) {
        <label class="input-label">{{ label() }}</label>
      }
      <input
        #inputElement
        [type]="type()"
        [placeholder]="placeholder()"
        [value]="value()"
        [disabled]="isDisabled()"
        (input)="onInput($event)"
        (blur)="onTouched()"
        class="input-field"
      />
      @if (errorMessage()) {
        <span class="input-error">{{ errorMessage() }}</span>
      }
    </div>
  `,
  styles: [`
    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      width: 100%;
    }

    .input-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
      text-align: start;
    }

    .input-field {
      padding: 0.875rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      background-color: var(--surface);
      color: var(--text-primary);
      font-size: 0.9375rem;
      transition: all 0.2s ease;
      outline: none;
      font-family: inherit;
      box-sizing: border-box;
      width: 100%;
      text-align: start;
    }

    .input-field:focus {
      border-color: var(--accent-violet);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }

    .input-field:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .input-error {
      font-size: 0.8125rem;
      color: #ef4444;
      text-align: start;
    }
  `]
})
export class InputComponent implements ControlValueAccessor {
  type = input<'text' | 'email' | 'password' | 'tel'>('text');
  label = input<string>();
  placeholder = input<string>();
  errorMessage = input<string>();

  private readonly ngControl = inject(NgControl, { self: true, optional: true });

  value = signal('');
  isDisabled = signal(false);

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  onChange = (value: string) => {};
  onTouched = () => {};

  writeValue(value: string): void {
    this.value.set(value || '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newValue = target.value;
    this.value.set(newValue);
    this.onChange(newValue);
  }
}
