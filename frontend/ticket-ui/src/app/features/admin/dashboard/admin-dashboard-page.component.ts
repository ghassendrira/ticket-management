import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';

import { CategoryService } from '../../../core/services/category.service';
import { ConversationService } from '../../../core/services/conversation.service';
import { DocumentService } from '../../../core/services/document.service';
import { EscalationService } from '../../../core/services/escalation.service';
import { Category, Conversation, Document, Escalation } from '../../../models';

Chart.register(...registerables);

interface StatCard {
  label: string;
  value: number | string;
  icon: string;
  trend?: string;
  color: 'primary' | 'success' | 'warning' | 'info' | 'purple' | 'danger';
}

interface ActivityDoc {
  name: string;
  status: 'INDEXED' | 'PROCESSING' | 'PENDING' | 'FAILED';
  progress: number;
}

interface InsightItem {
  icon: string;
  text: string;
  type: 'warning' | 'info' | 'danger';
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <div>
          <h1>Console d'administration</h1>
          <p class="subtitle">Pilotage du système RAG et assistance IA</p>
        </div>
        <div class="system-status">
          <span class="status-dot online"></span>
          <span>Système opérationnel</span>
        </div>
      </header>

      <div class="stats-grid">
        <div class="stat-card" [class]="'stat-card-' + card.color" *ngFor="let card of stats1">
          <div class="stat-icon">{{ card.icon }}</div>
          <div class="stat-info">
            <span class="stat-label">{{ card.label }}</span>
            <span class="stat-value">{{ card.value }}</span>
            <span class="stat-trend" *ngIf="card.trend">{{ card.trend }}</span>
          </div>
        </div>
      </div>

      <div class="stats-grid small">
        <div class="stat-card mini" [class]="'stat-card-' + card.color" *ngFor="let card of stats2">
          <span class="stat-label">{{ card.label }}</span>
          <span class="stat-value">{{ card.value }}</span>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-header">
            <h3>Conversations créées vs résolues</h3>
            <div class="chart-tabs">
              <button class="tab active">7 Jours</button>
              <button class="tab">30 Jours</button>
              <button class="tab">3 Mois</button>
            </div>
          </div>
          <div class="chart-body">
            <canvas #lineChartCanvas></canvas>
          </div>
        </div>

