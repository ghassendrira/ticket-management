import { Component, EventEmitter, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-error-overlay',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="error-overlay-backdrop" role="alertdialog" aria-modal="true">
      <div class="error-overlay-panel">
        <div class="error-overlay-header">
          <div>
            <p class="error-overlay-label">{{ 'ERROR.HEADER' | translate }}</p>
            <h2 class="error-overlay-title">{{ title() || ('ERROR.TITLE' | translate) }}</h2>
          </div>
          <button class="error-overlay-close" type="button" (click)="close.emit()">
            {{ 'ERROR.CLOSE' | translate }}
          </button>
        </div>
        <div class="error-overlay-body">
          <p>{{ message() }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .error-overlay-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.72);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        z-index: 2000;
      }

      .error-overlay-panel {
        width: min(640px, 100%);
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 1.5rem;
        box-shadow: 0 24px 72px rgba(15, 23, 42, 0.2);
      }

      .error-overlay-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .error-overlay-label {
        margin: 0 0 0.5rem;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--accent-violet);
      }

      .error-overlay-title {
        margin: 0;
        font-size: 1.5rem;
        color: var(--text-primary);
      }

      .error-overlay-close {
        border: none;
        background: transparent;
        color: var(--accent-violet);
        cursor: pointer;
        font-weight: 700;
        font-size: 0.95rem;
        padding: 0.5rem 0.75rem;
      }

      .error-overlay-close:hover {
        background: rgba(139, 92, 246, 0.08);
        border-radius: 12px;
      }

      .error-overlay-body p {
        margin: 0;
        color: var(--text-secondary);
        line-height: 1.7;
        white-space: pre-wrap;
      }

      @media (max-width: 640px) {
        .error-overlay-panel {
          padding: 1.25rem;
          border-radius: 18px;
        }

        .error-overlay-header {
          flex-direction: column;
          align-items: stretch;
        }

        .error-overlay-close {
          align-self: flex-end;
        }
      }
    `
  ]
})
export class ErrorOverlayComponent {
  readonly title = input<string | null>(null);
  readonly message = input<string | null>('');
  readonly close = output<void>();
}
