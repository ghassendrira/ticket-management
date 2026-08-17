import { Component, input, inject, signal } from '@angular/core';
import {
  ControlValueAccessor,
  NgControl,
  ReactiveFormsModule,
} from '@angular/forms';

@Component({
  selector: 'app-password-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="input-wrapper">
      @if (label()) {
        <label class="input-label">{{ label() }}</label>
      }
      <div class="password-input-container">
        <input
          #inputElement
          [type]="showPassword() ? 'text' : 'password'"
          [placeholder]="placeholder()"
          [value]="value()"
          [disabled]="isDisabled()"
          (input)="onInput($event)"
          (blur)="onTouched()"
          class="input-field"
        />
        <button type="button" class="password-toggle" (click)="toggleShowPassword()">
          @if (showPassword()) {
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          }
        </button>
      </div>
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

    .password-input-container {
      position: relative;
      width: 100%;
    }

    .input-field {
      width: 100%;
      padding-block: 0.875rem;
      padding-inline-start: 1rem;
      padding-inline-end: 3rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      background-color: var(--surface);
      color: var(--text-primary);
      font-size: 0.9375rem;
      transition: all 0.2s ease;
      outline: none;
      font-family: inherit;
      box-sizing: border-box;
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

    .password-toggle {
      position: absolute;
      inset-inline-end: 1rem;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
    }

    .password-toggle:hover {
      color: var(--text-primary);
    }

    .input-error {
      font-size: 0.8125rem;
      color: #ef4444;
      text-align: start;
    }
  `]
})
export class PasswordInputComponent implements ControlValueAccessor {
  label = input<string>();
  placeholder = input<string>();
  errorMessage = input<string>();
  showPassword = signal(false);

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

  toggleShowPassword() {
    this.showPassword.set(!this.showPassword());
  }
}
