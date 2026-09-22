import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CATEGORY_LABELS,
  Conversation,
  EscalationCategory,
  EscalationPriority,
  PrepareEscalationResponse,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from '../../../models';
import { ConversationService } from '../../../core/services/conversation.service';
import { EscalationService } from '../../../core/services/escalation.service';

@Component({
  selector: 'app-escalation-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page-shell escalation-page">
      <header class="page-header">
        <div class="breadcrumb" aria-label="Fil d'Ariane">
          <a routerLink="/chat">Chat</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Escalade</span>
        </div>
        <div class="header-row">
          <div>
            <p class="eyebrow">Support humain</p>
            <h1 class="page-title">Escalade vers le support</h1>
            <p class="page-subtitle">
              Vérifiez les informations préparées par l'assistant avant de transmettre votre demande.
            </p>
          </div>
          <ol class="steps" aria-label="Progression de l'escalade">
            <li class="step complete"><span>1</span><strong>Analyse IA</strong></li>
            <li class="step current" aria-current="step"><span>2</span><strong>Vérification</strong></li>
            <li class="step"><span>3</span><strong>Envoi</strong></li>
          </ol>
        </div>
      </header>

      <div class="success-card section-card" *ngIf="confirmation" role="status">
        <div class="success-icon" aria-hidden="true">✓</div>
        <div class="success-content">
          <p class="eyebrow">Demande envoyée</p>
          <h2>Votre demande a bien été envoyée à l'équipe support</h2>
          <p class="success-copy">Le support humain va pouvoir reprendre votre conversation.</p>
          <dl class="request-details">
            <div *ngIf="createdRequestId"><dt>Référence</dt><dd>{{ createdRequestId }}</dd></div>
            <div *ngIf="createdTicketId"><dt>Ticket TicketFlow</dt><dd>{{ createdTicketId }}</dd></div>
          </dl>
          <p class="success-note" *ngIf="createdMessage">{{ createdMessage }}</p>
          <div class="success-actions">
            <a class="primary-button" routerLink="/historique">Voir mon ticket / Historique</a>
            <a class="secondary-button" [routerLink]="['/chat', conversation?.id]">Retour au chat</a>
          </div>
        </div>
      </div>

      <div class="content-layout" *ngIf="!confirmation">
        <form class="form-card section-card" (ngSubmit)="submit()" [attr.aria-busy]="analyzing">
          <div class="card-heading">
            <div>
              <p class="section-kicker">Votre demande</p>
              <h2>Préparer l'escalade</h2>
            </div>
            <span class="status-badge" [class.status-loading]="analyzing">
              <span class="status-dot" aria-hidden="true"></span>
              {{ analyzing ? 'Analyse en cours' : 'Prête à vérifier' }}
            </span>
          </div>

          <div class="grid">
            <div class="field-group">
              <div class="label-row">
                <label for="title">Titre de la demande <span class="required-mark" aria-hidden="true">*</span></label>
                <span class="counter">{{ title.length }}/160</span>
              </div>
              <textarea
                id="title"
                class="input-field title-field"
                name="title"
                rows="3"
                maxlength="160"
                [attr.aria-describedby]="'title-help title-error'"
                [disabled]="analyzing || !conversation"
                [(ngModel)]="title"
              ></textarea>
              <span id="title-help" class="helper-text">Un titre court qui résume votre besoin.</span>
              <span id="title-error" class="validation-error" *ngIf="!title.trim() && !analyzing">Le titre est requis.</span>
            </div>

            <div class="field-group summary-group">
              <div class="label-row">
                <div class="label-with-badge">
                  <label for="summary">Résumé généré automatiquement</label>
                  <span class="ai-badge"><span aria-hidden="true">✦</span> Généré par IA</span>
                  <span class="editable-chip">Modifiable</span>
                </div>
                <span class="counter">{{ summary.length }}/4000</span>
              </div>
              <textarea
                id="summary"
                class="textarea-field"
                name="summary"
                rows="10"
                maxlength="4000"
                [attr.aria-describedby]="'summary-help summary-error'"
                [disabled]="analyzing || !canEdit"
                [(ngModel)]="summary"
              ></textarea>
              <div class="field-footer">
                <span id="summary-help" class="helper-text">Relisez et ajustez les détails importants avant l'envoi.</span>
                <button type="button" class="ghost-button" (click)="retryAnalysis()" [disabled]="analyzing">
                  <span aria-hidden="true">↻</span> Régénérer le résumé
                </button>
              </div>
              <span id="summary-error" class="validation-error" *ngIf="summary.trim().length > 0 && summary.trim().length < 10 && !analyzing">
                Le résumé doit contenir au moins 10 caractères.
              </span>
            </div>

            <div class="field-skeletons" *ngIf="analyzing" aria-hidden="true">
              <div class="skeleton skeleton-title"></div>
              <div class="skeleton"></div>
              <div class="skeleton"></div>
              <div class="skeleton short"></div>
            </div>
          </div>

          <div class="analysis-error" *ngIf="!analyzing && analysisError" role="status">
            <span class="alert-icon" aria-hidden="true">!</span>
            <div class="alert-copy">
              <strong>Classification indisponible</strong>
              <span>{{ analysisError }}</span>
            </div>
            <button type="button" class="secondary-button inline-button" (click)="retryAnalysis()">
              Réessayer l'analyse
            </button>
          </div>

          <div class="actions">
            <a class="secondary-button" [routerLink]="['/chat', conversation?.id]">Retour au chat</a>
            <button
              class="primary-button submit-button"
              type="submit"
              [disabled]="!canSubmit || submitting"
              [attr.title]="!canSubmit ? 'Renseignez un titre et un résumé valides' : null"
            >
              <span class="button-spinner" *ngIf="submitting" aria-hidden="true"></span>
              {{ submitting ? 'Envoi en cours...' : 'Envoyer au support' }}
            </button>
          </div>
          <div class="blocking-error" *ngIf="submissionError" role="alert">
            {{ submissionError }}
          </div>
        </form>

        <aside class="classification-card section-card" aria-labelledby="classification-title">
          <div class="card-heading compact-heading">
            <div>
              <p class="section-kicker">Après transmission</p>
              <h2 id="classification-title">Classification</h2>
            </div>
            <span class="info-icon" title="La classification finale est déterminée par TicketFlow après l'envoi." aria-label="La classification finale est déterminée après l'envoi">i</span>
          </div>
          <div class="classification-status">
            <span class="status-dot" aria-hidden="true"></span>
            <span>Analyse IA <strong>{{ analyzing ? 'En cours' : 'Prête' }}</strong></span>
          </div>
          <div class="classification-list">
            <div class="classification-row">
              <div><span class="row-label">Catégorie</span><span class="row-hint">Déterminée automatiquement</span></div>
              <span class="readonly-chip category-chip" *ngIf="displayCategory; else afterSendFallback">{{ displayCategory }}</span>
            </div>
            <div class="classification-row">
              <div><span class="row-label">Priorité</span><span class="row-hint">Déterminée automatiquement</span></div>
              <span class="readonly-chip priority-chip" *ngIf="displayPriority; else afterSendFallback" [style.borderColor]="priorityColor" [style.color]="priorityColor">
                <span aria-hidden="true">◆</span> {{ displayPriority }}
              </span>
            </div>
          </div>
          <p class="classification-note">Ces informations seront finalisées par TicketFlow après l'envoi de votre demande.</p>
        </aside>
      </div>

      <ng-template #afterSendFallback>
        <span class="readonly-chip placeholder">En attente d'analyse</span>
      </ng-template>
    </section>
  `,
  styles: [
    `
      .escalation-page {
        display: grid;
        gap: 32px;
        padding: 32px 0 56px;
      }

      .page-header { display: grid; gap: 18px; }
      .breadcrumb { display: flex; gap: 8px; color: var(--text-muted); font-size: 0.82rem; }
      .breadcrumb a { color: var(--primary-600); text-decoration: none; font-weight: 600; }
      .header-row { display: flex; justify-content: space-between; align-items: end; gap: 28px; }
      .eyebrow, .section-kicker { margin: 0 0 6px; color: var(--primary-600); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
      .page-title { margin: 0; font-size: clamp(1.75rem, 3vw, 2rem); line-height: 1.15; }
      .page-subtitle { max-width: 620px; margin: 10px 0 0; color: var(--text-secondary); font-size: 0.98rem; line-height: 1.55; }
      .steps { display: flex; align-items: center; gap: 10px; margin: 0; padding: 0; list-style: none; white-space: nowrap; }
      .step { display: flex; align-items: center; gap: 7px; color: var(--text-muted); font-size: 0.78rem; }
      .step:not(:last-child)::after { content: ''; width: 24px; height: 1px; margin-left: 4px; background: var(--border-strong); }
      .step span { display: grid; place-items: center; width: 24px; height: 24px; border: 1px solid var(--border-strong); border-radius: 50%; font-weight: 800; }
      .step.current { color: var(--primary-600); }
      .step.current span, .step.complete span { border-color: var(--primary-500); background: var(--primary-100); color: var(--primary-700); }
      .content-layout { display: grid; grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr); align-items: start; gap: 24px; }
      .section-card { border: 1px solid var(--border-color); border-radius: 16px; background: var(--bg-card); box-shadow: 0 12px 32px color-mix(in srgb, var(--text-primary) 6%, transparent); }
      .form-card { display: grid; gap: 28px; padding: clamp(22px, 4vw, 36px); }
      .classification-card { position: sticky; top: 24px; display: grid; gap: 24px; padding: 24px; }
      .card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding-bottom: 20px; border-bottom: 1px solid var(--border-subtle); }
      .card-heading h2 { margin: 0; font-size: 1.2rem; }
      .compact-heading { padding-bottom: 0; border-bottom: 0; }
      .status-badge, .ai-badge, .editable-chip { display: inline-flex; align-items: center; gap: 7px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
      .status-badge { padding: 7px 10px; background: var(--primary-100); color: var(--primary-700); }
      .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--primary-500); }
      .status-loading .status-dot { animation: pulse 1.2s ease-in-out infinite; }
      .grid { display: grid; gap: 28px; }
      .field-group { display: grid; gap: 8px; }
      .label-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .label-with-badge { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
      label { color: var(--text-primary); font-size: 0.88rem; font-weight: 700; }
      .required-mark { color: var(--danger); }
      .counter { color: var(--text-muted); font-family: inherit; font-size: 0.75rem; }
      .input-field, .textarea-field { width: 100%; box-sizing: border-box; border: 1px solid var(--border-strong); border-radius: 12px; background: var(--bg-surface); color: var(--text-primary); font: inherit; font-size: 0.96rem; line-height: 1.55; outline: none; resize: vertical; transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease; }
      .input-field { min-height: 76px; padding: 12px 14px; }
      .textarea-field { min-height: 210px; padding: 14px 16px; }
      .input-field:focus, .textarea-field:focus { border-color: var(--primary-500); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-500) 20%, transparent); }
      .input-field:disabled, .textarea-field:disabled { opacity: 0.68; background: var(--bg-muted); cursor: wait; }
      .helper-text, .row-hint { color: var(--text-muted); font-size: 0.78rem; line-height: 1.45; }
      .field-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .ai-badge { padding: 5px 8px; background: var(--primary-100); color: var(--primary-700); }
      .editable-chip { padding: 5px 8px; border: 1px solid var(--border-subtle); color: var(--text-muted); }
      .ghost-button, .secondary-button, .primary-button { min-height: 44px; border-radius: 11px; padding: 0 16px; font: inherit; font-size: 0.88rem; font-weight: 700; text-decoration: none; cursor: pointer; transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease; }
      .ghost-button { min-height: 32px; padding: 0 8px; border: 0; background: transparent; color: var(--primary-600); }
      .ghost-button:hover, .ghost-button:focus-visible { background: var(--primary-100); }
      .secondary-button { display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--border-strong); background: var(--bg-surface); color: var(--text-primary); }
      .secondary-button:hover, .secondary-button:focus-visible { border-color: var(--primary-500); color: var(--primary-700); }
      .primary-button { display: inline-flex; align-items: center; justify-content: center; gap: 9px; border: 1px solid var(--primary-600); background: var(--primary-600); color: var(--surface); box-shadow: 0 8px 18px color-mix(in srgb, var(--primary-600) 22%, transparent); }
      .primary-button:hover:not(:disabled) { background: var(--primary-700); transform: translateY(-1px); }
      .primary-button:disabled, .secondary-button:disabled, .ghost-button:disabled { opacity: 0.48; cursor: not-allowed; box-shadow: none; }
      .primary-button:focus-visible, .secondary-button:focus-visible, .ghost-button:focus-visible { outline: 3px solid color-mix(in srgb, var(--primary-500) 35%, transparent); outline-offset: 2px; }
      .actions { display: flex; justify-content: flex-end; align-items: center; gap: 12px; padding-top: 20px; border-top: 1px solid var(--border-subtle); }
      .submit-button { min-width: 180px; }
      .button-spinner { width: 15px; height: 15px; border: 2px solid color-mix(in srgb, var(--surface) 45%, transparent); border-top-color: var(--surface); border-radius: 50%; animation: spin 800ms linear infinite; }
      .analysis-error { display: flex; align-items: center; gap: 12px; padding: 13px 14px; border: 1px solid color-mix(in srgb, var(--warning) 35%, var(--border-color)); border-radius: 12px; background: color-mix(in srgb, var(--warning) 10%, var(--bg-card)); }
      .alert-icon { display: grid; place-items: center; flex: 0 0 24px; width: 24px; height: 24px; border-radius: 50%; background: color-mix(in srgb, var(--warning) 18%, var(--bg-card)); color: var(--warning); font-weight: 800; }
      .alert-copy { display: grid; gap: 2px; min-width: 0; color: var(--text-secondary); font-size: 0.78rem; }
      .alert-copy strong { color: var(--text-primary); font-size: 0.85rem; }
      .inline-button { flex-shrink: 0; min-height: 34px; padding: 0 10px; font-size: 0.78rem; }
      .blocking-error { padding: 11px 13px; border: 1px solid color-mix(in srgb, var(--danger) 35%, var(--border-color)); border-radius: 10px; background: color-mix(in srgb, var(--danger) 9%, var(--bg-card)); color: var(--danger); font-size: 0.82rem; }
      .validation-error { color: var(--danger); font-size: 0.78rem; }
      .field-skeletons { display: grid; gap: 10px; padding: 14px; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--bg-muted); }
      .skeleton { width: 100%; height: 12px; border-radius: 6px; background: linear-gradient(90deg, var(--border-subtle), var(--bg-card), var(--border-subtle)); background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite; }
      .skeleton-title { width: 32%; }
      .skeleton.short { width: 62%; }
      .classification-status { display: flex; align-items: center; gap: 9px; padding: 12px; border-radius: 11px; background: var(--bg-muted); color: var(--text-secondary); font-size: 0.82rem; }
      .classification-status strong { color: var(--text-primary); }
      .classification-list { display: grid; gap: 16px; }
      .classification-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid var(--border-subtle); }
      .classification-row > div { display: grid; gap: 4px; }
      .row-label { color: var(--text-primary); font-size: 0.88rem; font-weight: 700; }
      .readonly-chip { display: inline-flex; align-items: center; gap: 6px; max-width: 150px; padding: 7px 10px; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--bg-muted); color: var(--text-secondary); font-size: 0.76rem; font-weight: 700; text-align: right; }
      .readonly-chip.category-chip { border-color: var(--primary-300); background: var(--primary-100); color: var(--primary-700); }
      .readonly-chip.placeholder { font-weight: 500; }
      .classification-note { margin: 0; color: var(--text-muted); font-size: 0.78rem; line-height: 1.5; }
      .info-icon { display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid var(--border-strong); border-radius: 50%; color: var(--text-muted); font-size: 0.75rem; cursor: help; }
      .success-card { display: flex; gap: 18px; max-width: 780px; padding: clamp(24px, 5vw, 42px); border-color: color-mix(in srgb, var(--primary-500) 35%, var(--border-color)); }
      .success-icon { display: grid; place-items: center; flex: 0 0 44px; width: 44px; height: 44px; border-radius: 50%; background: var(--primary-100); color: var(--primary-700); font-size: 1.5rem; font-weight: 800; }
      .success-content { display: grid; gap: 12px; }
      .success-card h2 { margin: 0; font-size: 1.35rem; }
      .success-copy, .success-note { margin: 0; color: var(--text-secondary); }
      .request-details { display: flex; flex-wrap: wrap; gap: 20px; margin: 8px 0; }
      .request-details div { display: grid; gap: 3px; }
      .request-details dt { color: var(--text-muted); font-size: 0.75rem; }
      .request-details dd { margin: 0; color: var(--text-primary); font-weight: 700; overflow-wrap: anywhere; }
      @keyframes shimmer { to { background-position: -200% 0; } }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 50% { opacity: 0.35; } }
      @media (max-width: 800px) {
        .header-row { align-items: flex-start; flex-direction: column; }
        .content-layout { grid-template-columns: 1fr; }
        .classification-card { position: static; }
        .actions { position: sticky; bottom: 0; z-index: 2; margin: 0 -22px -22px; padding: 14px 22px; background: color-mix(in srgb, var(--bg-card) 94%, transparent); backdrop-filter: blur(12px); }
      }
      @media (max-width: 520px) {
        .escalation-page { gap: 22px; padding-top: 22px; }
        .steps { width: 100%; justify-content: space-between; }
        .step:not(:last-child)::after { width: 12px; }
        .form-card, .classification-card { padding: 20px; }
        .field-footer, .analysis-error, .actions { align-items: stretch; flex-direction: column; }
        .actions > * { width: 100%; }
        .inline-button, .submit-button { width: 100%; }
        .classification-row { align-items: flex-start; flex-direction: column; }
        .readonly-chip { max-width: 100%; text-align: left; }
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
      }
    `,
  ],
})
export class EscalationPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly conversationService = inject(ConversationService);
  private readonly escalationService = inject(EscalationService);

  conversation?: Conversation;
  title = '';
  summary = '';
  categoryId: string | null = null;
  priority: EscalationPriority | null = null;
  aiCategory: EscalationCategory | null = null;

  analyzing = false;
  analysisError: string | null = null;
  analysis: PrepareEscalationResponse | null = null;

  confirmation = false;
  submitting = false;
  submissionError: string | null = null;
  createdRequestId: string | null = null;
  createdTicketId: string | null = null;
  createdMessage: string | null = null;

  get canEdit(): boolean {
    return !!this.conversation && !this.analyzing;
  }

  get canSubmit(): boolean {
    if (!this.conversation) return false;
    if (!this.title.trim()) return false;
    if (!this.summary.trim()) return false;
    if (this.analyzing) return false;
    if (this.submitting) return false;
    return true;
  }

  get displayCategory(): string | null {
    if (!this.analysis?.category) return null;
    return (
      CATEGORY_LABELS[this.analysis.category as EscalationCategory] ??
      this.analysis.category
    );
  }

  get displayPriority(): string | null {
    if (!this.analysis?.priority) return null;
    return (
      PRIORITY_LABELS[this.analysis.priority as EscalationPriority] ??
      this.analysis.priority
    );
  }

  get priorityColor(): string | null {
    if (!this.analysis?.priority) return null;
    return (
      PRIORITY_COLORS[this.analysis.priority as EscalationPriority] ??
      'var(--text-muted)'
    );
  }

  ngOnInit(): void {
    const conversationId = this.route.snapshot.paramMap.get('conversationId');
    console.log('[EscalationPage] conversationId:', conversationId);

    if (!conversationId) {
      this.analysisError = 'Identifiant de conversation manquant.';
      void this.router.navigate(['/historique']);
      return;
    }

    this.loadEscalationDraft(conversationId);
  }

  private loadEscalationDraft(conversationId: string): void {
    this.analyzing = true;
    this.analysisError = null;

    this.conversationService.getConversation(conversationId).subscribe({
      next: (conversation) => {
        this.conversation = conversation;
        this.title = conversation.title?.trim() || 'Demande de support';
        this.summary = this.buildSummary(conversation);
        console.log('[EscalationPage] conversation loaded:', conversation);
        this.runAnalysis(conversationId);
        this.changeDetector.markForCheck();
      },
      error: (error) => {
        console.error('[EscalationPage] conversation load failed:', error);
        this.analyzing = false;
        this.analysisError =
          'Impossible de charger la conversation. Vous pouvez saisir le titre et le résumé manuellement.';
        this.changeDetector.markForCheck();
      },
    });
  }

  retryAnalysis(): void {
    const conversationId = this.conversation?.id;
    if (!conversationId) return;
    this.analysisError = null;
    this.analysis = null;
    void this.runAnalysis(conversationId);
  }

  submit(): void {
    if (!this.canSubmit || !this.conversation) {
      return;
    }

    this.submissionError = null;
    this.confirmation = false;
    this.submitting = true;

    this.escalationService
      .createEscalation(this.conversation.id, {
        title: this.title.trim() || this.conversation.title || this.conversation.id,
        summary: this.summary.trim(),
        description: this.summary.trim(),
        conversationId: this.conversation.id,
        requestId: `CONV-${this.conversation.id}`,
        categoryId: this.analysis?.categoryId ?? undefined,
        priority: this.analysis?.priority ?? undefined,
      })
      .pipe(finalize(() => {
        this.submitting = false;
        this.changeDetector.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.confirmation = true;
          this.createdRequestId = response.requestId ?? null;
          this.createdTicketId = response.ticketId ?? null;
          this.createdMessage = response.message ?? null;
        },
        error: (err: unknown) => {
          const errorBody =
            err && typeof err === 'object' && 'error' in err
              ? (err as { error?: unknown }).error
              : null;
          const message =
            errorBody && typeof errorBody === 'object' && 'message' in errorBody &&
            typeof (errorBody as { message?: unknown }).message === 'string'
              ? (errorBody as { message: string }).message
              : err instanceof Error ? err.message : 'Erreur inconnue';
          this.submissionError = message;
        },
      });
  }

  private runAnalysis(conversationId: string): void {
    this.analyzing = true;
    this.analysisError = null;
    console.log('[EscalationPage] GET prepare escalation for conversationId:', conversationId);
    this.escalationService
      .prepareEscalation(conversationId)
      .pipe(finalize(() => {
        this.analyzing = false;
        this.changeDetector.markForCheck();
      }))
      .subscribe({
        next: (resp) => {
          console.log('[EscalationPage] prepare escalation response:', resp);
          this.handleAnalysisResponse(resp);
        },
        error: (err) => {
          console.error('[EscalationPage] prepare escalation failed:', err);
          this.handleAnalysisError(err);
        },
      });
  }

  private handleAnalysisResponse(resp: PrepareEscalationResponse): void {
    const responseKeys = Object.keys(resp as unknown as Record<string, unknown>);
    const responseTitle = resp.title?.trim() ?? '';
    const responseSummary =
      resp.summary?.trim() || resp.description?.trim() || resp.resume?.trim() || '';

    console.log('[EscalationPage] prepare response keys:', responseKeys);
    console.log('[EscalationPage] patched form values:', {
      title: responseTitle,
      summary: responseSummary,
    });

    if (responseTitle) {
      this.title = responseTitle;
    }
    if (responseSummary) {
      this.summary = responseSummary;
    }

    if (!resp.aiAnalysisSuccess) {
      this.analysis = resp;
      this.analysisError =
        resp.errorMessage ||
        "Impossible de determiner automatiquement la categorie et la priorite. Veuillez reessayer.";
      this.aiCategory = null;
      this.categoryId = null;
      this.priority = null;
      this.changeDetector.markForCheck();
      return;
    }

    this.analysis = resp;
    this.analysisError = resp.category
      ? null
      : 'Classification indisponible. Vous pouvez modifier le titre et le résumé puis envoyer la demande.';
    this.aiCategory = resp.category;
    this.categoryId = resp.categoryId;
    this.priority = resp.priority;
    this.changeDetector.markForCheck();
  }

  private handleAnalysisError(err: unknown): void {
    this.analyzing = false;
    if (
      err &&
      typeof err === 'object' &&
      'aiAnalysisSuccess' in err &&
      typeof (err as PrepareEscalationResponse).errorMessage === 'string'
    ) {
      const resp = err as PrepareEscalationResponse;
      this.analysis = resp;
      this.analysisError =
        resp.errorMessage ||
        "Impossible de determiner automatiquement la categorie et la priorite. Veuillez reessayer.";
      return;
    }
    this.analysis = null;
    this.analysisError =
      "Impossible de determiner automatiquement la categorie et la priorite. Veuillez reessayer.";
    this.changeDetector.markForCheck();
  }

  private buildSummary(conversation: Conversation): string {
    const messages = conversation.messages
      .slice(-4)
      .map(
        (message) =>
          `${message.role === 'USER' ? 'Client' : 'Assistant'}: ${message.content}`,
      );

    return `Conversation: ${conversation.title || conversation.id}\n\n${messages.join('\n')}`;
  }
}
