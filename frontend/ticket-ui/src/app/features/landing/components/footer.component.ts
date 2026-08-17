import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-logo">Triage</div>
        <div class="footer-links">
          <a href="#">À propos</a>
          <a href="#">Tarifs</a>
          <a href="#">Documentation</a>
          <a href="#">Contact</a>
        </div>
        <div class="footer-copyright">© 2026 Triage. Tous droits réservés.</div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      padding: 3rem 2rem;
      border-top: 1px solid var(--border);
    }

    .footer-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .footer-logo {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet), var(--accent-cyan));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .footer-links {
      display: flex;
      gap: 2rem;
    }

    .footer-links a {
      text-decoration: none;
      color: var(--text-secondary);
      transition: color 0.2s;
    }

    .footer-links a:hover {
      color: var(--text-primary);
    }

    .footer-copyright {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    @media (max-width: 640px) {
      .footer-container {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class FooterComponent {}
