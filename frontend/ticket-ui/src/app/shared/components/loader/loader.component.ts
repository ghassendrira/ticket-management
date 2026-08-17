import { Component } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    <div class="loader">
      <div class="loader-spinner"></div>
    </div>
  `,
  styles: [`
    .loader {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .loader-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-top: 3px solid var(--accent-violet);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class LoaderComponent {}
