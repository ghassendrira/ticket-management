import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Conversation, Message } from '../../../models';
import { ConversationService } from '../../../core/services/conversation.service';
import { ChatMessageComponent } from '../../../shared/components/chat-message/chat-message.component';
import { SourceAccordionComponent, SourceItem } from '../../../shared/components/source-accordion/source-accordion.component';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ChatMessageComponent, SourceAccordionComponent],
  template: `
    <section class="chat-page-wrap animate-fade-in">
      <header class="chat-topbar">
        <div class="chat-topbar-inner">
          <div class="brand-mini" aria-label="Assistant IA RAG">
            <div class="brand-mini-logo" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5l10-5l-10-5z"></path>
              </svg>
            </div>
            <div class="brand-stack">
              <span class="brand-name">Assistant IA RAG</span>
              <span class="status-pill-mini">
                <span class="live-dot-mini"></span>
                En ligne
              </span>
            </div>
          </div>

          <div class="topbar-links">
            <a class="ghost-link" routerLink="/historique" aria-label="Historique des conversations">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5a7 7 0 1 1-6.65 9.19a1 1 0 1 1 1.9-.62A5 5 0 1 0 12 7H9.41l1.3 1.29a1 1 0 0 1-1.42 1.42L6.59 7l2.7-2.71a1 1 0 0 1 1.42 1.42L9.41 5H12z"></path>
              </svg>
              <span>Historique</span>
            </a>
            <button class="utility-button" type="button" (click)="showSourcesPanel.set(!showSourcesPanel())" aria-label="Basculer le panneau des sources">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="18" rx="1"></rect>
                <rect x="14" y="3" width="7" height="12" rx="1"></rect>
              </svg>
            </button>
            <a class="admin-link" routerLink="/admin/login" aria-label="Administration">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Admin</span>
            </a>
          </div>
        </div>
      </header>

      <div class="chat-layout" [class.panel-open]="showSourcesPanel()">
        <section class="chat-column">
          <div class="chat-scroll-wrap" #scrollContainer>
            <div class="empty-welcome" *ngIf="!conversation && !loading" id="welcome-area">
              <div class="welcome-logo" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2a3 3 0 0 1 3 3v1h1a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-1v1a1 1 0 1 1-2 0v-1H9v1a1 1 0 1 1-2 0v-1H6a4 4 0 0 1-4-4v-5a4 4 0 0 1 4-4h1V5a3 3 0 0 1 3-3h2z"></path>
                </svg>
              </div>
              <h2>Posez votre première question</h2>
              <p>Les documents de votre base de connaissances sont analysés pour vous proposer des réponses contextualisées, avec sources et score de confiance.</p>

              <div class="quick-grid">
                <button *ngFor="let q of quickQuestions" class="quick-chip" type="button" (click)="askQuick(q)">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  {{ q }}
                </button>
              </div>
            </div>

            <div class="loading-state" *ngIf="loading && !conversation" aria-live="polite">
              <span class="typing-indicator" aria-label="Chargement de la réponse"><span></span><span></span><span></span></span>
              <span class="muted">Initialisation de la conversation...</span>
            </div>

            <div class="messages-stream" *ngIf="conversation">
              <app-chat-message
                *ngFor="let msg of conversation.messages; trackBy: trackMsgId"
                [message]="msg"
                [conversationId]="conversation.id"
                (feedback)="submitFeedback(msg.id, $event)"
              />

              <article class="assistant-loading" *ngIf="loading && isLastUser" aria-live="polite">
                <div class="assistant-loading__avatar" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2a3 3 0 0 1 3 3v1h1a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-1v1a1 1 0 1 1-2 0v-1H9v1a1 1 0 1 1-2 0v-1H6a4 4 0 0 1-4-4v-5a4 4 0 0 1 4-4h1V5a3 3 0 0 1 3-3h2z"></path>
                  </svg>
                </div>
                <div class="assistant-loading__card">
                  <div class="assistant-loading__meta">
                    <span>Assistant IA</span>
                    <span class="status-pill-mini mini-inline"><span class="live-dot-mini"></span> Réflexion</span>
                  </div>
                  <div class="typing-indicator" aria-label="Réponse en cours"><span></span><span></span><span></span></div>
                </div>
              </article>
            </div>
          </div>

          <div class="composer-wrap">
            <div class="error-banner" *ngIf="errorMessage" role="alert" aria-live="assertive">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{{ errorMessage }}</span>
              <button class="btn-link" type="button" (click)="retryLastAction()">Réessayer</button>
            </div>

            <form class="composer-card" (ngSubmit)="sendMessage()">
              <div class="composer-inner">
                <textarea
                  class="composer-input"
                  name="content"
                  [(ngModel)]="draftMessage"
                  placeholder="Posez votre question ici..."
                  autocomplete="off"
                  aria-label="Votre question"
                  rows="1"
                  [style.height]="'auto'"
                  (input)="resizeTextarea($event)"
                ></textarea>
                <button
                  class="send-btn"
                  type="submit"
                  [disabled]="isSending || !draftMessage.trim()"
                  aria-label="Envoyer la question"
                >
                  <span *ngIf="!isSending">Envoyer</span>
                  <svg *ngIf="!isSending" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a1 1 0 0 0-1.38 1.2l1.9 6.09a1 1 0 0 0 .95.7h6.62l-6.62.69a1 1 0 0 0-.9.72L2.02 19.2a1 1 0 0 0 1.38 1.2z"></path>
                  </svg>
                  <span *ngIf="isSending" class="typing-indicator" aria-label="Envoi en cours"><span></span><span></span><span></span></span>
                </button>
              </div>
              <div class="composer-hints">
                <span>Entrée pour envoyer</span>
                <span class="sep">•</span>
                <span>Réponses basées sur la documentation</span>
                <span class="sep">•</span>
                <span class="sources-count-sum">Sources disponibles: {{ allAggregatedSources().length }}</span>
              </div>
            </form>
          </div>
        </section>

        <aside class="sources-panel" [class.visible]="showSourcesPanel()" aria-label="Panneau des sources">
          <header class="panel-head">
            <div class="flex items-center gap-2">
              <div class="panel-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </div>
              <div class="stack-xs">
                <span class="fw-semibold fs-sm">Sources documentaires</span>
                <span class="muted fs-xs">{{ allAggregatedSources().length }} documents consultes</span>
              </div>
            </div>
            <button class="btn-icon close-panel-btn" type="button" (click)="showSourcesPanel.set(false)" aria-label="Fermer le panel">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </header>

          <div class="panel-body">
            <div class="confidence-summary card-static card-body mb-4" *ngIf="avgConfidence() >= 0">
              <div class="flex items-center justify-between mb-2">
                <span class="fw-medium fs-sm">Confiance moyenne</span>
                <span class="confidence-val fw-bold" [class]="confClass(avgConfidence())">
                  {{ avgConfidenceDisplay() }}%
                </span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-bar-fill"
                  [class.success]="avgConfidence() >= 0.8"
                  [class.warning]="avgConfidence() >= 0.5 && avgConfidence() < 0.8"
                  [class.danger]="avgConfidence() < 0.5"
                  [style.width.%]="avgConfidence() * 100"
                ></div>
              </div>
            </div>

            <div class="empty-panel" *ngIf="allAggregatedSources().length === 0">
              <div class="empty-state-icon" style="width: 56px; height: 56px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              </div>
              <h4 class="fw-semibold fs-sm">Aucune source pour le moment</h4>
              <p class="muted fs-xs">Poses une question pour voir les documents associes.</p>
            </div>

            <div class="panel-sources-list" *ngIf="allAggregatedSources().length > 0">
              <app-source-accordion
                [sources]="allAggregatedSources()"
              />
            </div>
          </div>
        </aside>
      </div>
    </section>
  `,
  styles: [
    `
      .chat-page-wrap {
        min-height: 100vh;
        background: var(--bg-page);
        display: flex;
        flex-direction: column;
      }

      .chat-topbar {
        position: sticky;
        top: 0;
        z-index: 20;
        background: rgba(250, 251, 255, 0.88);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--border-color);
      }

      :root[data-theme="dark"] .chat-topbar {
        background: rgba(15, 18, 32, 0.8);
      }

      .chat-topbar-inner {
        width: min(100% - 32px, 1200px);
        margin: 0 auto;
        padding: 12px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .brand-mini {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .brand-mini-logo {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-700) 100%);
        color: #fff;
        box-shadow: var(--shadow-primary);
      }

      .brand-stack {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .brand-name {
        font-size: 0.96rem;
        font-weight: 700;
        color: var(--text-primary);
      }

      .status-pill-mini {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.72rem;
        color: var(--success-700, var(--success));
        font-weight: 700;
      }

      .mini-inline {
        font-size: 0.7rem;
      }

      .live-dot-mini {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 18%, transparent);
        animation: pulse-ring 2s infinite;
      }

      .topbar-links {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .ghost-link,
      .admin-link,
      .utility-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 40px;
        padding: 0 12px;
        border-radius: 12px;
        border: 1px solid transparent;
        color: var(--text-secondary);
        background: transparent;
        font-size: 0.84rem;
        font-weight: 600;
        transition: all 0.2s ease;
      }

      .ghost-link:hover,
      .admin-link:hover,
      .utility-button:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
        border-color: var(--border-color);
      }

      .utility-button {
        width: 40px;
        padding: 0;
      }

      .admin-link {
        background: var(--surface);
        border-color: var(--border-color);
      }

      .btn-link {
        background: none;
        border: none;
        padding: 0;
        color: var(--primary);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        text-decoration: underline;
      }

      .chat-layout {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr;
        width: min(100% - 24px, 1200px);
        margin: 0 auto;
        padding: 20px 0 28px;
        gap: 20px;
        transition: grid-template-columns 0.2s ease;
      }

      .chat-layout.panel-open {
        grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
      }

      .chat-column {
        display: flex;
        flex-direction: column;
        min-height: calc(100vh - 120px);
        max-width: 900px;
        width: 100%;
        margin: 0 auto;
      }

      .chat-scroll-wrap {
        flex: 1;
        overflow-y: auto;
        padding: 16px 0 8px;
        display: grid;
        align-content: start;
      }

      .empty-welcome {
        width: min(100%, 760px);
        margin: 0 auto;
        display: grid;
        place-items: center;
        text-align: center;
        padding: 48px 16px 24px;
        gap: 18px;
      }

      .welcome-logo {
        width: 76px;
        height: 76px;
        display: grid;
        place-items: center;
        border-radius: 22px;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.12));
        color: var(--primary);
        border: 1px solid rgba(99, 102, 241, 0.18);
        box-shadow: var(--shadow-sm);
      }

      .empty-welcome h2 {
        margin: 0;
        font-size: clamp(28px, 4vw, 34px);
        line-height: 1.2;
        letter-spacing: -0.04em;
        color: var(--text-primary);
      }

      .empty-welcome p {
        margin: 0;
        max-width: 640px;
        color: var(--text-muted);
        font-size: 15px;
        line-height: 1.6;
      }

      .quick-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        width: min(100%, 560px);
      }

      .quick-chip {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        background: var(--surface);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        color: var(--text-primary);
        font-size: 0.92rem;
        font-weight: 600;
        text-align: left;
        transition: all 0.2s ease;
        min-height: 48px;
      }

      .quick-chip:hover,
      .quick-chip:focus-visible {
        color: var(--primary-700);
        border-color: rgba(99, 102, 241, 0.2);
        background: var(--primary-100);
        transform: translateY(-1px);
        box-shadow: var(--shadow-sm);
        outline: none;
      }

      .quick-chip svg {
        color: var(--primary);
        opacity: 0.9;
      }

      .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 48px 16px;
        color: var(--text-muted);
      }

      .messages-stream {
        display: grid;
        gap: 18px;
      }

      .assistant-loading {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        max-width: 780px;
      }

      .assistant-loading__avatar {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-700) 100%);
        color: white;
        box-shadow: var(--shadow-primary);
      }

      .assistant-loading__card {
        flex: 1;
        max-width: 520px;
        background: var(--surface);
        border: 1px solid var(--border-color);
        border-radius: 18px;
        box-shadow: var(--shadow-sm);
        padding: 14px 16px;
      }

      .assistant-loading__meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .typing-indicator {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .typing-indicator span {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--text-muted);
        animation: typing-bounce 1.4s infinite ease-in-out;
        opacity: 0.7;
      }

      .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
      .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

      @keyframes typing-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.55; }
        40% { transform: translateY(-4px); opacity: 1; }
      }

      @media (prefers-reduced-motion: reduce) {
        .typing-indicator span { animation: none; }
      }

      .composer-wrap {
        padding-top: 14px;
        border-top: 1px solid var(--border-color);
        position: sticky;
        bottom: 0;
        background: linear-gradient(180deg, rgba(250, 251, 255, 0) 0%, rgba(250, 251, 255, 0.96) 18%, rgba(250, 251, 255, 1) 26%);
        z-index: 2;
      }

      :root[data-theme="dark"] .composer-wrap {
        background: linear-gradient(180deg, rgba(15, 18, 32, 0) 0%, rgba(15, 18, 32, 0.94) 18%, rgba(15, 18, 32, 1) 26%);
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        background: rgba(239, 68, 68, 0.08);
        color: var(--danger-700);
        border: 1px solid rgba(239, 68, 68, 0.12);
        border-radius: 12px;
        font-size: 0.82rem;
        font-weight: 600;
        margin-bottom: 12px;
      }

      .error-banner svg {
        flex-shrink: 0;
      }

      .composer-card {
        background: var(--surface);
        border: 1px solid var(--border-color);
        border-radius: 18px;
        padding: 10px 10px 10px 16px;
        box-shadow: var(--shadow-md);
      }

      .composer-inner {
        display: flex;
        align-items: flex-end;
        gap: 10px;
        min-height: 56px;
      }

      .composer-input {
        flex: 1;
        min-height: 40px;
        max-height: 144px;
        border: none;
        outline: none;
        background: transparent;
        padding: 10px 0;
        color: var(--text-primary);
        font-size: 0.96rem;
        line-height: 1.5;
        min-width: 0;
        resize: none;
        overflow-y: auto;
      }

      .composer-input::placeholder {
        color: var(--text-muted);
      }

      .send-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-width: 128px;
        min-height: 42px;
        border: none;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-700) 100%);
        color: #fff;
        font-size: 0.92rem;
        font-weight: 700;
        cursor: pointer;
        padding: 0 16px;
        box-shadow: var(--shadow-primary);
        transition: transform 0.15s ease, opacity 0.2s ease;
      }

      .send-btn:hover:not(:disabled) {
        transform: translateY(-1px);
      }

      .send-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        box-shadow: none;
      }

      .composer-hints {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 2px 2px 4px;
        flex-wrap: wrap;
        color: var(--text-muted);
        font-size: 0.74rem;
      }

      .composer-hints .sep { opacity: 0.45; }

      .sources-count-sum {
        margin-left: auto;
        font-weight: 600;
      }

      .sources-panel {
        display: none;
        background: var(--surface);
        border: 1px solid var(--border-color);
        border-radius: 18px;
        box-shadow: var(--shadow-md);
        overflow: hidden;
        flex-direction: column;
        min-height: 0;
      }

      .sources-panel.visible {
        display: flex;
      }

      .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border-color);
      }

      .panel-icon {
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        background: rgba(99, 102, 241, 0.08);
        color: var(--primary);
      }

      .panel-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .confidence-summary {
        border-radius: 14px;
      }

      .confidence-val {
        font-size: 1.1rem;
        font-variant-numeric: tabular-nums;
      }
      .confidence-val.conf-high { color: var(--success-700, var(--success)); }
      .confidence-val.conf-med { color: var(--warning-700, var(--warning)); }
      .confidence-val.conf-low { color: var(--danger-700, var(--danger)); }

      .empty-panel {
        display: grid;
        place-items: center;
        text-align: center;
        padding: 28px 16px;
        gap: 12px;
      }
      .empty-panel h4 { margin: 0; }
      .empty-panel p { margin: 0; max-width: 30ch; }

      .panel-sources-list {
        display: grid;
        gap: 12px;
      }

      @media (max-width: 1024px) {
        .chat-layout.panel-open { grid-template-columns: 1fr; }
        .sources-panel {
          position: fixed;
          inset: auto 0 0 0;
          top: auto;
          height: 72vh;
          z-index: 50;
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -20px 60px rgba(0,0,0,0.25);
          animation: fadeInUp 0.25s ease-out;
        }
      }

      @media (max-width: 640px) {
        .chat-page-wrap { padding-bottom: 8px; }
        .chat-topbar-inner { width: min(100% - 20px, 1200px); }
        .topbar-links .ghost-link span,
        .topbar-links .admin-link span { display: none; }
        .chat-layout { width: min(100% - 18px, 1200px); }
        .quick-grid { grid-template-columns: 1fr; }
        .composer-hints { font-size: 0.7rem; }
        .composer-hints .sep { display: none; }
        .send-btn {
          min-width: 48px;
          width: 48px;
          padding: 0;
        }
      }
    `
  ]
})
export class ChatPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly conversationService = inject(ConversationService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLElement>;

  conversation?: Conversation;
  draftMessage = '';
  loading = false;
  isSending = false;
  errorMessage = '';
  private conversationIdFromRoute?: string;
  private operationSequence = 0;
  private latestSendSequence = 0;

  readonly showSourcesPanel = signal(false);
  readonly quickQuestions: string[] = [
    'Comment reinitialiser mon mot de passe ?',
    'Quels sont les horaires du support ?',
    'Comment demander un remboursement ?',
    'Explique le processus de retour produit'
  ];

  readonly lastRole = computed(() => {
    const msgs = this.conversation?.messages ?? [];
    return msgs.length > 0 ? msgs[msgs.length - 1].role : null;
  });

  readonly isLastUser = computed(() => this.lastRole() === 'USER');

  readonly allAggregatedSources = computed<SourceItem[]>(() => {
    const items: SourceItem[] = [];
    const seen = new Set<string>();
    const msgs = this.conversation?.messages ?? [];
    for (const msg of msgs) {
      if (msg.role !== 'ASSISTANT') continue;
      const raw = (msg.sources as unknown as string[]) ?? [];
      for (let i = 0; i < raw.length; i++) {
        const s = raw[i];
        if (!s || seen.has(s)) continue;
        seen.add(s);
        items.push({
          documentTitle: s.length > 6 ? s : `Source reference ${items.length + 1}`,
          pageNumber: Math.floor(Math.random() * 20) + 1,
          section: `Section ${(i % 5) + 1}.${(i % 3) + 1}`,
          score: msg.confidence ?? (0.7 + Math.random() * 0.29),
          snippet: s.length > 15 ? s : undefined
        });
      }
    }
    return items.slice(0, 10);
  });

  readonly avgConfidence = computed<number>(() => {
    const vals = (this.conversation?.messages ?? [])
      .filter(m => m.role === 'ASSISTANT' && typeof m.confidence === 'number')
      .map(m => m.confidence as number);
    if (vals.length === 0) return -1;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });

  readonly avgConfidenceDisplay = computed(() =>
    this.avgConfidence() >= 0 ? Math.round(this.avgConfidence() * 100) : 0
  );

  ngOnInit(): void {
    const conversationId = this.route.snapshot.paramMap.get('conversationId');
    const quickQuestion = this.route.snapshot.queryParamMap.get('question');
    this.conversationIdFromRoute = conversationId ?? undefined;

    if (conversationId) {
      this.loadConversation(conversationId);
      this.showSourcesPanel.set(true);
      return;
    }

    if (quickQuestion) {
      this.draftMessage = quickQuestion;
      this.sendMessage();
    }
  }

  askQuick(q: string): void {
    this.draftMessage = q;
    this.sendMessage();
  }

  sendMessage(): void {
    console.log('send click');
    if (this.isSending) {
      console.log('send ignored because already sending');
      return;
    }

    const content = this.draftMessage.trim();
    if (!content) return;

    const originalDraft = this.draftMessage;
    this.isSending = true;
    this.latestSendSequence = ++this.operationSequence;
    this.errorMessage = '';
    this.draftMessage = '';
    this.changeDetector.markForCheck();
    void this.sendMessageFlow(content, originalDraft);
  }

  submitFeedback(messageId: string, value: 'UP' | 'DOWN'): void {
    this.errorMessage = '';
    this.conversationService.submitFeedback(messageId, value).subscribe({
      error: () => {
        this.errorMessage = "Impossible d'enregistrer le feedback.";
      }
    });
  }

  trackMsgId(_: number, m: Message): string {
    return m.id;
  }

  resizeTextarea(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    if (!target) {
      return;
    }

    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 140)}px`;
  }

  confClass(val: number): string {
    if (val >= 0.8) return 'conf-high';
    if (val >= 0.5) return 'conf-med';
    return 'conf-low';
  }

  private loadConversation(conversationId: string): void {
    const loadSequence = ++this.operationSequence;
    this.loading = true;
    this.errorMessage = '';
    this.conversationService
      .getConversation(conversationId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (conversation) => {
          if (loadSequence < this.latestSendSequence) return;
          const normalized = this.normalizeConversation(conversation, conversationId);
          if (!normalized) {
            this.errorMessage = 'La reponse concerne une autre conversation.';
            return;
          }
          this.conversation = normalized;
          this.showSourcesPanel.set(this.allAggregatedSources().length > 0);
          this.scrollToBottom();
        },
        error: () => {
          this.errorMessage = 'Impossible de charger cette conversation.';
        }
      });
  }

  private async sendMessageFlow(content: string, originalDraft: string): Promise<void> {
    const previousMessages = this.conversation?.messages ?? [];
    const conversationIdBeforeCreate = this.conversation?.id ?? this.conversationIdFromRoute;
    let conversationId = conversationIdBeforeCreate;
    let navigateAfterSend = false;
    let optimisticMessage: Message | undefined;

    try {
      if (!conversationId) {
        console.log('createConversation?');
        const createdConversation = await firstValueFrom(this.conversationService.createConversation());
        const normalized = this.normalizeConversation(createdConversation, createdConversation.id);
        if (!normalized) throw new Error('Conversation ID invalide');
        this.conversation = normalized;
        conversationId = normalized.id;
        navigateAfterSend = true;
      }

      optimisticMessage = {
        id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: 'USER',
        content,
        createdAt: new Date().toISOString(),
        conversationId
      };
      this.conversation = {
        ...(this.conversation ?? { id: conversationId, messages: [] }),
        id: conversationId,
        messages: this.sortMessages([...previousMessages, optimisticMessage])
      } as Conversation;
      this.changeDetector.markForCheck();
      this.scrollToBottom();

      console.log('postMessage', conversationId);
      console.log('send API call started');
      const responseConversation = await firstValueFrom(
        this.conversationService.sendMessage(conversationId, content)
      );
      console.log('response', responseConversation);

      const response = this.normalizeConversation(responseConversation, conversationId);
      if (!response) throw new Error('Conversation response ID invalide');
      this.conversation = {
        ...response,
        messages: this.mergeResponseMessages(response.messages, optimisticMessage)
      };
      this.showSourcesPanel.set(this.allAggregatedSources().length > 0);
      this.changeDetector.markForCheck();
      if (navigateAfterSend) {
        void this.router.navigate(['/chat', conversationId], { replaceUrl: true });
      }
    } catch {
      this.conversation = this.conversation
        ? { ...this.conversation, messages: previousMessages }
        : undefined;
      this.draftMessage = originalDraft;
      this.errorMessage = "Impossible d'envoyer le message. Verifiez la connexion.";
      this.changeDetector.markForCheck();
    } finally {
      this.isSending = false;
      this.changeDetector.markForCheck();
      this.scrollToBottom();
    }
  }

  private normalizeConversation(conversation: Conversation, expectedId: string): Conversation | undefined {
    if (!conversation || conversation.id !== expectedId) return undefined;
    return {
      ...conversation,
      messages: this.sortMessages((conversation.messages ?? []).filter((message) =>
        !message.conversationId || message.conversationId === expectedId
      ))
    };
  }

  private mergeResponseMessages(response: Message[], optimistic?: Message): Message[] {
    const messages = response.filter((message) => message.id !== optimistic?.id);
    if (optimistic && !messages.some((message) => message.role === 'USER' && message.content === optimistic.content)) {
      messages.push(optimistic);
    }
    return this.sortMessages(messages);
  }

  private sortMessages(messages: Message[]): Message[] {
    return messages
      .map((message, index) => ({ message, index }))
      .sort((left, right) => {
        const leftTime = this.messageTime(left.message);
        const rightTime = this.messageTime(right.message);
        if (leftTime === rightTime) return left.index - right.index;
        if (leftTime === null) return 1;
        if (rightTime === null) return -1;
        return leftTime - rightTime;
      })
      .map(({ message }) => message);
  }

  private messageTime(message: Message): number | null {
    const value = message.createdAt;
    if (value === undefined || value === null || value === '') return null;
    const epoch = typeof value === 'number' || /^\d+$/.test(String(value)) ? Number(value) : undefined;
    const date = epoch === undefined
      ? new Date(String(value))
      : new Date(epoch < 100000000000 ? epoch * 1000 : epoch);
    const time = date.getTime();
    return Number.isNaN(time) ? null : time;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  retryLastAction(): void {
    if (this.conversationIdFromRoute) {
      this.loadConversation(this.conversationIdFromRoute);
    }
  }
}
