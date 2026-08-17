import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TicketService, TicketResponse, Priority, Category, TicketStatus } from '../../../../core/services/ticket.service';
import { ErrorMessageService, NormalizedHttpError } from '../../../../core/services/error-message.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { ErrorOverlayComponent } from '../../../../shared/components/error-overlay/error-overlay.component';
import { NewTicketModalComponent } from '../../components/new-ticket-modal.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-tickets-list',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonComponent,
    AlertComponent,
    ErrorOverlayComponent,
    NewTicketModalComponent,
    PaginationComponent
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">{{ 'LIST.TITLE' | translate }}</h1>
        <app-button (click)="showCreateModal.set(true)">+ {{ 'LIST.NEW_TICKET' | translate }}</app-button>
      </div>

      @if (errorOverlay()) {
        <app-error-overlay
          [title]="errorOverlay()?.title ?? null"
          [message]="errorOverlay()?.message ?? null"
          (close)="errorOverlay.set(null)"
        />
      }

      @if (errorMessage()) {
        <app-alert type="error" class="mb-4">{{ errorMessage() }}</app-alert>
      }

      <div class="filters-bar">
        <input
          type="text"
          placeholder="{{ 'LIST.SEARCH_PLACEHOLDER' | translate }}"
          [(ngModel)]="searchQuery"
          (ngModelChange)="onFilterOrSortChange()"
          class="search-input"
        />
        <select
          [(ngModel)]="statusFilter"
          (change)="onFilterOrSortChange()"
          class="filter-select"
        >
          <option value="">{{ 'LIST.ALL_STATUSES' | translate }}</option>
          <option value="NEW">{{ 'STATUS.NEW' | translate }}</option>
          <option value="ASSIGNED">{{ 'STATUS.ASSIGNED' | translate }}</option>
          <option value="IN_PROGRESS">{{ 'STATUS.IN_PROGRESS' | translate }}</option>
          <option value="PENDING">{{ 'STATUS.PENDING' | translate }}</option>
          <option value="RESOLVED">{{ 'STATUS.RESOLVED' | translate }}</option>
          <option value="CLOSED">{{ 'STATUS.CLOSED' | translate }}</option>
          <option value="REOPENED">{{ 'STATUS.REOPENED' | translate }}</option>
        </select>
        <select
          [(ngModel)]="priorityFilter"
          (change)="onFilterOrSortChange()"
          class="filter-select"
        >
          <option value="">{{ 'LIST.ALL_PRIORITIES' | translate }}</option>
          <option value="LOW">{{ 'PRIORITY.LOW' | translate }}</option>
          <option value="MEDIUM">{{ 'PRIORITY.MEDIUM' | translate }}</option>
          <option value="HIGH">{{ 'PRIORITY.HIGH' | translate }}</option>
          <option value="CRITICAL">{{ 'PRIORITY.CRITICAL' | translate }}</option>
        </select>
        <select
          [(ngModel)]="categoryFilter"
          (change)="onFilterOrSortChange()"
          class="filter-select"
        >
          <option value="">{{ 'LIST.ALL_CATEGORIES' | translate }}</option>
          <option value="ACCOUNT_ACCESS">{{ 'CATEGORY.ACCOUNT_ACCESS' | translate }}</option>
          <option value="BILLING">{{ 'CATEGORY.BILLING' | translate }}</option>
          <option value="TECHNICAL">{{ 'CATEGORY.TECHNICAL' | translate }}</option>
          <option value="ORDER">{{ 'CATEGORY.ORDER' | translate }}</option>
          <option value="DELIVERY">{{ 'CATEGORY.DELIVERY' | translate }}</option>
          <option value="SECURITY">{{ 'CATEGORY.SECURITY' | translate }}</option>
          <option value="INFORMATION">{{ 'CATEGORY.INFORMATION' | translate }}</option>
        </select>
        <select
          [(ngModel)]="sortBy"
          (change)="onFilterOrSortChange()"
          class="filter-select"
        >
          <option value="createdAt">{{ 'LIST.SORT_CREATED' | translate }}</option>
          <option value="updatedAt">{{ 'LIST.SORT_UPDATED' | translate }}</option>
          <option value="priority">{{ 'LIST.SORT_PRIORITY' | translate }}</option>
          <option value="status">{{ 'LIST.SORT_STATUS' | translate }}</option>
        </select>
        <button
          (click)="sortDirection.set(sortDirection() === 'asc' ? 'desc' : 'asc'); onFilterOrSortChange()"
          class="sort-button"
        >
          {{ sortDirection() === 'asc' ? '↑' : '↓' }}
        </button>
        <button (click)="resetFiltersAndSorting()" class="reset-button">{{ 'APP.CANCEL' | translate }}</button>
      </div>

      <div class="table-card">
        <div class="table-container">
          <table class="tickets-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{{ 'TICKET.DETAILS' | translate }}</th>
                <th>{{ 'TICKET.PRIORITY' | translate }}</th>
                <th>{{ 'TICKET.STATUS' | translate }}</th>
                <th>{{ 'TICKET.CATEGORY' | translate }}</th>
                <th>{{ 'TICKET.ASSIGNED_TO' | translate }}</th>
                <th>{{ 'TICKET.CREATED_AT' | translate }}</th>
                <th>{{ 'USERS.TABLE.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (ticket of paginatedTickets(); track ticket.id) {
                <tr>
                  <td class="ticket-id">{{ ticket.requestId || ticket.id.substring(0, 8) }}</td>
                  <td class="ticket-title">{{ ticket.title }}</td>
                  <td>
                    <span class="priority-badge" [class]="ticket.priority.toLowerCase()">
                      {{ getPriorityLabel(ticket.priority) | translate }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" [class]="ticket.status.toLowerCase()">
                      {{ getStatusLabel(ticket.status) | translate }}
                    </span>
                  </td>
                  <td>{{ getCategoryLabel(ticket.category) | translate }}</td>
                  <td>{{ ticket.assignedAgentName || ('TICKET.UNASSIGNED' | translate) }}</td>
                  <td>{{ formatDate(ticket.createdAt) }}</td>
                  <td>
                    <div class="actions">
                      <button class="action-btn" (click)="viewTicket(ticket.id)">{{ 'LIST.VIEW' | translate }}</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-pagination
          [totalItems]="filteredAndSortedTickets().length"
          [pageSize]="pageSize"
          [currentPage]="currentPage()"
          (pageChange)="onPageChange($event)"
        />
      </div>
    </div>

    @if (showCreateModal()) {
      <app-new-ticket-modal
        (closed)="showCreateModal.set(false)"
        (ticketCreated)="loadTickets()"
      />
    }
  `,
  styles: [`
    .page-container {
      padding: 2rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .page-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2rem;
      color: var(--text-primary);
    }

    .table-card {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 1.5rem;
    }

    .table-container {
      overflow-x: auto;
    }

    .tickets-table {
      width: 100%;
      border-collapse: collapse;
    }

    .tickets-table th, .tickets-table td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    .tickets-table th {
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .ticket-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .ticket-title {
      font-weight: 500;
    }

    .priority-badge, .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .priority-badge.low {
      background-color: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .priority-badge.medium {
      background-color: rgba(234, 179, 8, 0.1);
      color: #eab308;
    }

    .priority-badge.high {
      background-color: rgba(249, 115, 22, 0.1);
      color: #f97316;
    }

    .priority-badge.critical {
      background-color: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .status-badge.new {
      background-color: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }

    .status-badge.assigned {
      background-color: rgba(96, 165, 250, 0.1);
      color: #60a5fa;
    }

    .status-badge.in_progress {
      background-color: rgba(139, 92, 246, 0.1);
      color: #8b5cf6;
    }

    .status-badge.pending {
      background-color: rgba(250, 204, 21, 0.1);
      color: #facc15;
    }

    .status-badge.resolved {
      background-color: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .status-badge.closed {
      background-color: rgba(107, 114, 128, 0.1);
      color: #6b7280;
    }

    .status-badge.reopened {
      background-color: rgba(249, 115, 22, 0.1);
      color: #f97316;
    }

    .status-badge.cancelled {
      background-color: rgba(156, 163, 175, 0.1);
      color: #9ca3af;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background-color: var(--bg-secondary);
      color: var(--text-primary);
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s ease;
    }

    .action-btn:hover {
      background-color: var(--border);
    }

    .mb-4 {
      margin-bottom: 1rem;
    }

    .filters-bar {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .search-input {
      padding: 0.875rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      background-color: var(--surface);
      color: var(--text-primary);
      font-size: 0.9375rem;
      outline: none;
      font-family: inherit;
      flex: 1 1 200px;
    }

    .search-input:focus {
      border-color: var(--accent-violet);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }

    .filter-select {
      padding: 0.875rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      background-color: var(--surface);
      color: var(--text-primary);
      font-size: 0.9375rem;
      outline: none;
      font-family: inherit;
      min-width: 150px;
    }

    .sort-button, .reset-button {
      padding: 0.875rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      background-color: var(--surface);
      color: var(--text-primary);
      cursor: pointer;
      font-size: 0.9375rem;
      transition: all 0.2s;
    }

    .sort-button:hover, .reset-button:hover {
      background-color: var(--bg-secondary);
    }
  `]
})
export class TicketsListComponent implements OnInit {
  private ticketService = inject(TicketService);
  private router = inject(Router);
  private errorMessageService = inject(ErrorMessageService);

  allTickets = signal<TicketResponse[]>([]);
  errorMessage = signal<string | null>(null);
  errorOverlay = signal<NormalizedHttpError | null>(null);
  showCreateModal = signal(false);
  currentPage = signal(1);
  pageSize = 10;

  searchQuery = signal('');
  statusFilter = signal<TicketStatus | ''>('');
  priorityFilter = signal<Priority | ''>('');
  categoryFilter = signal<Category | ''>('');
  sortBy = signal<keyof TicketResponse>('createdAt');
  sortDirection = signal<'asc' | 'desc'>('desc');

  filteredAndSortedTickets = computed(() => {
    let result = [...this.allTickets()];
    
    // Apply search
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q)
      );
    }

    // Apply status filter
    if (this.statusFilter()) {
      result = result.filter(t => t.status === this.statusFilter());
    }

    // Apply priority filter
    if (this.priorityFilter()) {
      result = result.filter(t => t.priority === this.priorityFilter());
    }

    // Apply category filter
    if (this.categoryFilter()) {
      result = result.filter(t => t.category === this.categoryFilter());
    }

    // Apply sorting
    result.sort((a, b) => {
      const aVal = a[this.sortBy()];
      const bVal = b[this.sortBy()];
      let comparison = 0;
      
      if (aVal && bVal) {
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else {
          comparison = aVal > bVal ? 1 : -1;
        }
      } else if (aVal) {
        comparison = 1;
      } else if (bVal) {
        comparison = -1;
      }

      return this.sortDirection() === 'desc' ? -comparison : comparison;
    });

    return result;
  });

  paginatedTickets = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredAndSortedTickets().slice(start, end);
  });

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.ticketService.getAllTickets().subscribe({
      next: tickets => {
        this.allTickets.set(tickets);
        this.resetFiltersAndSorting();
        this.errorMessage.set(null);
        this.errorOverlay.set(null);
      },
      error: err => {
        console.error('Failed to load tickets:', err);
        const normalized = this.errorMessageService.normalizeHttpError(err, 'ERROR.LOAD_TICKETS');
        this.errorOverlay.set(normalized);
        this.errorMessage.set(normalized.message);
      }
    });
  }

  resetFiltersAndSorting() {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.priorityFilter.set('');
    this.categoryFilter.set('');
    this.sortBy.set('createdAt');
    this.sortDirection.set('desc');
    this.currentPage.set(1);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  onFilterOrSortChange() {
    this.currentPage.set(1);
  }

  openCreateModal() {
    // Already handled in template
  }

  viewTicket(id: string) {
    this.router.navigate(['/tickets', id]);
  }

  getPriorityLabel(priority: Priority): string {
    return `PRIORITY.${priority}`;
  }

  getStatusLabel(status: TicketStatus): string {
    return `STATUS.${status}`;
  }

  getCategoryLabel(category: Category): string {
    return `CATEGORY.${category}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
