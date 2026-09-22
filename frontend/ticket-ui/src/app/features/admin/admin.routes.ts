import { Routes } from '@angular/router';

import { adminGuard } from '../../core/guards/admin.guard';
import { AdminShellComponent } from '../../core/layout/admin-shell.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/admin-login-page.component').then((module) => module.AdminLoginPageComponent)
  },
  {
    path: '',
    component: AdminShellComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/admin-dashboard-page.component').then(
            (module) => module.AdminDashboardPageComponent
          )
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./documents/admin-documents-page.component').then(
            (module) => module.AdminDocumentsPageComponent
          )
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./categories/admin-categories-page.component').then(
            (module) => module.AdminCategoriesPageComponent
          )
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./analytics/admin-analytics-page.component').then(
            (module) => module.AdminAnalyticsPageComponent
          )
      }
    ]
  }
];
