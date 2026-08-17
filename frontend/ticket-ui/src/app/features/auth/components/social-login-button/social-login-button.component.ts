import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-social-login-button',
  standalone: true,
  template: `
    <button class="social-btn">
      <svg viewBox="0 0 24 24" class="social-icon"></svg>
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    .social-btn {
      width: 100%;
      padding: 0.875rem 1.5rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      background-color: var(--surface);
      color: var(--text-primary);
      font-weight: 500;
      font-size: 0.9375rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      cursor: pointer;
    }
  `]
})
export class SocialLoginButtonComponent {}
