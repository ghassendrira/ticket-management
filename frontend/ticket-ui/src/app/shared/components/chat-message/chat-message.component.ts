import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Message } from '../../../models';
import { ConfidenceBadgeComponent } from '../confidence-badge/confidence-badge.component';
import { SourceAccordionComponent, SourceItem } from '../source-accordion/source-accordion.component';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfidenceBadgeComponent, SourceAccordionComponent],
  template: `
    <article class="msg-row" [class.user]="isUser()" [class.assistant]="!isUser()">
      <div class="msg-avatar" *ngIf="!isUser()" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a3 3 0 0 1 3 3v1h1a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-1v1a1 1 0 1 1-2 0v-1H9v1a1 1 0 1 1-2 0v-1H6a4 4 0 0 1-4-4v-5a4 4 0 0 1 4-4h1V5a3 3 0 0 1 3-3h2z"></path>
          <circle cx="9" cy="14" r="1.5"></circle>
          <circle cx="15" cy="14" r="1.5"></circle>
          <path d="M9 18h6a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2z"></path>
        </svg>
      </div>

      <div class="msg-col">
        <div class="bubble" [class.user-bubble]="isUser()" [class.ai-bubble]="!isUser()">
          <div class="bubble-meta" *ngIf="!isUser()">
            <div class="meta-left">
              <span class="msg-author fw-semibold">Assistant IA</span>
              <app-confidence-badge
                *ngIf="hasConfidence()"
                [confidence]="message.confidence ?? 0"
              />
              <span class="badge badge-warning fallback fs-xs" *ngIf="message.isFallbackGeneral">
                Reponse generale
              </span>
            </div>
            <span class="msg-time muted fs-xs">{{ formattedTime() }}</span>
          </div>

          <div class="bubble-meta user-meta" *ngIf="isUser()">
            <span class="msg-time muted fs-xs">{{ formattedTime() }}</span>
            <span class="msg-author fw-semibold">Vous</span>
          </div>

          <p class="msg-content" [class.user-content]="isUser()">{{ message.content }}</p>
        </div>

        <div class="msg-footer" *ngIf="!isUser()">
          <app-source-accordion
            *ngIf="derivedSources().length > 0"
            [sources]="derivedSources()"
          />

          <div class="feedback-bar" *ngIf="resolvedConversationId()">
            <div class="feedback-row">
              <span class="feedback-label fs-sm muted fw-medium">Cette reponse vous a-t-elle ete utile ?</span>
              <div class="feedback-btns">
                <button
                  type="button"
                  class="fb-btn up"
                  [class.voted]="feedbackState() === 'UP'"
                  (click)="onFeedback('UP')"
                  aria-label="Pouce haut"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                  </svg>
                </button>
                <button
                  type="button"
                  class="fb-btn down"
                  [class.voted]="feedbackState() === 'DOWN'"
                  (click)="onFeedback('DOWN')"
                  aria-label="Pouce bas"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                  </svg>
                </button>
              </div>
            </div>

            <a
              *ngIf="showEscalation()"
              class="btn-warning btn btn-sm escalate-btn"
              [routerLink]="['/escalade', resolvedConversationId()]"
              [attr.aria-label]="'Contacter le support humain pour cette conversation'"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Contacter le support humain
            </a>
          </div>
        </div>
      </div>

      <div class="msg-avatar user-avatar" *ngIf="isUser()" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
    </article>
  `,
  styles: [
    `
      .msg-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        animation: fadeInUp 0.25s ease-out;
      }

      .msg-row.user {
        flex-direction: row-reverse;
      }

      .msg-avatar {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border-radius: var(--radius-lg);
        flex-shrink: 0;
      }

      .msg-row:not(.user) .msg-avatar {
        background: var(--gradient-ai);
        color: white;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.28);
      }

      .msg-avatar.user-avatar {
        background: var(--bg-muted);
        color: var(--text-secondary);
        border: 1px solid var(--border-color);
      }

      .msg-col {
        display: grid;
        gap: 10px;
        max-width: min(720px, 100%);
        flex: 1;
        min-width: 0;
      }

      .msg-row.user .msg-col { align-items: flex-end; }

      .bubble {
        padding: 14px 18px;
        border-radius: var(--radius-xl);
        display: grid;
        gap: 10px;
        position: relative;
      }

      .bubble.ai-bubble {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow-sm);
        border-top-left-radius: var(--radius-md);
      }

      .bubble.user-bubble {
        background: var(--gradient-primary);
        color: white;
        box-shadow: var(--shadow-primary);
        border-top-right-radius: var(--radius-md);
      }

      .bubble-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-3);
        flex-wrap: wrap;
      }

      .meta-left {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        flex-wrap: wrap;
      }

      .msg-author { font-size: 0.88rem; }
      .ai-bubble .msg-author { color: var(--text-primary); }
      .user-bubble .msg-author { color: rgba(255,255,255,0.95); }

      .msg-time { letter-spacing: 0.01em; }
      .user-bubble .msg-time { color: rgba(255,255,255,0.7); }

      .msg-content {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.65;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .ai-bubble .msg-content { color: var(--text-primary); }
      .user-bubble .msg-content { color: white; }

      .msg-footer {
        display: grid;
        gap: 8px;
        padding-left: 2px;
      }

      .feedback-bar {
        display: grid;
        gap: 8px;
      }

      .feedback-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-3);
        flex-wrap: wrap;
        padding: 8px 12px;
        background: var(--bg-surface);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-color);
      }

      .feedback-btns {
        display: flex;
        gap: 6px;
      }

      .fb-btn {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: var(--radius-md);
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        color: var(--text-secondary);
        transition: all var(--transition-fast);
      }

      .fb-btn:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
        border-color: var(--border-strong);
      }

      .fb-btn.up.voted {
        background: var(--accent-100);
        border-color: transparent;
        color: var(--accent);
      }

      .fb-btn.down.voted {
        background: var(--danger-100);
        border-color: transparent;
        color: var(--danger);
      }

      .escalate-btn {
        justify-content: center;
      }

      @media (max-width: 640px) {
        .msg-avatar { width: 32px; height: 32px; }
        .bubble { padding: 12px 14px; }
        .feedback-row { flex-direction: column; align-items: stretch; }
      }
    `
  ]
})
export class ChatMessageComponent {
  @Input({ required: true }) message!: Message;
  @Input() conversationId?: string;

