import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  TicketService,
  EscalationResponse,
  EscalationStatus,
  Priority,
  TicketStatus
} from '../../../../core/services/ticket.service';
import { AuthService, UserResponse } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { EscalationDrawerComponent } from '../../components/escalation-drawer/escalation-drawer.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-escalations-list',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    AlertComponent,
    PaginationComponent,
    EscalationDrawerComponent
  ],
  templateUrl: './escalations.component.html',
  styleUrls: ['./escalations.component.scss']
})
export class EscalationsListComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private ticketService = inject(TicketService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);

  escalations = signal<EscalationResponse[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  searchQuery = signal('');
  statusFilter = signal<EscalationStatus | ''>('');
  dateFrom = signal('');
  dateTo = signal('');
  agentFilter = signal<string>('');

  sortBy = signal<'createdAt' | 'updatedAt' | 'priority'>('createdAt');
  sortDirection = signal<'asc' | 'desc'>('desc');

  currentPage = signal(1);
  pageSize = 10;

  agents = signal<UserResponse[]>([]);
  selectedEscalation = signal<EscalationResponse | null>(null);
  drawerOpen = signal(false);

  isManager = computed(() =>
    this.authService.currentUser()?.role === 'MANAGER' || this.authService.currentUser()?.role === 'ADMIN'
  );

  totalCount = computed(() => this.filteredEscalations().length);
  pendingCount = computed(() => this.escalations().filter(e => e.status === 'PENDING').length);
  acceptedCount = computed(() => this.escalations().filter(e => e.status === 'ACCEPTED').length);
  rejectedCount = computed(() => this.escalations().filter(e => e.status === 'REJECTED').length);
  reassignedCount = computed(() => this.escalations().filter(e => e.status === 'REASSIGNED').length);

  filteredEscalations = computed(() => {
    let list = [...this.escalations()];
    const user = this.authService.currentUser();

    if (!this.isManager() && user?.role === 'AGENT') {
      list = list.filter(e => e.requestedByAgentId === user.id);
    }

    if (this.statusFilter()) {
      list = list.filter(e => e.status === this.statusFilter());
    }
    if (this.agentFilter()) {
      list = list.filter(e => e.requestedByAgentId === this.agentFilter());
    }
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(e =>
        (e.ticketTitle || '').toLowerCase().includes(q) ||
        (e.requestedByAgentName || '').toLowerCase().includes(q) ||
        (e.reason || '').toLowerCase().includes(q) ||
        (e.ticketRequestId || '').toLowerCase().includes(q)
      );
    }
    if (this.dateFrom()) {
      const from = new Date(this.dateFrom());
      list = list.filter(e => new Date(e.createdAt) >= from);
    }
    if (this.dateTo()) {
      const to = new Date(this.dateTo() + 'T23:59:59');
      list = list.filter(e => new Date(e.createdAt) <= to);
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (this.sortBy()) {
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'priority':
          const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          cmp = (order[a.ticketPriority || 'LOW'] || 3) - (order[b.ticketPriority || 'LOW'] || 3);
          break;
      }
      return this.sortDirection() === 'asc' ? cmp : -cmp;
    });

    return list;
  });

  paginatedEscalations = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredEscalations().slice(start, start + this.pageSize);
  });

  ngOnInit() {
    this.loadEscalations();
    if (this.isManager()) {
      this.loadAgents();
    }
  }

  loadEscalations() {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.ticketService.listEscalations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.escalations.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Failed to load escalations:', err);
          this.errorMessage.set(err.error?.message || 'Failed to load escalations');
          this.loading.set(false);
        }
      });
  }

  async loadAgents() {
    try {
      const agents = await firstValueFrom(this.userService.getUsers(undefined, 'AGENT', true));
      this.agents.set(agents);
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  }

  onFilterChange() {
    this.currentPage.set(1);
  }

  toggleSortDirection() {
    this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
  }

  resetFilters() {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.agentFilter.set('');
    this.sortBy.set('createdAt');
    this.sortDirection.set('desc');
    this.currentPage.set(1);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  openDrawer(escalation: EscalationResponse) {
    this.selectedEscalation.set(escalation);
    this.drawerOpen.set(true);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
    setTimeout(() => this.selectedEscalation.set(null), 300);
  }

  onEscalationUpdated() {
    this.loadEscalations();
  }

  viewTicket(ticketId: string) {
    this.router.navigate(['/tickets', ticketId]);
  }

  getStatusLabel(status: EscalationStatus): string {
    const labels: Record<EscalationStatus, string> = {
      PENDING: 'Pending',
      ACCEPTED: 'Accepted',
      REJECTED: 'Rejected',
      REASSIGNED: 'Reassigned',
      CANCELLED: 'Cancelled',
      RESOLVED: 'Resolved'
    };
    return labels[status] || status;
  }

  getPriorityLabel(priority?: Priority): string {
    if (!priority) return 'N/A';
    const labels: Record<Priority, string> = {
      LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical'
    };
    return labels[priority];
  }

  getTicketStatusLabel(status?: TicketStatus): string {
    if (!status) return 'N/A';
    const labels: Record<TicketStatus, string> = {
      NEW: 'New', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress',
      PENDING: 'Pending', RESOLVED: 'Resolved', CLOSED: 'Closed',
      REOPENED: 'Reopened', CANCELLED: 'Cancelled'
    };
    return labels[status];
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
