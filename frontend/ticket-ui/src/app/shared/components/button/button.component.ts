import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [class]="'btn btn-' + variant()"
    >
      @if (loading()) {
        <span class="btn-loader"></span>
      }
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    .btn {
      padding: 1rem 1.75rem;
      border-radius: 16px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: inherit;
      letter-spacing: -0.01em;
    }

    :host-context([dir="rtl"]) .btn {
      flex-direction: row-reverse;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      color: white;
      box-shadow: 0 4px 14px 0 rgba(79, 110, 247, 0.3);
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-3px) scale(1.01);
      box-shadow: 0 8px 24px 0 rgba(79, 110, 247, 0.4);
    }

    .btn-primary:active:not(:disabled) {
      transform: translateY(-1px) scale(0.99);
    }

    .btn-secondary {
      background-color: var(--surface);
      color: var(--text-primary);
      border: 1.5px solid var(--border);
    }

    .btn-secondary:hover:not(:disabled) {
      background-color: var(--bg-secondary);
      border-color: var(--accent-violet);
      transform: translateY(-1px);
    }

    .btn-secondary:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    .btn-loader {
      width: 18px;
      height: 18px;
      border: 2.5px solid rgba(255, 255, 255, 0.3);
      border-top: 2.5px solid white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class ButtonComponent {
  type = input<'button' | 'submit' | 'reset'>('button');
  variant = input<'primary' | 'secondary'>('primary');
  disabled = input(false);
  loading = input(false);
}