        <div class="chart-card">
          <h3>Documents par catégorie</h3>
          <div class="doughnut-container">
            <canvas #doughnutChartCanvas></canvas>
            <div class="doughnut-center">
              <span class="center-value">{{ totalDocuments }}</span>
              <span class="center-label">Total</span>
            </div>
          </div>
        </div>
      </div>

      
      <div class="bottom-grid">
        <div class="bottom-card">
          <div class="card-header">
            <h3>Conversations récentes</h3>
            <button class="btn-link" type="button">Voir tout</button>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>CONV. ID</th>
                <th>DERNIÈRE QUESTION</th>
                <th>STATUT</th>
                <th>CONFIANCE</th>
                <th>DATE</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let conv of recentConversations">
                <td class="mono-id">{{ conv.id | slice:0:8 }}</td>
                <td class="question-cell">{{ conv.question }}</td>
                <td><span class="badge" [class]="getStatusClass(conv.status)">{{ conv.status }}</span></td>
                <td><span class="badge confidence" [class]="getConfidenceClass(conv.confidence)">{{ conv.confidence }}%</span></td>
                <td class="date">{{ conv.createdAt | date:'short' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="bottom-card activity-card">
          <h3>Activité Documents</h3>
          <div class="activity-search">
            <input type="text" placeholder="Rechercher document..." />
          </div>
          <div class="activity-list">
            <div *ngFor="let doc of documentActivity" class="activity-item">
              <div class="activity-info">
                <span class="doc-icon">📄</span>
                <div>
                  <span class="doc-name">{{ doc.name }}</span>
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="doc.progress"></div>
                  </div>
                </div>
              </div>
              <span class="doc-status" [class]="'status-' + doc.status.toLowerCase()">{{ doc.status }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      --primary: #6366f1;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --info: #3b82f6;
      --purple: #8b5cf6;
      --bg: #f3f4f6;
      --card-bg: #ffffff;
      --text-primary: #111827;
      --text-secondary: #6b7280;
      --border: #e5e7eb;
    }

    .dashboard-container {
      padding: 24px;
      background: var(--bg);
      min-height: 100vh;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .dashboard-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .subtitle {
      margin: 4px 0 0;
      color: var(--text-secondary);
      font-size: 14px;
    }

    .system-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 999px;
      background: #ecfdf5;
      color: #059669;
      font-weight: 600;
      font-size: 13px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .stats-grid.small {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .stat-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 18px 16px;
      border-radius: 16px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      border-left: 4px solid var(--primary);
    }

    .stat-card-primary { border-left-color: var(--primary); }
    .stat-card-success { border-left-color: var(--success); }
    .stat-card-warning { border-left-color: var(--warning); }
    .stat-card-info { border-left-color: var(--info); }
    .stat-card-purple { border-left-color: var(--purple); }
    .stat-card-danger { border-left-color: var(--danger); }

    .stat-card.mini {
      flex-direction: column;
      padding: 16px;
      gap: 8px;
    }

    .stat-icon {
      width: 48px;
      min-width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: #eef2ff;
      font-size: 22px;
    }

    .stat-card-success .stat-icon { background: #ecfdf5; }
    .stat-card-warning .stat-icon { background: #fff7ed; }
    .stat-card-info .stat-icon { background: #eff6ff; }
    .stat-card-purple .stat-icon { background: #f5f3ff; }
    .stat-card-danger .stat-icon { background: #fef2f2; }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.1;
    }

    .stat-card.mini .stat-value {
      font-size: 24px;
    }

    .stat-trend {
      font-size: 12px;
      color: var(--success);
      font-weight: 600;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .chart-card,
    .insight-card,
    .bottom-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .chart-card {
      padding: 20px;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .chart-header h3,
    .insight-card h3,
    .bottom-card h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .chart-tabs {
      display: flex;
      gap: 6px;
    }

    .tab {
      border: none;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12px;
      background: #f3f4f6;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .tab.active {
      background: var(--primary);
      color: white;
    }

    .chart-body {
      height: 250px;
    }

    .doughnut-container {
      position: relative;
      height: 250px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .doughnut-center {
      position: absolute;
      text-align: center;
    }

    .center-value {
      display: block;
      font-size: 32px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
    }

    .center-label {
      color: var(--text-secondary);
      font-size: 12px;
    }

    .insights-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .insight-card {
      padding: 20px;
    }

    .insight-subtitle {
      margin: -10px 0 12px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px 12px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: #f9fafb;
      color: var(--text-primary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.18s ease;
    }

    .action-btn:hover {
      transform: translateY(-1px);
    }

    .action-btn.primary {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      border-color: #6366f1;
      color: white;
    }

    .action-icon {
      font-size: 20px;
      line-height: 1;
    }

    .distribution-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 8px;
    }

    .dist-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .dist-item.total {
      margin-top: 4px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      font-weight: 700;
    }

    .dist-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .dist-dot.indexed { background: var(--success); }
    .dist-dot.pending { background: var(--warning); }
    .dist-dot.failed { background: var(--danger); }

    .dist-label {
      flex: 1;
      color: var(--text-secondary);
      font-size: 13px;
    }

    .dist-value {
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 700;
    }

    .insights-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .insight-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 13px;
      line-height: 1.4;
    }

    .insight-item.warning {
      background: #fffbeb;
      color: #92400e;
    }

    .insight-item.info {
      background: #eff6ff;
      color: #1d4ed8;
    }

    .insight-item.danger {
      background: #fef2f2;
      color: #b91c1c;
    }

    .insight-icon {
      font-size: 16px;
    }

    .bottom-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
    }

    .bottom-card {
      padding: 20px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .btn-link {
      border: none;
      background: transparent;
      color: var(--primary);
      font-weight: 600;
      cursor: pointer;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .data-table th {
      text-align: left;
      padding: 10px;
      color: var(--text-secondary);
      font-size: 11px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      border-bottom: 1px solid var(--border);
    }

    .data-table td {
      padding: 12px 10px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
      color: var(--text-primary);
    }

    .mono-id {
      font-family: 'SFMono-Regular', Consolas, monospace;
      color: var(--text-secondary);
      font-size: 12px;
    }

    .question-cell {
      max-width: 300px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 86px;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1px;
    }

    .badge.status-resolved,
    .badge.confidence-high {
      background: #ecfdf5;
      color: #047857;
    }

    .badge.status-open,
    .badge.confidence-medium {
      background: #fef3c7;
      color: #b45309;
    }

    .badge.status-escalated,
    .badge.confidence-low {
      background: #fef2f2;
      color: #b91c1c;
    }

    .date {
      color: var(--text-secondary);
      font-size: 12px;
    }

    .activity-card {
      display: flex;
      flex-direction: column;
    }

    .activity-search input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 9px 12px;
      margin: 16px 0 14px;
      font-size: 13px;
      background: white;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .activity-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .activity-info {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }

    .doc-icon {
      font-size: 18px;
    }

    .doc-name {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .progress-bar {
      width: 100px;
      height: 6px;
      border-radius: 999px;
      overflow: hidden;
      background: #e5e7eb;
    }

    .progress-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
    }

    .doc-status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .status-indexed { background: #ecfdf5; color: #047857; }
    .status-processing { background: #fff7ed; color: #c2410c; }
    .status-pending { background: #eef2ff; color: #4338ca; }
    .status-failed { background: #fef2f2; color: #b91c1c; }

    @media (max-width: 1200px) {
      .stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .stats-grid.small { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .charts-grid,
      .insights-grid,
      .bottom-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 700px) {
      .dashboard-container { padding: 16px; }
      .dashboard-header { flex-direction: column; align-items: flex-start; gap: 10px; }
      .stats-grid,
      .stats-grid.small,
      .actions-grid { grid-template-columns: 1fr; }
      .chart-header { flex-direction: column; align-items: flex-start; }
      .data-table { display: block; overflow-x: auto; }
    }
  `]
})
export class AdminDashboardPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('lineChartCanvas') lineChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutChartCanvas') doughnutChartCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly conversationService = inject(ConversationService);
  private readonly documentService = inject(DocumentService);
  private readonly categoryService = inject(CategoryService);
  private readonly escalationService = inject(EscalationService);

  private lineChart?: Chart;
  private doughnutChart?: Chart;

  stats1: StatCard[] = [];
  stats2: StatCard[] = [];
  recentConversations: Array<{ id: string; question: string; status: string; confidence: number; createdAt: string }> = [];
  documentActivity: ActivityDoc[] = [];
  aiInsights: InsightItem[] = [];
  totalDocuments = 0;
  indexedDocs = 0;
  pendingDocs = 0;
  failedDocs = 0;

  ngAfterViewInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.lineChart?.destroy();
    this.doughnutChart?.destroy();
  }

  getStatusClass(status: string): string {
    const s = status?.toUpperCase();
    if (s === 'RESOLVED') return 'status-resolved';
    if (s === 'ESCALATED') return 'status-escalated';
    return 'status-open';
  }

  getConfidenceClass(value: number): string {
    if (value >= 80) return 'confidence-high';
    if (value >= 50) return 'confidence-medium';
    return 'confidence-low';
  }

  private loadDashboardData(): void {
    forkJoin({
      conversations: this.conversationService.listConversations(),
      documents: this.documentService.listDocuments(),
      categories: this.categoryService.listCategories(),
      escalations: this.escalationService.listEscalations()
    }).subscribe({
      next: ({ conversations, documents, categories, escalations }) => {
        this.buildDashboard(conversations, documents, categories, escalations);
      },
      error: () => {
        this.buildDashboard([], [], [], []);
      }
    });
  }

  private buildDashboard(
    conversations: Conversation[],
    documents: Document[],
    categories: Category[],
    escalations: Escalation[]
  ): void {
    const totalConversations = conversations.length;
    const resolvedConversations = conversations.filter(c => c.status === 'RESOLVED').length;
    const escalationsCount = escalations.length;

    const allAssistantMessages = conversations.flatMap(c => (c.messages ?? []).filter(m => m.role === 'ASSISTANT'));
    const averageConfidence = allAssistantMessages.length
      ? Math.round(
          (allAssistantMessages.reduce((sum, msg) => sum + (msg.confidence ?? 0), 0) / allAssistantMessages.length) * 100
        )
      : 0;

    const indexed = documents.filter(d => d.status === 'INDEXED').length;
    const pending = documents.filter(d => d.status === 'PENDING' || d.status === 'PROCESSING').length;
    const failed = documents.filter(d => d.status === 'FAILED').length;
    const activeCategories = categories.length;

    this.totalDocuments = documents.length;
    this.indexedDocs = indexed;
    this.pendingDocs = pending;
    this.failedDocs = failed;

    this.stats1 = [
      { label: 'Total conversations', value: totalConversations, icon: '💬', trend: `+${resolvedConversations} résolues`, color: 'primary' },
      { label: 'Résolues auto', value: totalConversations ? Math.round((resolvedConversations / totalConversations) * 100) : 0, icon: '✅', color: 'success' },
      { label: 'Escalades', value: escalationsCount, icon: '⚠️', color: 'warning' },
      { label: 'Confiance', value: `${averageConfidence}%`, icon: '⭐', color: 'info' },
      { label: 'Docs indexés', value: indexed, icon: '📄', color: 'purple' }
    ];

    this.stats2 = [
      { label: 'Documents indexés', value: indexed, icon: '📄', color: 'primary' },
      { label: 'En attente', value: pending, icon: '⏳', color: 'warning' },
      { label: 'Échoués', value: failed, icon: '❌', color: 'danger' },
      { label: 'Catégories', value: activeCategories, icon: '📁', color: 'purple' }
    ];

    this.recentConversations = conversations
      .slice(0, 5)
      .map(conv => {
        const assistantMessages = conv.messages?.filter(m => m.role === 'ASSISTANT') ?? [];
        const confidence = assistantMessages.length
          ? Math.round(
              (assistantMessages.reduce((sum, msg) => sum + (msg.confidence ?? 0), 0) / assistantMessages.length) * 100
            )
          : 0;

        const lastUserMessage = [...(conv.messages ?? [])].reverse().find(m => m.role === 'USER');

        return {
          id: conv.id,
          question: lastUserMessage?.content ?? 'Aucune question',
          status: conv.status,
          confidence,
          createdAt: conv.createdAt
        };
      });

    this.documentActivity = documents.slice(0, 5).map(doc => ({
      name: doc.name,
      status: doc.status,
      progress: doc.status === 'INDEXED' ? 100 : doc.status === 'PROCESSING' ? 65 : doc.status === 'PENDING' ? 25 : 0
    }));

    this.aiInsights = [
      {
        icon: '📄',
        text: `${Math.max(0, pending + failed)} documents non indexés détectés`,
        type: 'warning'
      },
      {
        icon: '📉',
        text: averageConfidence < 70 ? 'Confiance moyenne en baisse' : 'Confiance moyenne stable',
        type: 'info'
      },
      {
        icon: '⚠️',
        text: `${escalationsCount} escalades ce mois`,
        type: 'danger'
      }
    ];

    this.renderLineChart(conversations);
    this.renderDoughnutChart(documents);
  }

  private renderLineChart(conversations: Conversation[]): void {
    if (!this.lineChartCanvas) return;

    const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const created = [0, 0, 0, 0, 0, 0, 0];
    const resolved = [0, 0, 0, 0, 0, 0, 0];
    const escalated = [0, 0, 0, 0, 0, 0, 0];

    const now = new Date();
    for (const conv of conversations) {
      const date = new Date(conv.createdAt);
      const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
      const idx = Math.min(6, Math.max(0, 6 - diff));
      if (idx >= 0 && idx < 7) {
        created[idx] += 1;
      }

      if (conv.status === 'RESOLVED') {
        const d = new Date(conv.updatedAt ?? conv.createdAt);
        const diffResolved = Math.floor((now.getTime() - d.getTime()) / 86400000);
        const rdx = Math.min(6, Math.max(0, 6 - diffResolved));
        if (rdx >= 0 && rdx < 7) {
          resolved[rdx] += 1;
        }
      }
    }

    this.lineChart?.destroy();
    this.lineChart = new Chart(this.lineChartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Créées', data: created, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.12)', fill: true, tension: 0.35, borderWidth: 2 },
          { label: 'Résolues', data: resolved, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.12)', fill: true, tension: 0.35, borderWidth: 2 },
          { label: 'Escaladées', data: escalated, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.10)', fill: true, tension: 0.35, borderWidth: 2 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' as const } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  private renderDoughnutChart(documents: Document[]): void {
    if (!this.doughnutChartCanvas) return;

    const counts: Record<string, number> = {};
    for (const doc of documents) {
      const categoryName = doc.category?.name ?? 'Sans catégorie';
      counts[categoryName] = (counts[categoryName] ?? 0) + 1;
    }

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    this.doughnutChart?.destroy();
    this.doughnutChart = new Chart(this.doughnutChartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#ef4444', '#f59e0b', '#a78bfa'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: { legend: { position: 'right' as const } }
      }
    });
  }
}

