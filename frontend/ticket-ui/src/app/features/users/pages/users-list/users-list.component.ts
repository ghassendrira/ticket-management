import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { UserService } from '../../../../core/services/user.service';
import { AuthService, UserResponse } from '../../../../core/services/auth.service';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { CreateUserModalComponent } from '../../components/create-user-modal.component';
import { EditUserModalComponent } from '../../components/edit-user-modal.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonComponent,
    AlertComponent,
    CreateUserModalComponent,
    EditUserModalComponent,
    PaginationComponent
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">{{ 'USERS.PAGE_TITLE' | translate }}</h1>
        <app-button (click)="openCreateModal()">+ {{ 'USERS.LIST.CREATE_USER' | translate }}</app-button>
      </div>

      @if (errorMessage()) {
        <app-alert type="error" class="mb-4">{{ errorMessage() }}</app-alert>
      }

      <div class="filters-bar">
        <div class="filter-group">
          <input
            type="text"
            [placeholder]="'USERS.LIST.SEARCH_PLACEHOLDER' | translate"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            class="search-input"
          />
        </div>
        <div class="filter-group">
          <select [(ngModel)]="roleFilter" (change)="loadUsers()" class="filter-select">
            <option value="">{{ 'USERS.LIST.ALL_ROLES' | translate }}</option>
            <option value="ADMIN">{{ 'USERS.ROLES.ADMIN' | translate }}</option>
            <option value="MANAGER">{{ 'USERS.ROLES.MANAGER' | translate }}</option>
            <option value="AGENT">{{ 'USERS.ROLES.AGENT' | translate }}</option>
          </select>
        </div>
        <div class="filter-group">
          <select [(ngModel)]="statusFilter" (change)="loadUsers()" class="filter-select">
            <option value="">{{ 'USERS.LIST.ALL_STATUSES' | translate }}</option>
            <option value="true">{{ 'USERS.STATUS.ACTIVE' | translate }}</option>
            <option value="false">{{ 'USERS.STATUS.INACTIVE' | translate }}</option>
          </select>
        </div>
      </div>

      <div class="table-card">
        <div class="table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th>{{ 'USERS.TABLE.NAME' | translate }}</th>
                <th>{{ 'USERS.TABLE.USERNAME' | translate }}</th>
                <th>{{ 'USERS.TABLE.EMAIL' | translate }}</th>
                <th>{{ 'USERS.TABLE.ROLE' | translate }}</th>
                <th>{{ 'USERS.TABLE.STATUS' | translate }}</th>
                <th>{{ 'USERS.TABLE.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (user of paginatedUsers(); track user.id) {
                <tr>
                  <td>{{ user.fullName }}</td>
                  <td>{{ user.username }}</td>
                  <td>{{ user.email }}</td>
                  <td>
                    <span class="role-badge" [class]="user.role.toLowerCase()">
                      {{ getRoleLabel(user.role) }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" [class.active]="user.active">
                      {{ user.active ? ('USERS.STATUS.ACTIVE' | translate) : ('USERS.STATUS.INACTIVE' | translate) }}
                    </span>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="action-btn" (click)="viewUser(user)">{{ 'LIST.VIEW' | translate }}</button>
                      <button class="action-btn" (click)="openEditModal(user)">{{ 'USERS.LIST.EDIT' | translate }}</button>
                      <button
                        class="action-btn"
                        [class.danger]="user.active"
                        (click)="toggleUserStatus(user)"
                      >
                        {{ user.active ? ('USERS.LIST.DEACTIVATE' | translate) : ('USERS.LIST.ACTIVATE' | translate) }}
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-pagination
          [totalItems]="allUsers().length"
          [pageSize]="pageSize"
          [currentPage]="currentPage()"
          (pageChange)="onPageChange($event)"
        />
      </div>
    </div>

    @if (showCreateModal()) {
      <app-create-user-modal
        (closed)="showCreateModal.set(false)"
        (userCreated)="loadUsers()"
      />
    }
    @if (showEditModal()) {
      <app-edit-user-modal
        [user]="selectedUser()!"
        (closed)="showEditModal.set(false)"
        (userUpdated)="loadUsers()"
      />
    }
  `,
  styles: [`
    .page-container { padding: 2rem; }

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

    .filters-bar {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .filter-group { display: flex; align-items: center; }

    .search-input {
      padding: 0.875rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      background-color: var(--surface);
      color: var(--text-primary);
      font-size: 0.9375rem;
      outline: none;
      font-family: inherit;
      width: 300px;
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

    .table-card {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 1.5rem;
    }

    .table-container { overflow-x: auto; }

    .users-table {
      width: 100%;
      border-collapse: collapse;
    }

    .users-table th, .users-table td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    .users-table th {
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .role-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .role-badge.admin { background-color: #ff444433; color: #ff4444; }
    .role-badge.manager { background-color: #ffaa0033; color: #ffaa00; }
    .role-badge.agent { background-color: #00aa0033; color: #00aa00; }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 500;
      background-color: #77777733;
      color: #777777;
    }
    .status-badge.active { background-color: #00aa0033; color: #00aa00; }

    .actions { display: flex; gap: 0.5rem; }

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
    .action-btn:hover { background-color: var(--border); }
    .action-btn.danger {
      color: #ef4444;
      border-color: #ef444433;
      background-color: #ef444411;
    }
    .action-btn.danger:hover { background-color: #ef444422; }

    .mb-4 { margin-bottom: 1rem; }
  `]
})
export class UsersListComponent implements OnInit {
  private userService = inject(UserService);
  private assignmentService = inject(AssignmentService);
  private authService = inject(AuthService);
  private router = inject(Router);

  allUsers = signal<UserResponse[]>([]);
  errorMessage = signal<string | null>(null);

  // plain fields for ngModel
  searchQuery = '';
  roleFilter = '';
  statusFilter = '';

  showCreateModal = signal(false);
  showEditModal = signal(false);
  selectedUser = signal<UserResponse | null>(null);

  currentPage = signal(1);
  pageSize = 10;

  paginatedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.allUsers().slice(start, start + this.pageSize);
  });

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.loadUsers();
  }

  onSearchChange() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.loadUsers(), 300);
  }

  loadUsers() {
    const activeParam =
      this.statusFilter === '' ? undefined : this.statusFilter === 'true';

    const currentUser = this.authService.currentUser();

    // Manager: only agents of their teams
    if (currentUser?.role === 'MANAGER') {
      this.assignmentService.getMyTeams().subscribe({
        next: teams => {
          if (!teams || teams.length === 0) {
            this.allUsers.set([]);
            this.currentPage.set(1);
            this.errorMessage.set(null);
            return;
          }

          const agentIdSet = new Set<string>();
          let remaining = teams.length;

          const finish = () => {
            this.userService.getUsers(undefined, 'AGENT', undefined).subscribe({
              next: users => {
                const filtered = users.filter(u => agentIdSet.has(u.id));
                this.allUsers.set(filtered);
                this.currentPage.set(1);
                this.errorMessage.set(null);
              },
              error: err => {
                console.error('Failed to load users:', err);
                this.errorMessage.set('Failed to load users');
              }
            });
          };

          teams.forEach(team => {
            const teamId = (team as any).id || (team as any).teamId;
            if (!teamId) {
              remaining -= 1;
              if (remaining === 0) finish();
              return;
            }

            this.assignmentService.getTeamAgents(teamId).subscribe({
              next: agents => {
                agents.forEach(a => {
                  if (a?.userId) agentIdSet.add(a.userId);
                });
                remaining -= 1;
                if (remaining === 0) finish();
              },
              error: err => {
                console.error('Failed to load team agents:', err);
                remaining -= 1;
                if (remaining === 0) finish();
              }
            });
          });
        },
        error: err => {
          console.error('Failed to load manager teams:', err);
          this.errorMessage.set('Failed to load manager teams');
        }
      });
      return;
    }

    // Admin / others
    this.userService
      .getUsers(
        this.searchQuery || undefined,
        this.roleFilter || undefined,
        activeParam
      )
      .subscribe({
        next: users => {
          this.allUsers.set(users);
          this.currentPage.set(1);
          this.errorMessage.set(null);
        },
        error: err => {
          console.error('Failed to load users:', err);
          this.errorMessage.set('Failed to load users');
        }
      });
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'MANAGER': return 'Manager';
      case 'AGENT': return 'Agent';
      default: return role;
    }
  }

  openCreateModal() {
    this.showCreateModal.set(true);
  }

  openEditModal(user: UserResponse) {
    this.selectedUser.set(user);
    this.showEditModal.set(true);
  }

  viewUser(user: UserResponse) {
    this.router.navigate(['/users', user.id]);
  }

  toggleUserStatus(user: UserResponse) {
    const confirmMessage = user.active
      ? 'This will log the user out and prevent them from accessing the platform. Continue?'
      : 'This will reactivate the user account. Continue?';

    if (!confirm(confirmMessage)) return;

    this.userService.toggleUserStatus(user.id, !user.active).subscribe({
      next: () => this.loadUsers(),
      error: err => {
        console.error('Failed to toggle user status:', err);
        this.errorMessage.set('Failed to update user status');
      }
    });
  }
}