import { Component, effect, inject, Input } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [TranslatePipe, LanguageSwitcherComponent],
  template: `
    <nav class="navbar" [class.scrolled]="isScrolled">
      <div class="navbar-container">
        <div class="navbar-logo">Triage</div>
        <div class="navbar-links">
          <a href="#features">{{ 'LANDING.NAV.FEATURES' | translate }}</a>
          <a href="#how-it-works">{{ 'LANDING.NAV.HOW_IT_WORKS' | translate }}</a>
          <a href="#stats">{{ 'LANDING.NAV.RESULTS' | translate }}</a>
          <a href="#demo">{{ 'LANDING.NAV.DEMO' | translate }}</a>
        </div>
        <div class="navbar-actions">
          @if (showLanguageSwitcher) {
            <app-language-switcher variant="landing" />
          }
          <button class="theme-toggle" (click)="themeService.toggleTheme()" [attr.aria-label]="'LANDING.NAV.THEME_ARIA' | translate">
            @if (themeService.currentTheme() === 'dark') {
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            }
            @if (themeService.currentTheme() === 'light') {
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            }
          </button>
          <button class="btn btn-secondary">{{ 'AUTH.LOGIN.LABEL' | translate }}</button>
          <button class="btn btn-primary">{{ 'LANDING.NAV.START' | translate }}</button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      padding: 1rem 2rem;
      transition: background-color 0.3s, box-shadow 0.3s, backdrop-filter 0.3s;
    }

    .navbar.scrolled {
      background-color: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
    }

    :root[data-theme="dark"] .navbar.scrolled {
      background-color: rgba(11, 9, 18, 0.7);
    }

    .navbar-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .navbar-logo {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet), var(--accent-cyan));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .navbar-links {
      display: flex;
      gap: 2rem;
    }

    .navbar-links a {
      text-decoration: none;
      color: var(--text-secondary);
      font-weight: 500;
      transition: color 0.2s;
    }

    .navbar-links a:hover {
      color: var(--text-primary);
    }

    .navbar-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .theme-toggle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid var(--border);
      background-color: var(--surface);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .theme-toggle:hover {
      background-color: var(--bg-secondary);
      border-color: var(--accent-violet);
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-secondary {
      background-color: transparent;
      color: var(--text-primary);
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(79, 110, 247, 0.3);
    }

    @media (max-width: 980px) {
      .navbar-links {
        display: none;
      }
    }
  `]
})
export class NavbarComponent {
  readonly themeService = inject(ThemeService);
  @Input() showLanguageSwitcher = false;
  isScrolled = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => {
        this.isScrolled = window.scrollY > 10;
      });
    }
  }
}
