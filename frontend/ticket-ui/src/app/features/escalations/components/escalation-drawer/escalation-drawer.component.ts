import { Component, DestroyRef, Input, OnChanges, OnInit, Output, EventEmitter, computed, inject, signal, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AssignmentService, AgentProfileResponse } from '../../../../core/services/assignment.service';
import { EscalationService, Escalation } from '../../../../core/services/escalation.service';
import { mapEscalationStatus } from '../../../../models/escalation.model';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-escalation-drawer',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    AlertComponent,
    TranslatePipe
  ],
  templateUrl: './escalation-drawer.component.html',
  styleUrls: ['./escalation-drawer.component.scss']
})
export class EscalationDrawerComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Input() escalation: Escalation | null = null;
  @Input() isManager = false;
  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  private destroyRef = inject(DestroyRef);
  private escalationService = inject(EscalationService);
  private assignmentService = inject(AssignmentService);
  private router = inject(Router);
  private translateService = inject(TranslateService);

  acceptTakeOwnership = signal(false);
  acceptSetInProgress = signal(true);
  rejectReason = signal('');
  teamAgents = signal<AgentProfileResponse[]>([]);
  selectedReassignAgentId = signal<string>('');
  reassignLoading = signal(false);

  acceptLoading = signal(false);
  rejectLoading = signal(false);
  actionError = signal<string | null>(null);
  actionSuccess = signal<string | null>(null);

  isPending = computed(() => this.escalation ? (this.escalation.status === 'SUBMITTED' || this.escalation.status === 'PENDING') : false);
  canTakeAction = computed(() => this.isManager && this.isPending());

  ngOnInit(): void {
    this.resetActionState();
  }

  ngOnChanges() {
    if (this.open) {
      this.resetActionState();
      this.teamAgents.set([]);
    }
  }

  private resetActionState() {
    this.acceptTakeOwnership.set(false);
    this.acceptSetInProgress.set(true);
    this.rejectReason.set('');
    this.selectedReassignAgentId.set('');
    this.teamAgents.set([]);
    this.acceptLoading.set(false);
    this.rejectLoading.set(false);
    this.reassignLoading.set(false);
    this.actionError.set(null);
    this.actionSuccess.set(null);
  }

  private async loadTeamAgents(teamId: string) {
    try {
      const agents = await firstValueFrom(
        this.assignmentService.getTeamAgents(teamId)
          .pipe(takeUntilDestroyed(this.destroyRef))
      );
      this.teamAgents.set(agents);
    } catch (err) {
      console.error('Failed to load team agents:', err);
    }
  }

  handleAccept() {
    if (!this.escalation || !this.canTakeAction()) return;
    this.acceptLoading.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);

    this.escalationService.acceptEscalation(
      this.escalation.id,
      { setInProgress: this.acceptSetInProgress(), takeOwnership: this.acceptTakeOwnership() }
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.acceptLoading.set(false);
        this.actionSuccess.set(this.translateService.instant('ESCALATION_DRAWER.TOAST_ACCEPT_SUCCESS'));
        setTimeout(() => {
          this.updated.emit();
          this.close.emit();
        }, 1500);
      },
      error: (err) => {
        console.error('Accept escalation failed:', err);
        this.acceptLoading.set(false);
        this.actionError.set(err.error?.message || this.translateService.instant('ESCALATION_DRAWER.TOAST_ACCEPT_FAIL'));
      }
    });
  }

  handleReject() {
    if (!this.escalation || !this.canTakeAction() || !this.rejectReason().trim()) return;
    this.rejectLoading.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);

    this.escalationService.rejectEscalation(
      this.escalation.id,
      { reason: this.rejectReason().trim() }
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.rejectLoading.set(false);
        this.actionSuccess.set(this.translateService.instant('ESCALATION_DRAWER.TOAST_REJECT_SUCCESS'));
        setTimeout(() => {
          this.updated.emit();
          this.close.emit();
        }, 1500);
      },
      error: (err) => {
        console.error('Reject escalation failed:', err);
        this.rejectLoading.set(false);
        this.actionError.set(err.error?.message || this.translateService.instant('ESCALATION_DRAWER.TOAST_REJECT_FAIL'));
      }
    });
  }

  handleReassign() {
    if (!this.escalation || !this.canTakeAction() || !this.selectedReassignAgentId()) return;
    this.reassignLoading.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);

    this.escalationService.reassignEscalation(
      this.escalation.id,
      { agentId: this.selectedReassignAgentId() }
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.reassignLoading.set(false);
        this.actionSuccess.set(this.translateService.instant('ESCALATION_DRAWER.TOAST_REASSIGN_SUCCESS'));
        setTimeout(() => {
          this.updated.emit();
          this.close.emit();
        }, 1500);
      },
      error: (err) => {
        console.error('Reassign escalation failed:', err);
        this.reassignLoading.set(false);
        this.actionError.set(err.error?.message || this.translateService.instant('ESCALATION_DRAWER.TOAST_REASSIGN_FAIL'));
      }
    });
  }

  goToTicket() {
    const ticketId = this.escalation?.ticketId;
    if (!ticketId) return;
    this.router.navigate(['/tickets', ticketId]);
    this.close.emit();
  }

  getStatusLabel(status: string): string {
    const displayStatus = mapEscalationStatus(status);
    const key = 'STATUS.' + displayStatus;
    const translated = this.translateService.instant(key);
    if (translated !== key) return translated;
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      ACCEPTED: 'Accepted',
      REJECTED: 'Rejected',
      REASSIGNED: 'Reassigned',
      CANCELLED: 'Cancelled',
      RESOLVED: 'Resolved'
    };
    return labels[displayStatus] || displayStatus;
  }

  getPriorityLabel(priority?: string): string {
    if (!priority) return this.translateService.instant('LIST.EMPTY_UNTITLED');
    const key = 'PRIORITY.' + priority;
    const translated = this.translateService.instant(key);
    if (translated !== key) return translated;
    const labels: Record<string, string> = {
      BASSE: 'Low', MOYENNE: 'Medium', HAUTE: 'High'
    };
    return labels[priority] || priority;
  }

  getTicketStatusLabel(status?: string): string {
    if (!status) return this.translateService.instant('LIST.EMPTY_UNTITLED');
    const key = 'STATUS.' + status;
    const translated = this.translateService.instant(key);
    if (translated !== key) return translated;
    const labels: Record<string, string> = {
      NEW: 'New', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress',
      PENDING: 'Pending', RESOLVED: 'Resolved', CLOSED: 'Closed',
      REOPENED: 'Reopened', CANCELLED: 'Cancelled'
    };
    return labels[status] || status;
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getAgentName(agent: AgentProfileResponse): string {
    return agent.fullName || agent.userId;
  }

  isAgentAvailable(agent: AgentProfileResponse): boolean {
    return agent.isOnline;
  }

  onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
