import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-hero',
  standalone: true,
  template: `
    <section class="hero">
      <div class="hero-container">
        <div class="hero-content">
          <h1 class="hero-title">
            Smart AI Ticket Management <span class="gradient-text">Platform</span>
          </h1>
          <p class="hero-subtitle">
            Automatisez le triage des tickets, analysez les sentiments en temps réel, et boostez la productivité de votre équipe support avec l'IA.
          </p>
          <div class="hero-actions">
            <button class="btn btn-primary">Commencer gratuitement</button>
            <button class="btn btn-outline">Voir la démo</button>
          </div>
        </div>
        <div class="hero-illustration">
          <div class="ticket-card ticket-main">
            <div class="ticket-header">
              <span class="ticket-id">#TKT-2847</span>
              <span class="ticket-time">Il y a 2 min</span>
            </div>
            <p class="ticket-title">Impossible de me connecter à mon compte</p>
            <div class="ticket-badges">
              <span class="badge" [class.visible]="badgesVisible >= 1">🏷️ ACCOUNT_ACCESS</span>
              <span class="badge badge-danger" [class.visible]="badgesVisible >= 2">🔴 HIGH Priority</span>
              <span class="badge badge-yellow" [class.visible]="badgesVisible >= 3">😟 Negative Sentiment</span>
              <span class="badge badge-success" [class.visible]="badgesVisible >= 4">💡 Suggested Response Generated</span>
            </div>
            <div class="ticket-assignment" [class.visible]="assignmentVisible">
              <div class="agent-avatar">MP</div>
              <span class="agent-name">Marie Perrier</span>
              <div class="checkmark">✓</div>
            </div>
          </div>
          <div class="ticket-card ticket-float ticket-float-1">
            <p>Problème de paiement lors de la souscription</p>
          </div>
          <div class="ticket-card ticket-float ticket-float-2">
            <p>Comment activer le 2FA sur mon compte ?</p>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .hero {
      padding: 160px 2rem 100px;
      position: relative;
      overflow: hidden;
    }

    .hero-container {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4rem;
      align-items: center;
    }

    .hero-title {
      font-size: 3.5rem;
      line-height: 1.1;
      margin-bottom: 1.5rem;
    }

    .gradient-text {
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet), var(--accent-cyan));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-subtitle {
      font-size: 1.2rem;
      color: var(--text-secondary);
      margin-bottom: 2rem;
    }

    .hero-actions {
      display: flex;
      gap: 1rem;
    }

    .btn {
      padding: 1rem 2rem;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      font-size: 1rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(79, 110, 247, 0.35);
    }

    .btn-outline {
      background-color: transparent;
      color: var(--text-primary);
      border: 2px solid var(--border);
    }

    .hero-illustration {
      position: relative;
      height: 450px;
    }

    .ticket-card {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 1.5rem;
      box-shadow: 0 10px 40px var(--shadow);
    }

    .ticket-main {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 320px;
      z-index: 10;
    }

    .ticket-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .ticket-id {
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .ticket-time {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .ticket-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .ticket-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      background-color: var(--bg-secondary);
      color: var(--text-secondary);
      opacity: 1;
      transform: none;
    }

    .badge-danger {
      background-color: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .badge-yellow {
      background-color: rgba(234, 179, 8, 0.1);
      color: #eab308;
    }

    .badge-success {
      background-color: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .ticket-assignment {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      opacity: 1;
      transform: none;
    }

    @media (prefers-reduced-motion: no-preference) {
      .badge {
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.4s ease, transform 0.4s ease;
      }
      .badge.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .ticket-assignment {
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.4s ease 0.5s, transform 0.4s ease 0.5s;
      }
      .ticket-assignment.visible {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .agent-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-violet), var(--accent-blue));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .agent-name {
      font-weight: 500;
    }

    .checkmark {
      margin-left: auto;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: rgba(34, 197, 94, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #22c55e;
    }

    .ticket-float {
      position: absolute;
      width: 220px;
      animation: float 6s ease-in-out infinite;
    }

    .ticket-float-1 {
      top: 20px;
      right: 20px;
      animation-delay: 0s;
    }

    .ticket-float-2 {
      bottom: 40px;
      left: 0;
      animation-delay: 3s;
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-20px);
      }
    }

    @media (max-width: 980px) {
      .hero-container {
        grid-template-columns: 1fr;
      }

      .hero-title {
        font-size: 2.5rem;
      }

      .hero-illustration {
        margin-top: 3rem;
      }
    }
  `]
})
export class HeroComponent implements OnInit, OnDestroy {
  badgesVisible = 0;
  assignmentVisible = false;
  private intervalId?: any;

  ngOnInit() {
    this.startAnimation();
    this.intervalId = setInterval(() => {
      this.resetAnimation();
      setTimeout(() => this.startAnimation(), 300);
    }, 7000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private startAnimation() {
    setTimeout(() => this.badgesVisible = 1, 500);
    setTimeout(() => this.badgesVisible = 2, 1000);
    setTimeout(() => this.badgesVisible = 3, 1500);
    setTimeout(() => this.badgesVisible = 4, 2000);
    setTimeout(() => this.assignmentVisible = true, 2500);
  }

  private resetAnimation() {
    this.badgesVisible = 0;
    this.assignmentVisible = false;
  }
}
