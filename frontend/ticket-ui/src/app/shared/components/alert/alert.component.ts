import { Component, input } from '@angular/core';

@Component({
  selector: 'app-alert',
  standalone: true,
  template: `
    <div [class]="'alert alert-' + type()">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .alert {
      padding: 1rem 1.25rem;
      border-radius: 12px;
      font-size: 0.9375rem;
      margin-bottom: 1rem;
    }

    .alert-success {
      background-color: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }

    .alert-error {
      background-color: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .alert-info {
      background-color: rgba(79, 110, 247, 0.1);
      color: var(--accent-blue);
      border: 1px solid rgba(79, 110, 247, 0.2);
    }

    .alert-warning {
      background-color: rgba(250, 204, 21, 0.1);
      color: #eab308;
      border: 1px solid rgba(250, 204, 21, 0.2);
    }
  `]
})
export class AlertComponent {
  type = input<'success' | 'error' | 'info' | 'warning'>('info');
}
