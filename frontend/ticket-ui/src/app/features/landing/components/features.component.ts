import { Component } from '@angular/core';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-features',
  standalone: true,
  template: `
    <section id="features" class="features">
      <div class="features-container">
        <h2 class="section-title">Fonctionnalités puissantes</h2>
        <p class="section-subtitle">Tout ce dont vous avez besoin pour gérer efficacement vos tickets support</p>
        <div class="features-grid">
          @for (feature of features; track feature.title) {
            <div class="feature-card">
              <div class="feature-icon">{{ feature.icon }}</div>
              <h3 class="feature-title">{{ feature.title }}</h3>
              <p class="feature-description">{{ feature.description }}</p>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    .features {
      padding: 100px 2rem;
      background-color: var(--bg-secondary);
    }

    .features-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .section-title {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    .section-subtitle {
      text-align: center;
      color: var(--text-secondary);
      font-size: 1.1rem;
      margin-bottom: 4rem;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }

    .feature-card {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 2rem;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .feature-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px var(--shadow);
    }

    .feature-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    .feature-title {
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
    }

    .feature-description {
      color: var(--text-secondary);
      line-height: 1.6;
    }

    @media (max-width: 980px) {
      .features-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .features-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class FeaturesComponent {
  features: Feature[] = [
    {
      icon: '🤖',
      title: 'Gestion intelligente des tickets',
      description: 'L\'IA trie et catégorise automatiquement vos tickets dès leur arrivée.'
    },
    {
      icon: '📊',
      title: 'Analyse automatique par IA',
      description: 'Analyse de sentiment, détection d\'intentions et extraction d\'entités.'
    },
    {
      icon: '🚨',
      title: 'Détection de priorité',
      description: 'Identifie instantanément les tickets critiques et les escalade automatiquement.'
    },
    {
      icon: '💡',
      title: 'Suggestions de réponses',
      description: 'Réponses pré-rédigées et personnalisées générées par l\'IA pour vos agents.'
    },
    {
      icon: '📈',
      title: 'Suivi des performances agents',
      description: 'Tableaux de bord détaillés pour analyser la productivité de votre équipe.'
    },
    {
      icon: '⚡',
      title: 'Tableaux de bord temps réel',
      description: 'Visualisez l\'activité de votre support en temps réel avec des métriques clés.'
    }
  ];
}
