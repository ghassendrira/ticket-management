import { Component, DestroyRef, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TicketService, TicketDetailResponse, TicketHistoryResponse, TicketStatus, Priority, Category } from '../../../../core/services/ticket.service';
import { AiService, SimilarTicketResponse } from '../../../../core/services/ai.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { UserService } from '../../../../core/services/user.service';
import { AuthService, UserResponse } from '../../../../core/services/auth.service';
import { AttachmentService, AttachmentResponse } from '../../../../core/services/attachment.service';
import { FileDropZoneComponent } from '../../../../shared/components/file-drop-zone/file-drop-zone.component';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { AssignmentService, AssignmentRecommendationResponse, AlternativeAgentResponse } from '../../../../core/services/assignment.service';
import { GeminiTranslationService } from '../../../../core/services/gemini-translation.service';

interface TranslationLanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  flag: string;
}

interface DescriptionTranslationState {
  text: string;
  language: TranslationLanguageOption;
}

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    AlertComponent,
    FileDropZoneComponent,
    RelativeTimePipe,
    TranslatePipe
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <button class="back-button" (click)="router.navigate(['/tickets'])">
          ← {{ 'APP.BACK' | translate }}
        </button>
        <h1 class="page-title">{{ ticket()?.title || ('LOADING' | translate) }}</h1>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>{{ 'LOADING' | translate }}...</p>
        </div>
      } @else if (errorMessage()) {
        <app-alert type="error" class="mb-4">{{ errorMessage() }}</app-alert>
      } @else if (ticket()) {
        <div class="ticket-detail-grid">
          <!-- Ticket Info Card -->
          <section class="card ticket-info-card">
            <div class="card-header">
              <h2 class="card-title">{{ 'TICKET DETAILS' | translate }}</h2>
              <div class="header-right">
                <div class="ticket-status-priority">
                  <span class="status-badge" [class]="ticket()!.status.toLowerCase()">
                    {{ getStatusLabel(ticket()!.status) }}
                  </span>
                  <span class="priority-badge" [class]="ticket()!.priority.toLowerCase()">
                    {{ getPriorityLabel(ticket()!.priority) }}
                  </span>
                </div>
                <span class="category-badge">
                  {{ getCategoryLabel(ticket()!.category) }}
                </span>
              </div>
            </div>

            <div class="ticket-meta">
              <div class="meta-item">
                <span class="meta-label">{{ 'TICKET REQUEST_ID' | translate }}</span>
                <span class="meta-value">{{ ticket()?.requestId || ticket()?.id?.substring(0, 8) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">{{ 'TICKET ASSIGNED_TO' | translate }}</span>
                <span class="meta-value">{{ ticket()?.assignedAgentName || ('TICKET UNASSIGNED' | translate) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">{{ 'TICKET CUSTOMER_ID' | translate }}</span>
                <span class="meta-value">{{ ticket()?.customerId || 'N/A' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">{{ 'TICKET CREATED_AT' | translate }}</span>
                <span class="meta-value">{{ formatDate(ticket()?.createdAt) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">{{ 'TICKET UPDATED_AT' | translate }}</span>
                <span class="meta-value">{{ formatDate(ticket()?.updatedAt) }}</span>
              </div>
            </div>

            <!-- Description with Qwen translation -->
            <div class="ticket-description">
              <div class="description-header">
                <h3>{{ 'TICKET DESCRIPTION' | translate }}</h3>
                @if (hasTranslatableDescription()) {
                  <div class="translation-menu-wrapper">
                    <app-button
                      variant="secondary"
                      size="sm"
                      (click)="toggleDescriptionTranslationMenu()"
                      [disabled]="isTranslatingDescription()">
                      {{ isTranslatingDescription() ? ('LOADING' | translate) : ('TRANSLATE' | translate) }} ▾
                    </app-button>

                    @if (descriptionTranslationMenuOpen()) {
                      <div class="translation-menu">
                        <p class="translation-menu-title">{{ 'TICKET.TRANSLATE_TO' | translate }}</p>
                        @for (language of descriptionTranslationLanguages; track language.code) {
                          <button
                            class="translation-menu-item"
                            type="button"
                            (click)="translateDescriptionTo(language)"
                            [disabled]="isTranslatingDescription()">
                            <span class="translation-menu-flag">{{ language.flag }}</span>
                            <span>{{ language.nativeLabel }}</span>
                          </button>
                        }
                      </div>
                    }
                  </div>
                }
              </div>

              @if (isTranslatingDescription() && translatingDescriptionTarget()) {
                <p class="translation-status">
                  {{ 'TICKET.TRANSLATING_TO' | translate:{ language: translatingDescriptionTarget()!.nativeLabel } }}
                </p>
              }

              <p>{{ translatedDescription()?.text || ticket()?.description || ('TICKET.NO_DESCRIPTION' | translate) }}</p>

              @if (translatedDescription(); as translation) {
                <div class="translation-meta">
                  <span class="translation-badge">✨ {{ 'TICKET.TRANSLATED_BY_QWEN' | translate }}</span>
                  <span class="translation-language">{{ translation.language.nativeLabel }}</span>
                  <button class="text-link" type="button" (click)="showOriginalDescription()">
                    {{ 'APP.SHOW_ORIGINAL' | translate }}
                  </button>
                </div>
              }

              @if (descriptionTranslationError()) {
                <app-alert type="error" class="mt-2">{{ descriptionTranslationError() }}</app-alert>
              }
            </div>

            <div class="ai-summary-section">
              <div class="section-header">
                <h3>{{ 'SUMMARY' | translate }}</h3>
                <app-button
                  variant="secondary"
                  (click)="regenerateSummary()"
                  [disabled]="aiSummaryLoading() || !canGenerateSummary()"
                >
                  {{ aiSummaryLoading() ? ('LOADING' | translate) : ('REGENERATE' | translate) }}
                </app-button>
              </div>

              @if (aiSummaryLoading()) {
                <div class="skeleton-block" aria-hidden="true">
                  <div class="skeleton-line"></div>
                  <div class="skeleton-line"></div>
                </div>
              } @else if (aiSummary()) {
                <p class="ai-summary-text" [class.expanded]="aiSummaryExpanded()">
                  {{ aiSummary() }}
                </p>

                @if (shouldShowSummaryToggle()) {
                  <button class="text-link" type="button" (click)="toggleSummaryExpanded()">
                    {{ aiSummaryExpanded() ? ('SHOW LESS' | translate) : ('SHOW MORE' | translate) }}
                  </button>
                }
              } @else if (aiSummaryUnavailable()) {
                <p class="inline-muted-message">{{ 'SUMMARY UNAVAILABLE' | translate }}</p>
              }
            </div>

            <div class="status-change-section">
              <h3>{{ 'CHANGE STATUS' | translate }}</h3>
              <div class="status-controls">
                <select class="form-control" [(ngModel)]="selectedStatus">
                  @for (status of possibleStatuses; track status) {
                    <option [value]="status" [disabled]="status === ticket()?.status">{{ getStatusLabel(status) }}</option>
                  }
                </select>
                <app-button (click)="handleChangeStatus()" [disabled]="selectedStatus() === ticket()?.status || changingStatus()">
                  {{ changingStatus() ? ('APP.UPDATING' | translate) : ('UPDATE STATUS' | translate) }}
                </app-button>
              </div>
              @if (selectedStatus() === 'RESOLVED') {
                <div class="resolution-summary-field">
                  <label class="meta-label" for="resolution-summary">{{ 'RESOLUTION SUMMARY' | translate }}</label>
                  <textarea
                    id="resolution-summary"
                    class="form-control resolution-summary-textarea"
                    rows="3"
                    [(ngModel)]="resolutionSummaryDraft"
                    [placeholder]="'RESOLUTION SUMMARY' | translate"
                  ></textarea>
                </div>
              }
              @if (statusError()) {
                <app-alert type="error" class="mt-2">{{ statusError() }}</app-alert>
              }
            </div>

            <!-- Escalation / Request Help -->
            @if (isAgent() && ticket()?.assignedAgentId === currentUserId()) {
              <div class="escalation-section">
                @if (latestEscalation()?.status === 'PENDING') {
                  <div class="escalation-status-panel pending">
                    <h3>
                      <span class="status-icon">⏳</span>
                      Help Request Pending
                    </h3>
                    <p class="escalation-status-desc">
                      Your help request is awaiting your team manager's review.
                    </p>
                    <div class="status-info-grid">
                      <div class="info-row">
                        <span class="info-label">Requested on:</span>
                        <span class="info-value">{{ formatDate(latestEscalation()!.createdAt) }}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Your reason:</span>
                        <span class="info-value reason">{{ latestEscalation()!.reason }}</span>
                      </div>
                    </div>
                    <p class="disabled-hint">You cannot request help again until this request is processed.</p>
                  </div>
                } @else if (latestEscalation()?.status === 'ACCEPTED') {
                  <div class="escalation-status-panel accepted">
                    <h3>
                      <span class="status-icon">✅</span>
                      Help Request Accepted
                    </h3>
                    <p class="escalation-status-desc">
                      Your manager has accepted the escalation request.
                    </p>
                    <div class="status-info-grid">
                      <div class="info-row">
                        <span class="info-label">Reason:</span>
                        <span class="info-value reason">{{ latestEscalation()!.reason }}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Processed on:</span>
                        <span class="info-value">{{ formatDate(latestEscalation()!.updatedAt) }}</span>
                      </div>
                    </div>
                    <p class="accepted-hint">The ticket status has been updated. Your manager will provide assistance shortly.</p>
                  </div>
                } @else if (latestEscalation()?.status === 'REJECTED') {
                  <div class="escalation-status-panel rejected">
                    <h3>
                      <span class="status-icon">❌</span>
                      Help Request Rejected
                    </h3>
                    <div class="status-info-grid">
                      <div class="info-row">
                        <span class="info-label">Manager's reason:</span>
                        <span class="info-value reason rejection-reason">{{ latestEscalation()!.managerResponseReason || 'No reason provided' }}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Your original reason:</span>
                        <span class="info-value reason">{{ latestEscalation()!.reason }}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Rejected on:</span>
                        <span class="info-value">{{ formatDate(latestEscalation()!.updatedAt) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="escalation-new-request">
                    <h4>Submit a new request?</h4>
                    <p class="escalation-hint">You can submit a new help request with additional context.</p>
                  </div>
                  <div class="escalation-controls">
                    <textarea
                      class="form-control escalation-textarea"
                      rows="2"
                      [(ngModel)]="escalationReason"
                      placeholder="e.g., Requires database administrator or additional permissions"
                    ></textarea>
                    <app-button
                      variant="secondary"
                      (click)="handleEscalation()"
                      [disabled]="!escalationReason().trim() || escalating()"
                    >
                      {{ escalating() ? 'Sending...' : 'Request Help Again' }}
                    </app-button>
                  </div>
                  @if (escalationError()) {
                    <app-alert type="error" class="mt-2">{{ escalationError() }}</app-alert>
                  }
                  @if (escalationSuccess()) {
                    <app-alert type="success" class="mt-2">{{ escalationSuccess() }}</app-alert>
                  }
                } @else {
                  <h3>Request Help</h3>
                  <p class="escalation-hint">Can't solve this ticket? Request help from your team manager.</p>
                  <div class="escalation-controls">
                    <textarea
                      class="form-control escalation-textarea"
                      rows="2"
                      [(ngModel)]="escalationReason"
                      placeholder="e.g., Requires database administrator"
                    ></textarea>
                    <app-button
                      variant="secondary"
                      (click)="handleEscalation()"
                      [disabled]="!escalationReason().trim() || escalating()"
                    >
                      {{ escalating() ? 'Sending...' : 'Request Help' }}
                    </app-button>
                  </div>
                  @if (escalationError()) {
                    <app-alert type="error" class="mt-2">{{ escalationError() }}</app-alert>
                  }
                  @if (escalationSuccess()) {
                    <app-alert type="success" class="mt-2">{{ escalationSuccess() }}</app-alert>
                  }
                }
              </div>
            }

            @if (isManager() && pendingEscalation()) {
              <div class="manager-escalation-panel">
                <h3>{{ 'TICKET.ESCALATION.TITLE' | translate }}</h3>
                <p><strong>{{ 'TICKET.ESCALATION.AGENT' | translate }}:</strong> {{ pendingEscalation().requestedByAgentName || pendingEscalation().requestedByAgentId }}</p>
                <p><strong>{{ 'TICKET.ESCALATION.REASON' | translate }}:</strong> {{ pendingEscalation().reason }}</p>
                <div class="manager-actions">
                  <app-button variant="primary" (click)="handleAcceptEscalation()" [disabled]="managerActionLoading()">{{ 'TICKET.ESCALATION.ACCEPT' | translate }}</app-button>
                  <app-button variant="secondary" (click)="loadReassignCandidates()" [disabled]="managerActionLoading()">{{ 'TICKET.ESCALATION.REASSIGN' | translate }}</app-button>
                  <div class="reject-inline">
                    <textarea class="form-control" rows="2" [(ngModel)]="rejectReason" placeholder="Rejection reason"></textarea>
                    <app-button variant="secondary" (click)="handleRejectEscalation()" [disabled]="managerActionLoading() || !rejectReason().trim()">{{ 'TICKET.ESCALATION.REJECT' | translate }}</app-button>
                  </div>
                </div>
                @if (managerActionError()) {
                  <app-alert type="error" class="mt-2">{{ managerActionError() }}</app-alert>
                }
                @if (reassignCandidates().length > 0) {
                  <div class="reassign-list">
                    <select class="form-control" [(ngModel)]="reassignSelectedAgentId">
                      @for (a of reassignCandidates(); track a.userId) {
                        <option [value]="a.userId">{{ a.fullName }}</option>
                      }
                    </select>
                    <app-button (click)="handleReassignEscalation()" [disabled]="!reassignSelectedAgentId() || managerActionLoading()">Reassign</app-button>
                  </div>
                }
                @if (managerActionSuccess()) {
                  <app-alert type="success" class="mt-2">{{ managerActionSuccess() }}</app-alert>
                }
              </div>
            }

            <!-- Assignment Recommendation -->
            @if (ticket()?.status === 'NEW' || ticket()?.status === 'ASSIGNED') {
              <div class="recommendation-section">
                <h3>{{ 'ASSIGNMENT ECOMMENDATION' | translate }}</h3>
                
                @if (!isAgent() && !recommendation() && !recommendationLoading()) {
                  <app-button (click)="loadRecommendation()">{{ 'SUGGEST BEST AGENT' | translate }}</app-button>
                }
                
                @if (recommendationLoading()) {
                  <div class="loading-container">
                    <div class="spinner"></div>
                    <span>{{ 'TICKET.ANALYZING' | translate }}</span>
                  </div>
                }
                
                @if (recommendationError()) {
                  <div class="error-message">
                    {{ recommendationError() }}
                  </div>
                }
                
                @if (assignError()) {
                  <app-alert type="error" class="mt-2">{{ assignError() }}</app-alert>
                }
                
                @if (recommendation(); as rec) {
                  <div class="recommendation-card">
                    <div class="recommended-agent-header">
                      <div class="agent-avatar">
                        {{ getRecommendedAgentName().charAt(0) }}
                      </div>
                      <div class="agent-info">
                        <h4>{{ getRecommendedAgentName() }}</h4>
                        <div class="score-badge">
                          <span class="score-value">{{ rec.score }}</span>
                          <span class="score-label">/ 100</span>
                        </div>
                      </div>
                    </div>
                    
                    <div class="factors-breakdown">
                      <h5>{{ 'TICKET.SCORING_BREAKDOWN' | translate }}</h5>
                      @for (factor of rec.factors; track factor.criterion) {
                        <div class="factor-row">
                          <div class="factor-label">
                            <span>{{ factor.criterion }}</span>
                            <span class="weight">({{ factor.weight }}%)</span>
                          </div>
                          <div class="factor-bar-container">
                            <div class="factor-bar" 
                                 [style.width.%]="getScorePercentage(factor.contribution, factor.weight)"
                                 [class.high]="getScorePercentage(factor.contribution, factor.weight) >= 80"
                                 [class.medium]="getScorePercentage(factor.contribution, factor.weight) >= 50 && getScorePercentage(factor.contribution, factor.weight) < 80"
                                 [class.low]="getScorePercentage(factor.contribution, factor.weight) < 50">
                            </div>
                            <span class="factor-score">{{ factor.contribution }}/{{ factor.weight }}</span>
                          </div>
                        </div>
                      }
                    </div>
                    
                    <div class="recommendation-actions">
                      <app-button variant="primary" (click)="acceptRecommendation()" [disabled]="assigningTicket()">
                        {{ assigningTicket() ? ('APP.ASSIGNING' | translate) : ('TICKET.ASSIGN_TO' | translate) + ' ' + getRecommendedAgentName() }}
                      </app-button>
                      
                      @if (rec.alternatives && rec.alternatives.length > 0) {
                        <app-button variant="secondary" (click)="toggleAlternatives()" [disabled]="assigningTicket()">
                          {{ showAlternatives() ? ('APP.HIDE' | translate) : ('APP.SHOW' | translate) }} {{ 'TICKET.ALTERNATIVE_AGENTS' | translate }}
                        </app-button>
                      }
                    </div>
                    
                    @if (showAlternatives()) {
                      <div class="alternatives-section">
                        <h5>{{ 'TICKET.ALTERNATIVE_AGENTS' | translate }}</h5>
                        @for (alt of rec.alternatives; track alt.agentId) {
                          <button
                            class="alternative-row"
                            type="button"
                            [disabled]="assigningTicket()"
                            (click)="assignAlternativeAgent(alt)"
                          >
                            <span class="alt-name">{{ getAlternativeAgentName(alt) }}</span>
                            <div class="alt-score-bar">
                              <div class="alt-bar" [style.width.%]="alt.score"></div>
                            </div>
                            <span class="alt-score">{{ alt.score }}</span>
                          </button>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }

          </section>

          <!-- Attachments Card -->
          <section class="card attachments-card">
            <div class="card-header">
              <h2 class="card-title">{{ 'TICKET ATTACHMENTS' | translate }} ({{ attachments().length }})</h2>
            </div>

            <app-file-drop-zone
              [files]="stagedAttachmentFiles()"
              (filesChange)="onAttachmentFilesChange($event)"
            ></app-file-drop-zone>

            @if (attachmentError()) {
              <app-alert type="error" class="mt-3">{{ attachmentError() }}</app-alert>
            }
            @if (uploadProgressText()) {
              <app-alert type="success" class="mt-3">{{ uploadProgressText() }}</app-alert>
            }

            <div class="attachments-list mt-3">
              @for (attachment of attachments(); track attachment.id) {
                <div class="attachment-item">
                  <div class="attachment-icon">{{ getFileIcon(attachment.fileType) }}</div>
                  <div class="attachment-info">
                    <div class="attachment-name">{{ attachment.fileName }}</div>
                    <div class="attachment-meta">
                      <span>{{ 'TICKET.UPLOADED' | translate }} {{ attachment.uploadedAt | relativeTime }} {{ 'TICKET.BY' | translate }} {{ attachment.uploadedByName }}</span>
                      <span class="attachment-size">{{ formatFileSize(attachment.fileSize) }}</span>
                    </div>
                  </div>
                  <div class="attachment-actions">
                    @if (isImage(attachment.fileType)) {
                      <button class="action-button" (click)="openPreview(attachment)" aria-label="Preview">👁️</button>
                    }
                    <button class="action-button" (click)="handleDownloadAttachment(attachment)" aria-label="Download">⬇️</button>
                    @if (canDeleteAttachment(attachment)) {
                      <button class="action-button delete-button" (click)="handleDeleteAttachment(attachment)" aria-label="Delete">🗑️</button>
                    }
                  </div>
                </div>
              } @empty {
                <p class="empty-state">{{ 'TICKET.NO_ATTACHMENTS' | translate }}</p>
              }
            </div>
          </section>

          <!-- Comments Card -->
          <section class="card comments-card">
            <div class="card-header">
              <h2 class="card-title">{{ 'TICKET.COMMENTS' | translate }} ({{ ticket()?.comments?.length }})</h2>
            </div>
            <div class="add-comment-section">
              @if (suggestionDisplayState() === 'loading') {
                <div class="ai-suggestion-skeleton" aria-hidden="true">
                  <div class="skeleton-block">
                    <div class="skeleton-card-line"></div>
                    <div class="skeleton-card-line short"></div>
                    <div class="skeleton-card-line"></div>
                  </div>
                </div>
              } @else if (suggestionDisplayState() === 'card' && suggestedReply()) {
                <div class="ai-suggestion-card">
                  <div class="ai-suggestion-header">
                    <h3>{{ 'AI.SUGGESTED_REPLY' | translate }}</h3>
                  </div>
                  <p class="ai-suggestion-text">{{ suggestedReply() }}</p>
                  <div class="suggestion-actions">
                    <app-button variant="primary" (click)="applySuggestedReply(false)">
                      {{ 'AI.USE_RESPONSE' | translate }}
                    </app-button>
                    <app-button variant="secondary" (click)="applySuggestedReply(true)">
                      {{ 'AI.EDIT_FIRST' | translate }}
                    </app-button>
                    <button class="text-link dismiss-suggestion-button" type="button" (click)="dismissSuggestedReply()">
                      {{ 'AI.DISMISS' | translate }}
                    </button>
                  </div>
                </div>
              } @else if (suggestionDisplayState() === 'chip') {
                <button class="suggestion-chip" type="button" (click)="handleSuggestionChipClick()">
                  {{ getSuggestionChipLabelKey() | translate }}
                </button>
              } @else {
                <app-button class="suggest-ai-button" variant="secondary" type="button" (click)="requestSuggestedReply()">
                  {{ 'SUGGEST REPLY' | translate }}
                </app-button>
              }

              <textarea
                #commentTextarea
                class="form-control"
                [placeholder]="'TICKET.ADD_COMMENT_PLACEHOLDER' | translate"
                rows="3"
                [(ngModel)]="newCommentContent"
                (ngModelChange)="handleCommentInputChange($event)"
              ></textarea>
              <div class="comment-controls">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="newCommentIsInternal">
                  {{ 'TICKET.INTERNAL_COMMENT' | translate }}
                </label>
                <app-button (click)="handleAddComment()" [disabled]="!newCommentContent().trim() || addingComment()">
                  {{ addingComment() ? ('APP.ADDING' | translate) : ('TICKET.ADD_COMMENT' | translate) }}
                </app-button>
              </div>
            </div>
            @if (commentError()) {
              <app-alert type="error" class="mt-2">{{ commentError() }}</app-alert>
            }
            <div class="comments-list">
              @for (comment of ticket()?.comments; track comment.id) {
                <div class="comment-item">
                  <div class="comment-header">
                    <span class="comment-author">{{ comment.authorName }}</span>
                    <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                    @if (comment.isInternal) {
                      <span class="internal-badge">{{ 'TICKET.INTERNAL' | translate }}</span>
                    }
                  </div>
                  <div class="comment-content">
                    {{ translatedComments().get(comment.id) || comment.content }}
                  </div>
                  @if (translatedComments().has(comment.id)) {
                    <span class="gemini-badge">✨ {{ 'TICKET.TRANSLATED_BY_GEMINI' | translate }}</span>
                    <button class="text-link" (click)="showOriginalComment(comment.id)">
                      {{ 'APP.SHOW_ORIGINAL' | translate }}
                    </button>
                  } @else {
                    <button class="text-link"
                      (click)="translateComment(comment.id, comment.content)"
                      [disabled]="isTranslatingComment() === comment.id">
                      {{ isTranslatingComment() === comment.id ? '...' : ('TRANSLATE' | translate) }}
                    </button>
                  }
                </div>
              } @empty {
                <p class="empty-state">{{ 'NO COMMENTS' | translate }}</p>
              }
            </div>
          </section>

          <!-- History Card -->
          <section class="card history-card">
            <div class="card-header">
              <h2 class="card-title">{{ 'TICKET HISTORY' | translate }}</h2>
            </div>
            <div class="history-list">
              @for (entry of sortedHistory(); track entry.id) {
                <div class="history-item">
                  <div class="history-meta">
                    <span class="history-user">{{ entry.actorName || entry.changedByName }}</span>
                    <span class="history-date">{{ formatDate(entry.changedAt) }}</span>
                  </div>
                  @if (entry.eventType === 'STATUS_CHANGED' || (entry.oldStatus && entry.newStatus)) {
                    <div class="history-change">
                      <span class="status-badge" [class]="entry.oldStatus.toLowerCase()">
                        {{ getStatusLabel(entry.oldStatus) }}
                      </span>
                      →
                      <span class="status-badge" [class]="entry.newStatus.toLowerCase()">
                        {{ getStatusLabel(entry.newStatus) }}
                      </span>
                    </div>
                    @if (entry.message) {
                      <div class="history-message">{{ entry.message }}</div>
                    }
                  } @else {
                    <div class="history-change">
                      <span class="history-event-label">{{ getHistoryEventLabel(entry) }}</span>
                      <div class="event-message">{{ entry.message || getHistoryEventLabel(entry) }}</div>
                      @if (entry.reason) {
                        <div class="event-reason">{{ entry.reason }}</div>
                      }
                    </div>
                  }
                </div>
              } @empty {
                <p class="empty-state">{{ 'TICKET.NO_HISTORY' | translate }}</p>
              }
            </div>
          </section>

          <section class="card similar-tickets-card">
            <div class="card-header">
              <h2 class="card-title">{{ 'SIMILAR TICKETS' | translate }}</h2>
            </div>

            @if (similarTicketsLoading()) {
              <div class="skeleton-block" aria-hidden="true">
                <div class="skeleton-card-line"></div>
                <div class="skeleton-card-line short"></div>
                <div class="skeleton-card-line"></div>
                <div class="skeleton-card-line short"></div>
              </div>
            } @else if (similarTickets().length > 0) {
              <div class="similar-tickets-list">
                @for (item of similarTickets(); track item.ticketId) {
                  <button class="similar-ticket-item" type="button" (click)="openSimilarTicket(item.ticketId)">
                    <div class="similar-ticket-header">
                      <span class="similar-ticket-id">#{{ getShortTicketId(item.ticketId) }}</span>
                      <span class="similarity-badge">{{ formatSimilarity(item.similarityScore) }}</span>
                    </div>
                    <p class="similar-ticket-summary">{{ item.resolutionSummary }}</p>
                  </button>
                }
              </div>
            } @else {
              <p class="empty-state">{{ 'AI.NO_SIMILAR_FOUND' | translate }}</p>
            }
          </section>
        </div>

        <!-- Image Preview Modal -->
        @if (previewAttachment()) {
          <div class="preview-overlay" (click)="closePreview()">
            <div class="preview-modal" (click)="$event.stopPropagation()">
              <div class="preview-header">
                <span class="preview-title">{{ previewAttachment()!.fileName }}</span>
                <button class="preview-close" (click)="closePreview()">✕</button>
              </div>
              <div class="preview-body">
                @if (previewLoading()) {
                  <div class="preview-loading">
                    <div class="loading-spinner"></div>
                    <p>{{ 'LOADING' | translate }}...</p>
                  </div>
                } @else if (previewUrl()) {
                  <img [src]="previewUrl()!" [alt]="previewAttachment()!.fileName" class="preview-image">
                }
              </div>
              <div class="preview-footer">
                <app-button (click)="handleDownloadAttachment(previewAttachment()!)">⬇️ {{ 'TICKET.DOWNLOAD' | translate }}</app-button>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
    }
    .page-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .back-button {
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      color: var(--text-primary);
    }
    .back-button:hover {
      background: var(--border);
    }
    .page-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2rem;
      color: var(--text-primary);
      margin: 0;
      flex: 1;
    }
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 0;
    }
    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid var(--border);
      border-top-color: var(--accent-violet);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .ticket-detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .ticket-info-card, .attachments-card {
      grid-column: 1 / -1;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 1.5rem;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .header-right {
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    .card-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }
    .ticket-status-priority {
      display: flex;
      gap: 0.75rem;
    }
    .status-badge, .priority-badge, .category-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .status-badge.new {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }
    .status-badge.assigned {
      background: rgba(96, 165, 250, 0.1);
      color: #60a5fa;
    }
    .status-badge.in_progress {
      background: rgba(139, 92, 246, 0.1);
      color: #8b5cf6;
    }
    .status-badge.pending {
      background: rgba(250, 204, 21, 0.1);
      color: #facc15;
    }
    .status-badge.resolved {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }
    .status-badge.closed {
      background: rgba(107, 114, 128, 0.1);
      color: #6b7280;
    }
    .status-badge.reopened {
      background: rgba(249, 115, 22, 0.1);
      color: #f97316;
    }
    .status-badge.cancelled {
      background: rgba(156, 163, 175, 0.1);
      color: #9ca3af;
    }
    .priority-badge.low {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }
    .priority-badge.medium {
      background: rgba(234, 179, 8, 0.1);
      color: #eab308;
    }
    .priority-badge.high {
      background: rgba(249, 115, 22, 0.1);
      color: #f97316;
    }
    .priority-badge.critical {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
    .category-badge {
      background: rgba(107, 114, 128, 0.1);
      color: #6b7280;
    }
    .ticket-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 1.5rem;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .meta-label {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-secondary);
    }
    .meta-value {
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-primary);
    }
    .description-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      gap: 0.75rem;
    }
    .ticket-description h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }
    .ticket-description p {
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .translation-menu-wrapper {
      position: relative;
      display: inline-flex;
    }
    .translation-menu {
      position: absolute;
      top: calc(100% + 0.5rem);
      inset-inline-end: 0;
      min-width: 220px;
      padding: 0.5rem;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.16);
      z-index: 20;
    }
    .translation-menu-title {
      margin: 0 0 0.375rem 0;
      padding: 0.375rem 0.5rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-align: start;
    }
    .translation-menu-item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem 0.8rem;
      border: none;
      border-radius: 12px;
      background: transparent;
      color: var(--text-primary);
      text-align: start;
      font: inherit;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .translation-menu-item:hover:not(:disabled) {
      background: var(--bg-secondary);
    }
    .translation-menu-item:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .translation-menu-flag {
      font-size: 1rem;
      line-height: 1;
    }
    .translation-status {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-style: italic;
    }
    .translation-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem 0.75rem;
      flex-wrap: wrap;
      margin-top: 0.5rem;
    }
    .translation-badge {
      display: inline-block;
      font-size: 0.75rem;
      color: #8b5cf6;
      font-style: italic;
    }
    .translation-language {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      background: rgba(139, 92, 246, 0.08);
      color: #7c3aed;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .ai-summary-section {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .section-header h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .ai-summary-text {
      margin: 0;
      color: var(--text-secondary);
      line-height: 1.6;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }
    .ai-summary-text.expanded {
      display: block;
      -webkit-line-clamp: unset;
      overflow: visible;
    }
    .inline-muted-message {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    .skeleton-block {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }
    .skeleton-line,
    .skeleton-card-line {
      height: 0.875rem;
      border-radius: 9999px;
      background: linear-gradient(
        90deg,
        rgba(148, 163, 184, 0.12) 0%,
        rgba(148, 163, 184, 0.24) 50%,
        rgba(148, 163, 184, 0.12) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    .skeleton-card-line.short {
      width: 65%;
    }
    .resolution-summary-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .resolution-summary-textarea {
      width: 100%;
      min-width: 100%;
      resize: vertical;
    }
    .gemini-badge {
      display: inline-block;
      font-size: 0.75rem;
      color: #8b5cf6;
      margin-top: 0.5rem;
      font-style: italic;
    }
    .text-link {
      background: none;
      border: none;
      color: var(--accent-violet);
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0;
      margin-top: 0.25rem;
      text-decoration: underline;
    }
    .text-link:hover {
      color: #7c3aed;
    }
    .status-change-section {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }
    .status-change-section h3, .assign-section h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 1rem;
    }
    .status-controls, .assign-controls {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .assign-section {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }
    .form-control {
      padding: 0.875rem 1rem;
      border-radius: 0.75rem;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-primary);
      font-size: 0.9375rem;
      outline: none;
      font-family: inherit;
      min-width: 200px;
    }
    .form-control:focus {
      border-color: var(--accent-violet);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }
    .mt-2 { margin-top: 0.5rem; }
    .mt-3 { margin-top: 1rem; }
    .mb-4 { margin-bottom: 1rem; }
    .add-comment-section {
      margin-bottom: 1.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .suggest-ai-button {
      display: inline-flex;
      margin-bottom: 0.75rem;
    }
    .ai-suggestion-skeleton {
      margin-bottom: 1rem;
      padding: 1rem;
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      background: rgba(148, 163, 184, 0.08);
    }
    .ai-suggestion-card {
      margin-bottom: 1rem;
      padding: 1rem;
      border-radius: 16px;
      border: 1px solid rgba(139, 92, 246, 0.18);
      background: rgba(139, 92, 246, 0.06);
    }
    .ai-suggestion-header h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1rem;
      color: var(--text-primary);
    }
    .ai-suggestion-text {
      margin: 0;
      color: var(--text-secondary);
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .suggestion-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    .dismiss-suggestion-button {
      margin-top: 0;
      align-self: center;
    }
    .suggestion-chip {
      display: inline-flex;
      align-items: center;
      margin-bottom: 0.75rem;
      padding: 0.4rem 0.75rem;
      border-radius: 9999px;
      border: 1px solid rgba(139, 92, 246, 0.2);
      background: rgba(139, 92, 246, 0.08);
      color: #7c3aed;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .suggestion-chip:hover {
      background: rgba(139, 92, 246, 0.12);
    }
    .add-comment-section textarea.form-control {
      width: 100%;
      resize: vertical;
      margin-bottom: 0.75rem;
    }
    .comment-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .checkbox-label {
      display: flex;
      gap: 0.5rem;
      cursor: pointer;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .comment-item {
      padding: 1rem;
      background: var(--bg-secondary);
      border-radius: 0.75rem;
    }
    .comment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .comment-author {
      font-weight: 600;
      color: var(--text-primary);
    }
    .comment-date {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
    .internal-badge {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      background: rgba(139, 92, 246, 0.1);
      color: #8b5cf6;
    }
    .comment-content {
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .attachments-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .attachment-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--bg-secondary);
      border-radius: 12px;
    }
    .attachment-icon {
      font-size: 1.75rem;
    }
    .attachment-info {
      flex: 1;
    }
    .attachment-name {
      font-weight: 500;
      color: var(--text-primary);
      font-size: 0.95rem;
    }
    .attachment-meta {
      display: flex;
      gap: 0.75rem;
      color: var(--text-secondary);
      font-size: 0.8rem;
      margin-top: 0.25rem;
    }
    .attachment-actions {
      display: flex;
      gap: 0.5rem;
    }
    .action-button {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem;
    }
    .delete-button:hover {
      color: #ef4444;
    }
    .history-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .similar-tickets-card {
      grid-column: 2;
    }
    .similar-tickets-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .similar-ticket-item {
      width: 100%;
      padding: 1rem;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--bg-secondary);
      text-align: left;
      cursor: pointer;
      transition: border-color 0.2s ease, transform 0.2s ease;
    }
    .similar-ticket-item:hover {
      border-color: rgba(139, 92, 246, 0.4);
      transform: translateY(-1px);
    }
    .similar-ticket-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }
    .similar-ticket-id {
      color: var(--text-primary);
      font-weight: 600;
    }
    .similarity-badge {
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      background: rgba(34, 197, 94, 0.12);
      color: #16a34a;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .similar-ticket-summary {
      margin: 0;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .history-item {
      padding: 1rem;
      background: var(--bg-secondary);
      border-radius: 0.75rem;
    }
    .history-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .history-user {
      font-weight: 600;
      color: var(--text-primary);
    }
    .history-date {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
    .history-change {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }
    .history-event-label {
      display: inline-flex;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      background: rgba(102, 126, 234, 0.12);
      color: #4338ca;
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      text-transform: uppercase;
      width: fit-content;
    }
    .history-message,
    .event-message {
      color: var(--text-secondary);
      line-height: 1.5;
      font-size: 0.95rem;
    }
    .event-reason {
      color: var(--text-primary);
      font-style: italic;
    }
    .empty-state {
      text-align: center;
      color: var(--text-secondary);
      padding: 2rem 0;
    }
    .preview-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 2rem;
    }
    .preview-modal {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
    }
    .preview-title {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.95rem;
    }
    .preview-close {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: var(--text-secondary);
      padding: 0.25rem;
    }
    .preview-close:hover {
      color: var(--text-primary);
    }
    .preview-body {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      min-height: 200px;
    }
    .preview-image {
      max-width: 100%;
      max-height: 70vh;
      border-radius: 8px;
      object-fit: contain;
    }
    .preview-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
    }
    .preview-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      color: var(--text-secondary);
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @media (max-width: 768px) {
      .ticket-detail-grid {
        grid-template-columns: 1fr;
      }
      .similar-tickets-card {
        grid-column: auto;
      }
    }

    /* === Recommendation Section Styles === */
    .recommendation-section {
      margin: 1.5rem 0;
      padding: 1.25rem;
      background: var(--bg-secondary);
      border-radius: 16px;
      border: 1px solid var(--border);
    }
    .recommendation-section h3 {
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
      color: var(--text-primary);
      font-weight: 600;
    }
    .recommendation-section .loading-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--text-secondary);
      padding: 1rem 0;
    }
    .recommendation-section .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--border);
      border-top-color: var(--accent-violet);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .recommendation-section .error-message {
      color: #ef4444;
      padding: 0.75rem;
      background: rgba(239, 68, 68, 0.08);
      border-radius: 8px;
      font-size: 0.9rem;
    }
    .recommendation-card {
      background: var(--surface);
      border-radius: 12px;
      padding: 1rem;
      border: 1px solid var(--border);
    }
    .recommended-agent-header {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      margin-bottom: 1rem;
      padding-bottom: 0.875rem;
      border-bottom: 1px solid var(--border);
    }
    .agent-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 1rem;
    }
    .agent-info {
      flex: 1;
    }
    .agent-info h4 {
      margin: 0;
      font-size: 1rem;
      color: var(--text-primary);
    }
    .score-badge {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
    }
    .score-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #22c55e;
    }
    .score-label {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .factors-breakdown {
      margin-bottom: 1rem;
    }
    .factors-breakdown h5 {
      margin: 0 0 0.75rem 0;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
    }
    .factor-row {
      margin-bottom: 0.625rem;
    }
    .factor-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      margin-bottom: 0.25rem;
      color: var(--text-primary);
    }
    .factor-label .weight {
      color: var(--text-secondary);
      font-size: 0.8rem;
    }
    .factor-bar-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .factor-bar {
      flex: 1;
      height: 6px;
      background: var(--border);
      border-radius: 3px;
      position: relative;
      overflow: hidden;
    }
    .factor-bar::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      border-radius: 3px;
      transition: width 0.4s ease;
      width: var(--w, 0%);
    }
    .factor-bar.high::after { background: #22c55e; }
    .factor-bar.medium::after { background: #eab308; }
    .factor-bar.low::after { background: #ef4444; }
    .factor-score {
      font-size: 0.8rem;
      color: var(--text-secondary);
      min-width: 3rem;
      text-align: right;
    }
    .recommendation-actions {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .recommendation-actions app-button {
      flex: 1;
    }
    .alternatives-section {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }
    .alternatives-section h5 {
      margin: 0 0 0.75rem 0;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .alternative-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
      width: 100%;
      padding: 0.85rem 1rem;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
      color: inherit;
      text-align: left;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease;
      font: inherit;
    }
    .alternative-row:hover:not(:disabled) {
      background: rgba(102, 126, 234, 0.08);
      border-color: rgba(102, 126, 234, 0.25);
    }
    .alternative-row:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .alt-name {
      width: 120px;
      font-size: 0.85rem;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .alt-score-bar {
      flex: 1;
      height: 4px;
      background: var(--border);
      border-radius: 2px;
      overflow: hidden;
    }
    .alt-bar {
      height: 100%;
      background: var(--text-secondary);
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    .alt-score {
      font-size: 0.8rem;
      color: var(--text-secondary);
      min-width: 2rem;
      text-align: right;
    }

    /* === Escalation Section Styles === */
    .escalation-section,
    .manager-escalation-panel {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }

    .escalation-section h3,
    .manager-escalation-panel h3 {
      margin: 0 0 0.75rem 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .escalation-hint {
      margin: 0 0 1rem 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .escalation-controls,
    .manager-actions,
    .reassign-list {
      display: flex;
      gap: 0.75rem;
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .escalation-textarea {
      flex: 1;
      min-width: 280px;
      resize: vertical;
    }

    .manager-escalation-panel {
      padding: 1.25rem;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.04), rgba(139, 92, 246, 0.04));
      border: 1px solid rgba(139, 92, 246, 0.18);
      border-radius: 16px;
    }

    .manager-escalation-panel h3 {
      color: #7c3aed;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .manager-escalation-panel h3::before {
      content: '🚨';
      font-size: 1rem;
    }

    .manager-escalation-panel p {
      margin: 0.35rem 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .manager-escalation-panel strong {
      color: var(--text-primary);
    }

    .manager-actions {
      margin-top: 1rem;
    }

    .reject-inline {
      display: flex;
      gap: 0.75rem;
      align-items: flex-end;
      flex-wrap: wrap;
      flex: 1;
    }

    .reject-inline textarea {
      flex: 1;
      min-width: 220px;
      resize: vertical;
    }

    .reassign-list {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px dashed var(--border);
    }

    .reassign-list select {
      flex: 1;
      min-width: 200px;
    }

    /* === Escalation Status Panels (Agent view) === */
    .escalation-status-panel {
      border-radius: 16px;
      padding: 1.25rem;
      margin-bottom: 1.25rem;
      border: 1px solid var(--border);
    }

    .escalation-status-panel.pending {
      background: linear-gradient(135deg, rgba(250, 204, 21, 0.06), rgba(245, 158, 11, 0.04));
      border-color: rgba(250, 204, 21, 0.35);
    }

    .escalation-status-panel.accepted {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.06), rgba(16, 185, 129, 0.04));
      border-color: rgba(34, 197, 94, 0.35);
    }

    .escalation-status-panel.rejected {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.06), rgba(249, 115, 22, 0.04));
      border-color: rgba(239, 68, 68, 0.35);
    }

    .escalation-status-panel h3 {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin: 0 0 0.5rem 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .status-icon {
      font-size: 1.125rem;
      line-height: 1;
    }

    .escalation-status-panel.pending h3 {
      color: #ca8a04;
    }
    .escalation-status-panel.accepted h3 {
      color: #16a34a;
    }
    .escalation-status-panel.rejected h3 {
      color: #dc2626;
    }

    .escalation-status-desc {
      margin: 0 0 0.875rem 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .status-info-grid {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      padding: 0.875rem 1rem;
    }

    .info-row {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      font-size: 0.875rem;
    }

    .info-label {
      font-weight: 600;
      color: var(--text-secondary);
      min-width: 130px;
      flex-shrink: 0;
    }

    .info-value {
      color: var(--text-primary);
      flex: 1;
      line-height: 1.45;
    }

    .info-value.reason {
      font-style: italic;
    }

    .info-value.rejection-reason {
      color: #dc2626;
      font-style: normal;
      font-weight: 500;
    }

    .disabled-hint,
    .accepted-hint {
      margin: 0.875rem 0 0 0;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      font-size: 0.825rem;
      font-weight: 500;
    }

    .disabled-hint {
      background: rgba(250, 204, 21, 0.12);
      color: #a16207;
    }

    .accepted-hint {
      background: rgba(34, 197, 94, 0.12);
      color: #15803d;
    }

    .escalation-new-request {
      margin-top: 0.25rem;
      padding-top: 0.875rem;
      border-top: 1px dashed var(--border);
    }

    .escalation-new-request h4 {
      margin: 0 0 0.35rem 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    /* RTL Support */
    :host-context([dir="rtl"]) .page-header {
      flex-direction: row-reverse;
    }
    :host-context([dir="rtl"]) .ticket-meta {
      direction: rtl;
    }
    :host-context([dir="rtl"]) .status-controls,
    :host-context([dir="rtl"]) .recommendation-actions,
    :host-context([dir="rtl"]) .comment-controls,
    :host-context([dir="rtl"]) .escalation-controls,
    :host-context([dir="rtl"]) .manager-actions,
    :host-context([dir="rtl"]) .reassign-list,
    :host-context([dir="rtl"]) .reject-inline {
      flex-direction: row-reverse;
    }
    :host-context([dir="rtl"]) .description-header,
    :host-context([dir="rtl"]) .section-header,
    :host-context([dir="rtl"]) .recommended-agent-header,
    :host-context([dir="rtl"]) .card-header,
    :host-context([dir="rtl"]) .header-right {
      flex-direction: row-reverse;
    }
    :host-context([dir="rtl"]) .translation-menu-item,
    :host-context([dir="rtl"]) .translation-meta,
    :host-context([dir="rtl"]) .factor-label,
    :host-context([dir="rtl"]) .factor-row,
    :host-context([dir="rtl"]) .attachment-item,
    :host-context([dir="rtl"]) .alternative-row,
    :host-context([dir="rtl"]) .similar-ticket-header {
      flex-direction: row-reverse;
    }
  `]
})
export class TicketDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  router = inject(Router);
  private ticketService = inject(TicketService);
  private aiService = inject(AiService);
  private userService = inject(UserService);
  private attachmentService = inject(AttachmentService);
  private assignmentService = inject(AssignmentService);
  private translate = inject(TranslateService);
  private geminiTranslation = inject(GeminiTranslationService);
  authService = inject(AuthService);
  @ViewChild('commentTextarea') private commentTextarea?: ElementRef<HTMLTextAreaElement>;

  ticket = signal<TicketDetailResponse | null | undefined>(undefined);
  attachments = signal<AttachmentResponse[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  statusError = signal<string | null>(null);
  commentError = signal<string | null>(null);
  attachmentError = signal<string | null>(null);
  assignError = signal<string | null>(null);
  uploadProgressText = signal<string | null>(null);
  changingStatus = signal(false);
  addingComment = signal(false);
  assigningTicket = signal(false);
  uploadingAttachment = signal(false);
  deletingAttachment = signal(false);
  selectedStatus = signal<TicketStatus>('NEW');
  newCommentContent = signal('');
  newCommentIsInternal = signal(false);
  stagedAttachmentFiles = signal<File[]>([]);
  agents = signal<UserResponse[]>([]);
  statusLoading = signal(false);

  previewAttachment = signal<AttachmentResponse | null>(null);
  previewUrl = signal<string | null>(null);
  previewLoading = signal(false);
  recommendation = signal<AssignmentRecommendationResponse | null>(null);
  recommendationLoading = signal(false);
  recommendationError = signal<string | null>(null);
  showAlternatives = signal(false);
  aiSummary = signal<string | null>(null);
  aiSummaryLoading = signal(false);
  aiSummaryUnavailable = signal(false);
  aiSummaryExpanded = signal(false);
  suggestedReply = signal<string | null>(null);
  suggestedReplyLoading = signal(false);
  suggestionDisplayState = signal<'hidden' | 'loading' | 'card' | 'chip'>('hidden');
  similarTickets = signal<SimilarTicketResponse[]>([]);
  similarTicketsLoading = signal(false);
  resolutionSummaryDraft = signal('');
  escalationReason = signal('');
  escalating = signal(false);
  escalationError = signal<string | null>(null);
  escalationSuccess = signal<string | null>(null);
  // Escalation tracking for both agent and manager views
  latestEscalation = signal<any | null>(null);
  // Manager escalation handling
  pendingEscalation = signal<any | null>(null);
  managerActionLoading = signal(false);
  managerActionError = signal<string | null>(null);
  managerActionSuccess = signal<string | null>(null);
  rejectReason = signal('');
  reassignCandidates = signal<any[]>([]);
  reassignSelectedAgentId = signal<string | null>(null);
  private hasInteractedWithSuggestion = signal(false);

  readonly descriptionTranslationLanguages: TranslationLanguageOption[] = [
    { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
    { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', flag: '🇹🇳' },
    { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
    { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', label: 'Italian', nativeLabel: 'Italiano', flag: '🇮🇹' }
  ];

  translatedDescription = signal<DescriptionTranslationState | null>(null);
  descriptionTranslationCache = signal<Map<string, string>>(new Map());
  descriptionTranslationMenuOpen = signal(false);
  descriptionTranslationError = signal<string | null>(null);
  translatingDescriptionTarget = signal<TranslationLanguageOption | null>(null);
  translatedComments = signal<Map<string, string>>(new Map());
  isTranslatingDescription = signal(false);
  isTranslatingComment = signal<string | null>(null);

  possibleStatuses: TicketStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];

  ngOnInit() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.loadTicket(id);
        }
      });

    this.loadAgents();
  }

  loadAgents() {
    this.userService.getUsers(undefined, 'AGENT', true).subscribe({
      next: (users) => this.agents.set(users),
      error: (err) => console.error('Failed to load agents:', err)
    });
  }

  loadAttachments(ticketId: string) {
    this.attachmentService.getAttachments(ticketId).subscribe({
      next: (attachments) => this.attachments.set(attachments),
      error: (error) => console.error('Failed to load attachments:', error)
    });
  }

  isAgent(): boolean {
    return this.authService.currentUser()?.role === 'AGENT';
  }

  currentUserId(): string | null {
    return this.authService.currentUser()?.id || null;
  }

  isImage(fileType: string): boolean {
    return fileType?.startsWith('image/') ?? false;
  }

  openPreview(attachment: AttachmentResponse) {
    if (!this.isImage(attachment.fileType)) return;
    this.previewAttachment.set(attachment);
    this.previewLoading.set(true);
    this.previewUrl.set(null);

    this.attachmentService.downloadAttachment(attachment.id).subscribe({
      next: (response) => {
        const blob = response.body;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          this.previewUrl.set(url);
        }
        this.previewLoading.set(false);
      },
      error: (err) => {
        console.error('Preview failed:', err);
        this.previewLoading.set(false);
        this.closePreview();
      }
    });
  }

  closePreview() {
    const url = this.previewUrl();
    if (url) {
      window.URL.revokeObjectURL(url);
    }
    this.previewUrl.set(null);
    this.previewAttachment.set(null);
  }

  private getCurrentLang(): string {
    const lang = typeof this.translate.currentLang === 'function'
      ? this.translate.currentLang()
      : (this.translate.currentLang as unknown as string);
    return lang || 'fr';
  }

  hasTranslatableDescription(): boolean {
    const description = this.ticket()?.description?.trim();
    return !!description && description !== 'No description provided.';
  }

  toggleDescriptionTranslationMenu() {
    if (!this.hasTranslatableDescription() || this.isTranslatingDescription()) {
      return;
    }

    this.descriptionTranslationError.set(null);
    this.descriptionTranslationMenuOpen.update((open) => !open);
  }

  translateDescriptionTo(language: TranslationLanguageOption) {
    const description = this.ticket()?.description?.trim();
    if (!description) {
      return;
    }

    this.descriptionTranslationMenuOpen.set(false);
    this.descriptionTranslationError.set(null);
    this.translatingDescriptionTarget.set(language);

    const cached = this.descriptionTranslationCache().get(language.code);
    if (cached) {
      this.translatedDescription.set({ text: cached, language });
      this.translatingDescriptionTarget.set(null);
      return;
    }

    this.isTranslatingDescription.set(true);
    this.aiService.translateText(description, language.code, language.label).subscribe({
      next: (response) => {
        const translated = response.translatedText?.trim() || description;
        this.descriptionTranslationCache.update((cache) => {
          const nextCache = new Map(cache);
          nextCache.set(language.code, translated);
          return nextCache;
        });
        this.translatedDescription.set({ text: translated, language });
        this.isTranslatingDescription.set(false);
        this.translatingDescriptionTarget.set(null);
      },
      error: (error) => {
        console.error('Qwen description translation failed:', error);
        this.descriptionTranslationError.set(this.translate.instant('TICKET.TRANSLATION_FAILED'));
        this.isTranslatingDescription.set(false);
        this.translatingDescriptionTarget.set(null);
      }
    });
  }

  showOriginalDescription() {
    this.translatedDescription.set(null);
    this.descriptionTranslationError.set(null);
  }

  translateComment(commentId: string, content: string) {
    if (this.translatedComments().has(commentId)) return;
    
    this.isTranslatingComment.set(commentId);
    this.geminiTranslation.translateText(content, this.getCurrentLang()).subscribe({
      next: (translated) => {
        this.translatedComments.update(map => {
          const newMap = new Map(map);
          newMap.set(commentId, translated);
          return newMap;
        });
        this.isTranslatingComment.set(null);
      },
      error: () => this.isTranslatingComment.set(null)
    });
  }

  showOriginalComment(commentId: string) {
    this.translatedComments.update(map => {
      const newMap = new Map(map);
      newMap.delete(commentId);
      return newMap;
    });
  }

  loadTicket(id: string) {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.resetAiState();
    this.translatedDescription.set(null);
    this.descriptionTranslationCache.set(new Map());
    this.descriptionTranslationMenuOpen.set(false);
    this.descriptionTranslationError.set(null);
    this.translatingDescriptionTarget.set(null);
    this.translatedComments.set(new Map());
    this.isTranslatingDescription.set(false);
    this.isTranslatingComment.set(null);
    this.newCommentContent.set('');
    this.newCommentIsInternal.set(false);
    this.ticketService.getTicketById(id).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.selectedStatus.set(ticket.status);
        this.resolutionSummaryDraft.set('');
        this.loading.set(false);
        this.loadAttachments(id);
        this.loadSummary(ticket);
        this.loadSimilarTickets(ticket);
        if (this.isManager() || this.isAgent()) {
          this.loadEscalationsForTicket(ticket.id);
        }
      },
      error: (error) => {
        console.error('Failed to load ticket:', error);
        if (error.status === 404) {
          this.errorMessage.set('Ticket not found');
        } else {
          this.errorMessage.set(error.error?.message || 'Failed to load ticket');
        }
        this.ticket.set(null);
        this.loading.set(false);
      }
    });
  }

  handleChangeStatus() {
  if (!this.ticket()) return;

  const ticketId = this.ticket()!.id;
  const newStatus = this.selectedStatus();
  const currentStatus = this.ticket()!.status;

  if (!newStatus || newStatus === currentStatus) {
    return;
  }

  const shouldStoreEmbedding = newStatus === 'RESOLVED';

  this.changingStatus.set(true);
  this.statusError.set(null);

  this.ticketService.changeStatus(ticketId, newStatus).subscribe({
    next: () => {
      if (shouldStoreEmbedding) {
        this.storeResolvedTicketEmbedding(ticketId);
      }
      this.resolutionSummaryDraft.set('');
      this.loadTicket(ticketId);
      this.changingStatus.set(false);
    },
    error: (error) => {
      console.error('Failed to change status:', error);

      const msg = this.extractErrorMessage(
        error,
        'Failed to update status. Please try again.'
      );

      // messages plus clairs selon le code HTTP
      if (error?.status === 400) {
        this.statusError.set(
          msg || `Invalid transition from ${currentStatus} to ${newStatus}.`
        );
      } else if (error?.status === 403) {
        this.statusError.set(
          msg || 'You are not allowed to change the status of this ticket.'
        );
      } else if (error?.status === 404) {
        this.statusError.set('Ticket not found.');
      } else if (error?.status === 0) {
        this.statusError.set('Cannot reach the server. Check your connection.');
      } else {
        this.statusError.set(msg);
      }

      this.changingStatus.set(false);
    }
  });
}

/** Extract a readable message from HttpErrorResponse / backend body */
private extractErrorMessage(error: any, fallback: string): string {
  const body = error?.error;

  if (typeof body === 'string' && body.trim()) {
    return body;
  }
  if (body?.message && typeof body.message === 'string') {
    return body.message;
  }
  if (body?.error && typeof body.error === 'string') {
    return body.error;
  }
  // Spring validation style: { errors: [{ defaultMessage: '...' }] }
  if (Array.isArray(body?.errors) && body.errors[0]?.defaultMessage) {
    return body.errors[0].defaultMessage;
  }
  if (error?.message && !String(error.message).startsWith('Http failure')) {
    return error.message;
  }
  return fallback;
}

  handleEscalation() {
    if (!this.ticket() || !this.escalationReason().trim()) return;
    this.escalating.set(true);
    this.escalationError.set(null);
    this.escalationSuccess.set(null);
    this.ticketService.escalateTicket(this.ticket()!.id, this.escalationReason().trim()).subscribe({
      next: () => {
        this.escalating.set(false);
        this.escalationSuccess.set('Escalation request sent to your team manager.');
        this.escalationReason.set('');
        setTimeout(() => this.escalationSuccess.set(null), 5000);
      },
      error: (error) => {
        console.error('Failed to escalate ticket:', error);
        this.escalating.set(false);
        this.escalationError.set(error.error?.message || 'Failed to send escalation request');
      },
    });
  }

  isManager(): boolean {
    return this.authService.currentUser()?.role === 'MANAGER';
  }

  loadEscalationsForTicket(ticketId: string) {
    this.ticketService.listEscalations().subscribe({
      next: (list) => {
        const ticketEscalations = list.filter(e => e.ticketId === ticketId);
        if (ticketEscalations.length > 0) {
          ticketEscalations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          this.latestEscalation.set(ticketEscalations[0]);
        } else {
          this.latestEscalation.set(null);
        }
        if (this.isManager()) {
          const pending = ticketEscalations.find(e => e.status === 'PENDING');
          this.pendingEscalation.set(pending || null);
        }
      },
      error: (err) => console.error('Failed to load escalations:', err)
    });
  }

  handleAcceptEscalation() {
    const esc = this.pendingEscalation();
    if (!esc) return;
    this.managerActionLoading.set(true);
    this.managerActionError.set(null);
    this.managerActionSuccess.set(null);
    this.ticketService.acceptEscalation(esc.id, true).subscribe({
      next: () => {
        this.managerActionLoading.set(false);
        this.managerActionSuccess.set('Escalation accepted. Agent has been notified.');
        this.pendingEscalation.set(null);
        setTimeout(() => this.managerActionSuccess.set(null), 6000);
        if (this.ticket()) this.loadTicket(this.ticket()!.id);
      },
      error: (err) => {
        console.error('Accept failed', err);
        this.managerActionLoading.set(false);
        this.managerActionError.set(err.error?.message || 'Failed to accept escalation');
      }
    });
  }

  handleRejectEscalation() {
    const esc = this.pendingEscalation();
    if (!esc || !this.rejectReason().trim()) return;
    this.managerActionLoading.set(true);
    this.managerActionError.set(null);
    this.managerActionSuccess.set(null);
    this.ticketService.rejectEscalation(esc.id, this.rejectReason().trim()).subscribe({
      next: () => {
        this.managerActionLoading.set(false);
        this.managerActionSuccess.set('Escalation rejected. Agent has been notified.');
        this.pendingEscalation.set(null);
        this.rejectReason.set('');
        setTimeout(() => this.managerActionSuccess.set(null), 6000);
        if (this.ticket()) this.loadTicket(this.ticket()!.id);
      },
      error: (err) => {
        console.error('Reject failed', err);
        this.managerActionLoading.set(false);
        this.managerActionError.set(err.error?.message || 'Failed to reject escalation');
      }
    });
  }

  loadReassignCandidates() {
    const teamId = this.ticket()?.teamId;
    if (!teamId) return;
    this.assignmentService.getTeamAgents(teamId).subscribe({
      next: (agents) => this.reassignCandidates.set(agents),
      error: (err) => console.error('Failed to load team agents', err)
    });
  }

  handleReassignEscalation() {
    const esc = this.pendingEscalation();
    const agentId = this.reassignSelectedAgentId();
    if (!esc || !agentId) return;
    this.managerActionLoading.set(true);
    this.managerActionError.set(null);
    this.managerActionSuccess.set(null);
    this.ticketService.reassignEscalation(esc.id, agentId).subscribe({
      next: () => {
        this.managerActionLoading.set(false);
        this.managerActionSuccess.set('Escalation: ticket reassigned. All parties notified.');
        this.pendingEscalation.set(null);
        this.reassignCandidates.set([]);
        this.reassignSelectedAgentId.set(null);
        setTimeout(() => this.managerActionSuccess.set(null), 6000);
        if (this.ticket()) this.loadTicket(this.ticket()!.id);
      },
      error: (err) => {
        console.error('Reassign failed', err);
        this.managerActionLoading.set(false);
        this.managerActionError.set(err.error?.message || 'Failed to reassign escalation');
      }
    });
  }

  handleAddComment() {
    if (!this.ticket() || !this.newCommentContent().trim()) return;
    this.addingComment.set(true);
    this.commentError.set(null);
    this.ticketService.addComment(this.ticket()!.id, {
      content: this.newCommentContent().trim(),
      isInternal: this.newCommentIsInternal()
    }).subscribe({
      next: () => {
        this.newCommentContent.set('');
        this.newCommentIsInternal.set(false);
        this.hasInteractedWithSuggestion.set(false);
        this.suggestionDisplayState.set(this.suggestedReply() ? 'chip' : 'hidden');
        if (this.ticket()) {
          this.loadTicket(this.ticket()!.id);
        }
        this.addingComment.set(false);
      },
      error: (error) => {
        console.error('Failed to add comment:', error);
        this.commentError.set(error.error?.message || 'Failed to add comment');
        this.addingComment.set(false);
      }
    });
  }

  onAttachmentFilesChange(files: File[]) {
    this.stagedAttachmentFiles.set(files);
    if (files.length > 0) {
      void this.handleAttachmentUpload(files);
    }
  }

  async handleAttachmentUpload(files: File[]) {
    if (!this.ticket() || files.length === 0 || this.uploadingAttachment()) {
      return;
    }

    this.uploadingAttachment.set(true);
    this.attachmentError.set(null);

    let failedUploads = 0;

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      this.uploadProgressText.set(`Uploading attachments (${index + 1}/${files.length})...`);

      try {
        await firstValueFrom(this.attachmentService.uploadAttachment(this.ticket()!.id, file));
      } catch (error: any) {
        failedUploads++;
        console.error('Failed to upload attachment:', error);
      }
    }

    this.stagedAttachmentFiles.set([]);
    this.uploadingAttachment.set(false);
    this.uploadProgressText.set(null);

    if (this.ticket()) {
      this.loadAttachments(this.ticket()!.id);
    }

    if (failedUploads > 0) {
      this.attachmentError.set(
        `${failedUploads} file${failedUploads > 1 ? 's' : ''} failed to upload. Please retry.`
      );
    }
  }

  handleDownloadAttachment(attachment: AttachmentResponse) {
    this.attachmentService.downloadAttachment(attachment.id).subscribe({
      next: (response) => {
        const blob = response.body;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = attachment.fileName;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      },
      error: (error) => {
        console.error('Failed to download attachment:', error);
        this.attachmentError.set('Failed to download attachment');
      }
    });
  }

  handleDeleteAttachment(attachment: AttachmentResponse) {
    if (!this.ticket()) return;
    this.deletingAttachment.set(true);
    this.attachmentError.set(null);
    this.attachmentService.deleteAttachment(attachment.id).subscribe({
      next: () => {
        if (this.ticket()) {
          this.loadAttachments(this.ticket()!.id);
        }
        this.deletingAttachment.set(false);
      },
      error: (error) => {
        console.error('Failed to delete attachment:', error);
        this.attachmentError.set(error.error?.message || 'Failed to delete attachment');
        this.deletingAttachment.set(false);
      }
    });
  }

  canDeleteAttachment(attachment: AttachmentResponse): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    return (
      attachment.uploadedById === user.id ||
      user.role === 'MANAGER' ||
      user.role === 'ADMIN'
    );
  }

  getFileIcon(type: string): string {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    if (type.includes('text')) return '📃';
    return '📁';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStatusLabel(status: TicketStatus): string {
    return this.translate.instant('STATUS.' + status);
  }

  getPriorityLabel(priority: Priority): string {
    return this.translate.instant('PRIORITY.' + priority);
  }

  getCategoryLabel(category: Category): string {
    return this.translate.instant('CATEGORY.' + category);
  }

  sortedHistory(): TicketHistoryResponse[] {
    return [...(this.ticket()?.history ?? [])].sort((a, b) => {
      const aTime = new Date(a.changedAt ?? '').getTime();
      const bTime = new Date(b.changedAt ?? '').getTime();
      return aTime - bTime;
    });
  }

  getHistoryEventLabel(entry: TicketHistoryResponse): string {
    const eventType = entry.eventType || 'STATUS_CHANGED';
    const translationKey = `TICKET.HISTORY_EVENT.${eventType}`;
    const translated = this.translate.instant(translationKey);
    if (translated && translated !== translationKey) {
      return translated;
    }
    return entry.message || eventType.replace(/_/g, ' ').toLowerCase();
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(this.getCurrentLang(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  canGenerateSummary(): boolean {
    return !!this.ticket()?.title?.trim() && !!this.ticket()?.description?.trim();
  }

  regenerateSummary() {
    const ticket = this.ticket();
    if (!ticket) {
      return;
    }

    this.loadSummary(ticket);
  }

  toggleSummaryExpanded() {
    this.aiSummaryExpanded.update((expanded) => !expanded);
  }

  shouldShowSummaryToggle(): boolean {
    return (this.aiSummary()?.length ?? 0) > 140;
  }

  applySuggestedReply(focusTextarea: boolean) {
    const reply = this.suggestedReply();
    if (!reply) {
      return;
    }

    this.newCommentContent.set(reply);
    this.hasInteractedWithSuggestion.set(true);
    this.suggestionDisplayState.set('chip');

    if (focusTextarea) {
      setTimeout(() => this.commentTextarea?.nativeElement.focus());
    }
  }

  dismissSuggestedReply() {
    this.hasInteractedWithSuggestion.set(true);
    this.suggestionDisplayState.set(this.suggestedReply() ? 'chip' : 'hidden');
  }

  showSuggestedReplyCard() {
    if (!this.suggestedReply()) {
      return;
    }

    this.suggestionDisplayState.set('card');
  }

  handleSuggestionChipClick() {
    if (this.hasInteractedWithSuggestion()) {
      this.requestSuggestedReply();
      return;
    }

    this.showSuggestedReplyCard();
  }

  getSuggestionChipLabelKey(): string {
    return this.hasInteractedWithSuggestion() ? 'AI.SUGGEST_AGAIN' : 'AI.SUGGESTION_CHIP';
  }

  handleCommentInputChange(value: string) {
    if (value.trim() && this.suggestionDisplayState() === 'card' && !this.hasInteractedWithSuggestion()) {
      this.suggestionDisplayState.set('chip');
    }
  }

  openSimilarTicket(ticketId: string) {
    void this.router.navigate(['/tickets', ticketId]);
  }

  getShortTicketId(ticketId: string): string {
    return ticketId.slice(0, 8);
  }

  formatSimilarity(similarityScore: number): string {
    return `${Math.round(similarityScore * 100)}%`;
  }

  loadRecommendation() {
    if (!this.ticket()) return;
    this.recommendationLoading.set(true);
    this.recommendationError.set(null);
    const t = this.ticket()!;
    this.assignmentService.recommendAssignment({
      ticketId: t.id,
      category: t.category,
      priority: t.priority,
      teamId: (t as any).teamId || undefined
    }).subscribe({
      next: (rec) => {
        this.recommendation.set(rec);
        this.recommendationLoading.set(false);
      },
      error: (error: any) => {
        console.error('Recommendation failed:', error);
        const raw = error?.error?.message || error?.error?.error || 'Failed to get recommendation';
        const mapped = raw === 'No agent available for this category'
          ? 'Aucun agent disponible pour cette catégorie'
          : raw;
        this.recommendationError.set(mapped);
        this.recommendationLoading.set(false);
      }
    });
  }

  acceptRecommendation() {
    if (!this.ticket() || !this.recommendation()) return;
    this.assigningTicket.set(true);
    this.assignError.set(null);
    this.recommendationError.set(null);
    this.ticketService.assignTicket(this.ticket()!.id, this.recommendation()!.recommendedAgentId).subscribe({
      next: () => {
        this.recommendation.set(null);
        if (this.ticket()) this.loadTicket(this.ticket()!.id);
        this.assigningTicket.set(false);
      },
      error: (error: any) => {
        console.error('Failed to assign:', error);
        this.assignError.set(error.error?.error || error.error?.message || 'Failed to assign ticket');
        this.assigningTicket.set(false);
      }
    });
  }

  assignAlternativeAgent(alt: AlternativeAgentResponse) {
    if (!this.ticket()) return;
    this.assigningTicket.set(true);
    this.assignError.set(null);
    this.recommendationError.set(null);
    this.ticketService.assignTicket(this.ticket()!.id, alt.userId).subscribe({
      next: () => {
        this.recommendation.set(null);
        this.showAlternatives.set(false);
        if (this.ticket()) this.loadTicket(this.ticket()!.id);
        this.assigningTicket.set(false);
      },
      error: (error: any) => {
        console.error('Failed to assign alternative agent:', error);
        this.assignError.set(error.error?.error || error.error?.message || 'Failed to assign ticket');
        this.assigningTicket.set(false);
      }
    });
  }

  toggleAlternatives() {
    this.showAlternatives.update(v => !v);
  }

  getScorePercentage(contribution: number, weight: number): number {
    if (weight === 0) return 0;
    return Math.min(100, Math.max(0, (contribution / weight) * 100));
  }

  getRecommendedAgentName(): string {
    const rec = this.recommendation();
    if (!rec) return '';
    const agent = this.agents().find(a => a.id === rec.userId);
    return agent?.fullName || rec.agentName || 'Unknown Agent';
  }

  getAlternativeAgentName(alt: AlternativeAgentResponse): string {
    const agent = this.agents().find(a => a.id === alt.userId);
    return agent?.fullName || alt.agentName || 'Unknown Agent';
  }

  private resetAiState() {
    this.aiSummary.set(null);
    this.aiSummaryLoading.set(false);
    this.aiSummaryUnavailable.set(false);
    this.aiSummaryExpanded.set(false);
    this.suggestedReply.set(null);
    this.suggestedReplyLoading.set(false);
    this.suggestionDisplayState.set('hidden');
    this.similarTickets.set([]);
    this.similarTicketsLoading.set(false);
    this.hasInteractedWithSuggestion.set(false);
  }

  private loadSummary(ticket: TicketDetailResponse) {
    if (!ticket.title?.trim() || !ticket.description?.trim()) {
      this.aiSummary.set(null);
      this.aiSummaryUnavailable.set(true);
      this.aiSummaryLoading.set(false);
      return;
    }

    this.aiSummaryLoading.set(true);
    this.aiSummaryUnavailable.set(false);
    this.aiSummaryExpanded.set(false);

    this.aiService.getSummary(ticket.title, ticket.description).subscribe({
      next: (response) => {
        this.aiSummary.set(response.summary);
        this.aiSummaryLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load AI summary:', error);
        this.aiSummary.set(null);
        this.aiSummaryUnavailable.set(true);
        this.aiSummaryLoading.set(false);
      }
    });
  }

  requestSuggestedReply() {
    const ticket = this.ticket();
    if (!ticket?.title?.trim() || this.suggestedReplyLoading()) {
      return;
    }

    const fallbackState: 'hidden' | 'chip' = this.suggestionDisplayState() === 'chip' ? 'chip' : 'hidden';
    this.suggestedReplyLoading.set(true);
    this.suggestionDisplayState.set('loading');
    this.aiService.getSuggestedResponse(ticket.title, ticket.description ?? '').subscribe({
      next: (response) => {
        const reply = response.suggestedReply?.trim();
        this.suggestedReplyLoading.set(false);

        if (!reply) {
          this.suggestedReply.set(null);
          this.suggestionDisplayState.set(fallbackState);
          return;
        }

        this.suggestedReply.set(reply);
        this.hasInteractedWithSuggestion.set(false);
        this.suggestionDisplayState.set('card');
      },
      error: (error) => {
        console.error('Failed to load suggested reply:', error);
        this.suggestedReplyLoading.set(false);
        this.suggestionDisplayState.set(fallbackState);
      }
    });
  }

  private loadSimilarTickets(ticket: TicketDetailResponse) {
    const content = this.buildTicketContent(ticket);
    if (!content.trim()) {
      return;
    }

    this.similarTicketsLoading.set(true);
    this.aiService.findSimilarTickets(ticket.id, content).subscribe({
      next: (results) => {
        this.similarTickets.set(results.filter((item) => item.similarityScore >= 0.7));
        this.similarTicketsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load similar tickets:', error);
        this.similarTickets.set([]);
        this.similarTicketsLoading.set(false);
      }
    });
  }

  private storeResolvedTicketEmbedding(ticketId: string) {
    const ticket = this.ticket();
    if (!ticket) {
      return;
    }

    const resolutionSummary = this.getResolutionSummary(ticket);
    if (!resolutionSummary) {
      return;
    }

    this.aiService.storeEmbedding(ticketId, this.buildTicketContent(ticket), resolutionSummary).subscribe({
      error: (error) => console.error('Failed to store ticket embedding:', error)
    });
  }

  private buildTicketContent(ticket: TicketDetailResponse): string {
    return [ticket.title, ticket.description].filter(Boolean).join(' ').trim();
  }

  private getResolutionSummary(ticket: TicketDetailResponse): string {
    const manualSummary = this.resolutionSummaryDraft().trim();
    if (manualSummary) {
      return manualSummary;
    }

    const lastComment = [...(ticket.comments ?? [])]
      .reverse()
      .find((comment) => comment.content?.trim());

    return lastComment?.content?.trim() || ticket.description?.trim() || ticket.title.trim();
  }
}
