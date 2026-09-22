import { Routes } from '@angular/router';

import { PublicShellComponent } from '../../core/layout/public-shell.component';

export const CLIENT_ROUTES: Routes = [
  {
    path: '',
    component: PublicShellComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./home/home-page.component').then((module) => module.HomePageComponent)
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./chat/chat-page.component').then((module) => module.ChatPageComponent)
      },
      {
        path: 'chat/:conversationId',
        loadComponent: () =>
          import('./chat/chat-page.component').then((module) => module.ChatPageComponent)
      },
      {
        path: 'historique',
        loadComponent: () =>
          import('./history/history-page.component').then((module) => module.HistoryPageComponent)
      },
      {
        path: 'escalade/:conversationId',
        loadComponent: () =>
          import('./escalation/escalation-page.component').then(
            (module) => module.EscalationPageComponent
          )
      }
    ]
  }
];
