import { Routes, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { LandingComponent } from './features/landing/landing.component';
import { PublicShellComponent } from './core/layout/public-shell.component';
import { DashboardLayoutComponent } from './features/dashboard/components/dashboard-layout.component';
import { DashboardHomeComponent } from './features/dashboard/pages/dashboard-home.component';
import { AdminDashboardPageComponent } from './features/admin/dashboard/admin-dashboard-page.component';
import { AdminDocumentsPageComponent } from './features/admin/documents/admin-documents-page.component';
import { AdminCategoriesPageComponent } from './features/admin/categories/admin-categories-page.component';
import { AdminAnalyticsPageComponent } from './features/admin/analytics/admin-analytics-page.component';
import { SettingsComponent } from './features/dashboard/pages/settings.component';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { ChangePasswordComponent } from './features/auth/pages/change-password/change-password.component';
import { UsersListComponent } from './features/users/pages/users-list/users-list.component';
import { TicketsListComponent } from './features/tickets/pages/tickets-list/tickets-list.component';
import { TicketDetailComponent } from './features/tickets/pages/ticket-detail/ticket-detail.component';
import { TeamManagementComponent } from './features/team-management/pages/team-management.component';
import { EscalationsListComponent } from './features/escalations/pages/escalations-list/escalations.component';
import { AgentTeamComponent } from './features/team/pages/agent-team.component';
import { AuthService } from './core/services/auth.service';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

const agentTeamOnlyGuard = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();
  if (!user) {
    return true;
  }
  if (user.role === 'AGENT') {
    return true;
  }
  if (user.role === 'MANAGER' || user.role === 'ADMIN') {
    return router.parseUrl('/teams');
  }
  return router.parseUrl('/dashboard');
};

export const routes: Routes = [
  { path: 'landing', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'change-password', component: ChangePasswordComponent },
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/forgot-password', component: ChangePasswordComponent },

  {
    path: '',
    component: PublicShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/client/home/home-page.component').then((m) => m.HomePageComponent)
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./features/client/chat/chat-page.component').then((m) => m.ChatPageComponent)
      },
      {
        path: 'chat/:conversationId',
        loadComponent: () =>
          import('./features/client/chat/chat-page.component').then((m) => m.ChatPageComponent)
      },
      {
        path: 'historique',
        loadComponent: () =>
          import('./features/client/history/history-page.component').then((m) => m.HistoryPageComponent)
      },
      {
        path: 'escalade/:conversationId',
        loadComponent: () =>
          import('./features/client/escalation/escalation-page.component').then(
            (m) => m.EscalationPageComponent
          )
      }
    ]
  },

  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardHomeComponent },
      { path: 'tickets', component: TicketsListComponent },
      { path: 'tickets/:id', component: TicketDetailComponent },
      {
        path: 'teams',
        component: TeamManagementComponent,
        canActivate: [roleGuard(['MANAGER', 'ADMIN'])]
      },
      { path: 'team', component: AgentTeamComponent, canActivate: [agentTeamOnlyGuard] },
      {
        path: 'analytics',
        component: AdminAnalyticsPageComponent,
        canActivate: [roleGuard(['ADMIN', 'MANAGER'])]
      },
      {
        path: 'ai',
        component: AdminDashboardPageComponent,
        canActivate: [roleGuard(['ADMIN', 'MANAGER'])]
      },
      {
        path: 'documents',
        component: AdminDocumentsPageComponent,
        canActivate: [roleGuard(['ADMIN', 'MANAGER'])]
      },
      {
        path: 'categories',
        component: AdminCategoriesPageComponent,
        canActivate: [roleGuard(['ADMIN', 'MANAGER'])]
      },
      { path: 'users', component: UsersListComponent, canActivate: [roleGuard(['ADMIN', 'MANAGER'])] },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./features/users/pages/user-detail/user-detail.component').then(
            (m) => m.UserDetailComponent
          ),
        canActivate: [roleGuard(['ADMIN', 'MANAGER', 'AGENT'])]
      },
      { path: 'escalations', component: EscalationsListComponent },
      { path: 'settings', component: SettingsComponent }
    ]
  },

  { path: '**', redirectTo: '' }
];