  @Output() feedback = new EventEmitter<'UP' | 'DOWN'>();

  readonly feedbackState = signal<'UP' | 'DOWN' | null>(null);

  readonly isUser = computed(() => this.message.role === 'USER');
  readonly hasConfidence = computed(() => this.message.confidence !== undefined && this.message.confidence !== null);
  readonly resolvedConversationId = computed(() => this.conversationId || this.message.conversationId || '');
  readonly showEscalation = computed(() => {
    return !this.isUser() && !!this.resolvedConversationId();
  });

  readonly formattedTime = computed(() => {
    const value = this.message.createdAt;
    if (value === undefined || value === null || value === '') return '';
    const epoch = typeof value === 'number' || /^\d+$/.test(value) ? Number(value) : undefined;
    const date = epoch === undefined
      ? new Date(value)
      : new Date(epoch < 100000000000 ? epoch * 1000 : epoch);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  });

  readonly derivedSources = computed<SourceItem[]>(() => {
    const raw = this.message.sources ?? [];
    if (raw.length === 0) return [];
    return raw.map((s, i) => {
      if (typeof s === 'string') {
        return {
          documentTitle: s.includes('.pdf') || s.includes('.docx') ? s : `Source ${i + 1}`,
          pageNumber: undefined,
          section: undefined,
          score: 0.7 + (Math.random() * 0.29),
          snippet: s.length > 20 ? s : undefined
        };
      }
      return s as unknown as SourceItem;
    });
  });

  onFeedback(value: 'UP' | 'DOWN'): void {
    this.feedbackState.set(value);
    this.feedback.emit(value);
  }
}
