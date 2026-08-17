import { Component } from '@angular/core';

@Component({
  selector: 'app-cta',
  standalone: true,
  template: `
    <section class="cta">
      <div class="cta-container">
        <h2 class="cta-title">Prêt à transformer votre support ?</h2>
        <p class="cta-subtitle">Rejoignez des milliers d'équipes qui utilisent Triage pour améliorer leur productivité.</p>
        <button class="btn btn-primary">Commencer gratuitement</button>
      </div>
    </section>
  `,
  styles: [`
    .cta {
      padding: 100px 2rem;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet), var(--accent-cyan));
    }

    .cta-container {
      max-width: 800px;
      margin: 0 auto;
      text-align: center;
    }

    .cta-title {
      color: white;
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    .cta-subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 1.2rem;
      margin-bottom: 2rem;
    }

    .btn {
      padding: 1rem 2.5rem;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      font-size: 1.1rem;
      background-color: white;
      color: var(--accent-violet);
      transition: all 0.2s;
    }

    .btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
    }
  `]
})
export class CtaComponent {}
