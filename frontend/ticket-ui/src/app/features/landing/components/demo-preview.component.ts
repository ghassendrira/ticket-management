import { Component, OnInit, OnDestroy } from '@angular/core';

interface Ticket {
  id: string;
  title: string;
  status: 'new' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
}

@Component({
  selector: 'app-demo-preview',
  standalone: true,
  template: `
    <section id="demo" class="demo">
      <div class="demo-container">
        <h2 class="section-title">Voyez-le en action</h2>
        <div class="demo-mockup">
          <div class="mockup-sidebar">
            <div class="sidebar-item active">📥 Tous les tickets</div>
            <div class="sidebar-item">🔴 Priorité haute</div>
            <div class="sidebar-item">⚡ En cours</div>
            <div class="sidebar-item">✅ Résolus</div>
          </div>
          <div class="mockup-content">
            @for (ticket of tickets; track ticket.id) {
              <div class="mockup-ticket" [class.highlight]="ticket.id === highlightedTicket">
                <div class="ticket-info">
                  <div class="ticket-id">#{{ ticket.id }}</div>
                  <div class="ticket-title">{{ ticket.title }}</div>
                </div>
                <div class="ticket-meta">
                  <span class="priority" [class]="ticket.priority">{{ ticket.priority }}</span>
                  <span class="status" [class]="ticket.status">{{ ticket.status }}</span>
                </div>
              </div>
            }
          </div>
          @if (showToast) {
            <div class="demo-toast">
              💡 Suggestion IA générée !
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    .demo {
      padding: 100px 2rem;
      background-color: var(--bg-secondary);
    }

    .demo-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .section-title {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 3rem;
    }

    .demo-mockup {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      display: flex;
      overflow: hidden;
      box-shadow: 0 20px 60px var(--shadow);
      position: relative;
    }

    .mockup-sidebar {
      width: 200px;
      border-right: 1px solid var(--border);
      padding: 1.5rem;
    }

    .sidebar-item {
      padding: 0.75rem 1rem;
      border-radius: 10px;
      margin-bottom: 0.5rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .sidebar-item:hover, .sidebar-item.active {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
    }

    .sidebar-item.active {
      font-weight: 600;
    }

    .mockup-content {
      flex: 1;
      padding: 1.5rem;
    }

    .mockup-ticket {
      background-color: var(--bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.3s ease;
    }

    .mockup-ticket.highlight {
      border-color: var(--accent-violet);
      box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
    }

    .ticket-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }

    .ticket-title {
      font-weight: 500;
    }

    .ticket-meta {
      display: flex;
      gap: 0.5rem;
    }

    .priority, .status {
      font-size: 0.75rem;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-weight: 600;
    }

    .priority.high {
      background-color: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .priority.medium {
      background-color: rgba(234, 179, 8, 0.1);
      color: #eab308;
    }

    .priority.low {
      background-color: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .status.new {
      background-color: rgba(79, 110, 247, 0.1);
      color: var(--accent-blue);
    }

    .status.in-progress {
      background-color: rgba(139, 92, 246, 0.1);
      color: var(--accent-violet);
    }

    .status.resolved {
      background-color: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .demo-toast {
      position: absolute;
      bottom: 1.5rem;
      right: 1.5rem;
      background: linear-gradient(135deg, var(--accent-violet), var(--accent-blue));
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      font-weight: 500;
      box-shadow: 0 10px 30px var(--shadow);
      animation: slideUp 0.4s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 980px) {
      .mockup-sidebar {
        display: none;
      }
    }
  `]
})
export class DemoPreviewComponent implements OnInit, OnDestroy {
  tickets: Ticket[] = [
    { id: 'TKT-2845', title: 'Erreur lors de l\'export des données', status: 'in-progress', priority: 'high' },
    { id: 'TKT-2844', title: 'Demande de modification de facturation', status: 'resolved', priority: 'medium' },
    { id: 'TKT-2843', title: 'Problème d\'affichage sur mobile', status: 'new', priority: 'medium' },
    { id: 'TKT-2842', title: 'Question sur les API webhooks', status: 'resolved', priority: 'low' }
  ];

  highlightedTicket: string | null = null;
  showToast = false;
  private intervalId?: any;

  ngOnInit() {
    let index = 0;
    this.intervalId = setInterval(() => {
      const newTicket: Ticket = {
        id: `TKT-${2846 + index}`,
        title: [
          'Nouvelle demande de support utilisateur',
          'Problème de connexion détecté',
          'Bug sur le formulaire de contact',
          'Question sur les tarifications'
        ][index % 4],
        status: 'new',
        priority: ['low', 'medium', 'high'][index % 3] as any
      };
      this.tickets.unshift(newTicket);
      this.highlightedTicket = newTicket.id;
      this.showToast = true;

      setTimeout(() => {
        this.showToast = false;
      }, 3000);

      setTimeout(() => {
        this.highlightedTicket = null;
      }, 1500);

      index++;
    }, 5000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
