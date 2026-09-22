import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';

import { Conversation } from '../../../models';
import { ConversationService } from '../../../core/services/conversation.service';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  template: `
    <section class="page-shell history-page">
      <header class="page-header">
        <div class="header-copy">
          <span class="eyebrow">Support</span>
          <h1 class="page-title">Historique des conversations</h1>
          <p class="page-subtitle">Reprenez une conversation précédente ou consultez son statut.</p>
        </div>

        <div class="header-tools" *ngIf="conversations.length || !loading">
          <label class="search-field" aria-label="Rechercher une conversation">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10.5 4a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13zm0 2a4.5 4.5 0 1 0 0 9a4.5 4.5 0 0 0 0-9zm8.91 11.5l1.79 1.79a1 1 0 0 1-1.41 1.41L18 18.91a1 1 0 0 1 1.41-1.41z"></path>
            </svg>
            <input
              type="search"
              [value]="searchTerm"
              (input)="searchTerm = $any($event.target).value"
              placeholder="Rechercher"
              aria-label="Rechercher une conversation"
            />
          </label>

          <div class="filter-row" *ngIf="hasStatusData()">
            <button
              type="button"
              class="filter-chip"
              [class.active]="statusFilter === 'ALL'"
              (click)="statusFilter = 'ALL'"
            >
              Tous
            </button>
            <button
              type="button"
              class="filter-chip"
              [class.active]="statusFilter === 'OPEN'"
              (click)="statusFilter = 'OPEN'"
            >
              Ouvertes
            </button>
            <button
              type="button"
              class="filter-chip"
              [class.active]="statusFilter === 'ESCALATED'"
              (click)="statusFilter = 'ESCALATED'"
            >
              Escaladées
            </button>
            <button
              type="button"
              class="filter-chip"
              [class.active]="statusFilter === 'RESOLVED'"
              (click)="statusFilter = 'RESOLVED'"
            >
              Résolues
            </button>
          </div>
        </div>
      </header>

      <div class="error-state card-surface" *ngIf="errorMessage">
        <div class="state-illustration error-illustration" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 8v4"></path>
            <path d="M12 16h.01"></path>
          </svg>
        </div>
        <div class="state-copy">
          <h2>Impossible de charger l'historique</h2>
          <p>{{ errorMessage }}</p>
        </div>
        <button class="primary-button" type="button" (click)="loadConversations()">Réessayer</button>
      </div>

      <div class="loading-state" *ngIf="loading" aria-busy="true" aria-live="polite">
        <div class="history-skeleton" *ngFor="let row of [1, 2, 3, 4]" aria-hidden="true">
          <span class="skeleton-line skeleton-line--title"></span>
          <span class="skeleton-line skeleton-line--text"></span>
          <span class="skeleton-line skeleton-line--meta"></span>
        </div>
      </div>

      <div class="card-grid" *ngIf="!loading && !errorMessage && filteredConversations.length; else noHistory">
        <a
          class="history-card card-surface"
          *ngFor="let conversation of filteredConversations"
          [routerLink]="['/chat', conversation.id]"
          [attr.aria-label]="'Ouvrir la conversation ' + conversationTitle(conversation)"
        >
          <span class="status-accent" [class]="statusAccentClass(conversation.status)" aria-hidden="true"></span>

          <div class="card-main">
            <div class="card-head">
              <h3>{{ conversationTitle(conversation) }}</h3>
              <span class="status-badge" [class]="statusBadgeClass(conversation.status)">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path [attr.d]="statusIconPath(conversation.status)"></path>
                </svg>
                {{ statusLabel(conversation.status) }}
              </span>
            </div>

            <p class="conversation-preview">{{ firstMessage(conversation) }}</p>

            <div class="card-meta">
              <span>{{ conversation.createdAt | date: 'dd/MM/yyyy' }} à {{ conversation.createdAt | date: 'HH:mm' }}</span>
              <span class="meta-separator">•</span>
              <span>{{ messageCount(conversation) }} message{{ messageCount(conversation) > 1 ? 's' : '' }}</span>
            </div>
          </div>

          <span class="card-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M9 6l6 6-6 6"></path>
            </svg>
          </span>
        </a>
      </div>

      <ng-template #noHistory>
        <div class="empty-state card-surface" *ngIf="!loading && !errorMessage">
          <div class="state-illustration" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M6 18h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"></path>
              <path d="M8 10h8"></path>
              <path d="M8 14h5"></path>
            </svg>
          </div>
          <div class="state-copy">
            <h2>Aucune conversation pour le moment</h2>
            <p>Commencez une discussion pour garder votre historique ici.</p>
          </div>
          <a class="primary-button" routerLink="/chat">Démarrer un chat</a>
        </div>
      </ng-template>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .history-page {
        display: grid;
        gap: 24px;
        padding: 32px 0 48px;
      }

      .page-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
      }

      .header-copy {
        display: grid;
        gap: 8px;
        max-width: 720px;
      }

      .eyebrow {
        margin: 0;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--primary);
      }

      .page-title {
        margin: 0;
        font-size: clamp(30px, 4vw, 34px);
        line-height: 1.2;
        letter-spacing: -0.04em;
        color: var(--text-primary);
      }

      .page-subtitle {
        margin: 0;
        color: var(--text-muted);
        font-size: 15px;
        line-height: 1.6;
      }

      .header-tools {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: min(100%, 420px);
      }

      .search-field {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 46px;
        padding: 0 14px;
        background: var(--surface);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        box-shadow: var(--shadow-sm);
      }

      .search-field svg {
        width: 16px;
        height: 16px;
        fill: none;
        stroke: var(--text-muted);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .search-field input {
        width: 100%;
        min-width: 0;
        border: none;
        background: transparent;
        color: var(--text-primary);
        font: inherit;
        outline: none;
      }

      .search-field input::placeholder {
        color: var(--text-muted);
      }

      .filter-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .filter-chip {
        appearance: none;
        border: 1px solid var(--border-color);
        background: var(--surface);
        color: var(--text-secondary);
        border-radius: 999px;
        min-height: 36px;
        padding: 0 14px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .filter-chip.active {
        background: var(--primary-100);
        color: var(--primary-700);
        border-color: rgba(99, 102, 241, 0.18);
      }

      .card-surface {
        background: var(--surface);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        box-shadow: var(--shadow-sm);
      }

      .card-grid {
        display: grid;
        gap: 16px;
      }

      .history-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 14px 16px 14px 0;
        text-decoration: none;
        color: inherit;
        transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      }

      .history-card:hover,
      .history-card:focus-visible {
        transform: translateY(-1px);
        border-color: rgba(99, 102, 241, 0.22);
        box-shadow: var(--shadow-md);
        outline: none;
      }

      .status-accent {
        width: 5px;
        min-height: 88px;
        border-radius: 0 10px 10px 0;
        align-self: stretch;
      }

      .status-accent.open {
        background: var(--info-500);
      }

      .status-accent.escalated {
        background: var(--warning-500);
      }

      .status-accent.resolved {
        background: var(--success-500);
      }

      .card-main {
        flex: 1;
        display: grid;
        gap: 10px;
        min-width: 0;
      }

      .card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .card-head h3 {
        margin: 0;
        color: var(--text-primary);
        font-size: 18px;
        line-height: 1.3;
        font-weight: 700;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid transparent;
      }

      .status-badge svg {
        width: 12px;
        height: 12px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .status-badge.open {
        background: rgba(59, 130, 246, 0.1);
        color: #2563eb;
        border-color: rgba(59, 130, 246, 0.16);
      }

      .status-badge.escalated {
        background: rgba(245, 158, 11, 0.12);
        color: #b45309;
        border-color: rgba(245, 158, 11, 0.18);
      }

      .status-badge.resolved {
        background: rgba(34, 197, 94, 0.12);
        color: #15803d;
        border-color: rgba(34, 197, 94, 0.18);
      }

      .conversation-preview {
        margin: 0;
        color: var(--text-muted);
        font-size: 14px;
        line-height: 1.55;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .card-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 500;
      }

      .meta-separator {
        opacity: 0.5;
      }

      .card-arrow {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 10px;
        color: var(--text-muted);
        background: var(--surface-subtle);
      }

      .card-arrow svg {
        width: 16px;
        height: 16px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .state-illustration {
        display: grid;
        place-items: center;
        width: 64px;
        height: 64px;
        border-radius: 18px;
        background: var(--surface-subtle);
        color: var(--primary);
      }

      .state-illustration svg {
        width: 28px;
        height: 28px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .error-illustration {
        color: var(--danger-600);
      }

      .empty-state,
      .error-state {
        display: grid;
        gap: 16px;
        align-items: center;
        justify-items: center;
        padding: 28px 20px;
        text-align: center;
      }

      .state-copy {
        display: grid;
        gap: 6px;
      }

      .state-copy h2 {
        margin: 0;
        color: var(--text-primary);
        font-size: 24px;
        line-height: 1.2;
      }

      .state-copy p {
        margin: 0;
        color: var(--text-muted);
      }

      .primary-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 18px;
        border-radius: 12px;
        border: 1px solid transparent;
        background: var(--primary);
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
      }

      .loading-state {
        display: grid;
        gap: 16px;
      }

      .history-skeleton {
        display: grid;
        gap: 12px;
        padding: 16px 18px;
        background: var(--surface);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        box-shadow: var(--shadow-sm);
      }

      .skeleton-line {
        display: block;
        height: 12px;
        border-radius: 999px;
        background: linear-gradient(90deg, var(--surface-subtle) 25%, var(--bg-muted) 50%, var(--surface-subtle) 75%);
        background-size: 200% 100%;
        animation: shimmer 1.2s linear infinite;
      }

      .skeleton-line--title {
        width: 52%;
        height: 16px;
      }

      .skeleton-line--text {
        width: 92%;
      }

      .skeleton-line--meta {
        width: 34%;
      }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @media (max-width: 640px) {
        .history-page {
          gap: 18px;
          padding-top: 20px;
        }

        .page-header {
          align-items: flex-start;
        }

        .header-tools {
          width: 100%;
          min-width: 0;
        }

        .search-field {
          width: 100%;
        }

        .history-card {
          gap: 12px;
          padding-right: 12px;
        }

        .card-head {
          flex-direction: column;
          align-items: flex-start;
        }

        .card-head h3 {
          white-space: normal;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: clip;
        }

        .status-badge {
          align-self: flex-start;
        }

        .card-arrow {
          display: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .history-card,
        .filter-chip,
        .skeleton-line,
        .primary-button {
          transition: none;
          animation: none;
        }
      }
    `
  ]
})
export class HistoryPageComponent implements OnInit {
  private readonly conversationService = inject(ConversationService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  conversations: Conversation[] = [];
  loading = false;
  errorMessage = '';
  searchTerm = '';
  statusFilter: 'ALL' | 'OPEN' | 'ESCALATED' | 'RESOLVED' = 'ALL';

  ngOnInit(): void {
    this.loadConversations();
  }

  get filteredConversations(): Conversation[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.conversations.filter((conversation) => {
      const matchesSearch =
        !query ||
        conversationTitleText(conversation).toLowerCase().includes(query) ||
        firstMessageText(conversation).toLowerCase().includes(query);

      const matchesStatus =
        this.statusFilter === 'ALL' || conversation.status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  hasStatusData(): boolean {
    return this.conversations.some((conversation) => conversation.status !== undefined && conversation.status !== null);
  }

  messageCount(conversation: Conversation): number {
    return conversation.messages?.length ?? 0;
  }

  firstMessage(conversation: Conversation): string {
    return conversation.messages[0]?.content ?? 'Aucun message encore.';
  }

  conversationTitle(conversation: Conversation): string {
    const title = conversationTitleText(conversation);
    return title || `Conversation ${conversation.id}`;
  }

  statusLabel(status: Conversation['status']): string {
    return {
      OPEN: 'Ouverte',
      RESOLVED: 'Résolue',
      ESCALATED: 'Escaladée'
    }[status] ?? 'Ouverte';
  }

  statusBadgeClass(status: Conversation['status']): string {
    return {
      OPEN: 'open',
      RESOLVED: 'resolved',
      ESCALATED: 'escalated'
    }[status] ?? 'open';
  }

  statusAccentClass(status: Conversation['status']): string {
    return this.statusBadgeClass(status);
  }

  statusIconPath(status: Conversation['status']): string {
    return {
      OPEN: 'M12 6v6l4 2',
      RESOLVED: 'M5 12l4 4L19 2',
      ESCALATED: 'M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z'
    }[status] ?? 'M12 6v6l4 2';
  }

  loadConversations(): void {
    this.loading = true;
    this.errorMessage = '';
    const startedAt = performance.now();
    console.log('[History] request start', {
      url: 'http://localhost:8091/api/conversations',
      customerIdSource: 'validated JWT on server; guest fallback via X-Customer-Id',
    });

    this.conversationService
      .listConversations()
      .pipe(timeout({ each: 10000 }))
      .pipe(finalize(() => {
        this.loading = false;
        this.changeDetector.markForCheck();
        console.log('[History] request end', {
          durationMs: Math.round(performance.now() - startedAt),
          loading: this.loading,
          itemCount: this.conversations.length,
        });
      }))
      .subscribe({
        next: (conversations) => {
          this.conversations = conversations;
          console.log('[History] response received', {
            status: 'success',
            itemCount: conversations.length,
          });
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          this.errorMessage = error?.name === 'TimeoutError'
            ? "Le chargement de l'historique a dépassé 10 secondes."
            : "Impossible de charger l'historique.";
          console.error('[History] response error', {
            status: error?.status ?? 'unknown',
            name: error?.name ?? 'unknown',
          });
          this.changeDetector.markForCheck();
        }
      });
  }
}

function firstMessageText(conversation: Conversation): string {
  return (conversation.messages?.[0]?.content ?? 'Aucun message encore.').trim();
}

function conversationTitleText(conversation: Conversation): string {
  const snippet = firstMessageText(conversation);
  return snippet.length > 80 ? `${snippet.slice(0, 77).trimEnd()}…` : snippet;
}
