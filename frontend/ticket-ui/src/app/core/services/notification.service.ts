import { Injectable, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, interval, of, switchMap, tap, startWith } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment.development';
import { TokenStorageService } from './token-storage.service';

// --- TYPES ---
export enum NotificationType {
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  USER_CREATED = 'USER_CREATED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  NEW_TICKET = 'NEW_TICKET',
  CRITICAL_TICKET = 'CRITICAL_TICKET',
  ESCALATION_REQUEST = 'ESCALATION_REQUEST',
  ESCALATION_ACCEPTED = 'ESCALATION_ACCEPTED',
  ESCALATION_REJECTED = 'ESCALATION_REJECTED',
  ESCALATION_REASSIGNED = 'ESCALATION_REASSIGNED',
  TEAM_UPDATE = 'TEAM_UPDATE',
  SKILL_ADDED = 'SKILL_ADDED'
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  ticketId?: string | null;
  teamId?: string | null;
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationCategory {
  label: string;
  icon: string;
  types: NotificationType[];
}

// --- SERVICE ---
@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notifications = signal<Notification[]>([]);
  readonly unreadCount = signal<number>(0);
  readonly isOpen = signal<boolean>(false);

  readonly categories: NotificationCategory[] = [
    {
      label: 'New tickets',
      icon: '🎫',
      types: [NotificationType.NEW_TICKET]
    },
    {
      label: 'Critical tickets',
      icon: '🔥',
      types: [NotificationType.CRITICAL_TICKET]
    },
    {
      label: 'Escalation requests',
      icon: '🚨',
      types: [NotificationType.ESCALATION_REQUEST]
    },
    {
      label: 'Team updates',
      icon: '👤',
      types: [NotificationType.TEAM_UPDATE]
    }
  ];

  private readonly API_URL = `${environment.ticketApiUrl}/notifications`;
  private eventSource: EventSource | null = null;
  private audio: HTMLAudioElement | null = null;

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private router: Router
  ) {
    // Poll for unread count every 30 seconds (backup)
    interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchUnreadCount())
      )
      .subscribe();

    // Initialize SSE connection and preload notifications when user is authenticated
    effect(() => {
      const token = this.tokenStorage.getAccessToken();
      console.debug('NotificationService effect token:', token ? 'PRESENT' : 'MISSING');
      if (token) {
        this.connectSse(token);
        this.fetchNotifications().subscribe({
          next: (notifications) => console.debug('Fetched notifications on auth effect:', notifications.length),
          error: (err) => console.error('Error fetching notifications on auth effect:', err)
        });
      } else {
        this.disconnectSse();
      }
    });

    // Initialize audio
    this.audio = new Audio('/sounds/notification.wav');
  }

  getCategoryForType(type: NotificationType): NotificationCategory | undefined {
    return this.categories.find(cat => cat.types.includes(type));
  }

  getTypeIcon(type: NotificationType): string {
    const category = this.getCategoryForType(type);
    if (category) return category.icon;
    switch (type) {
      case NotificationType.TICKET_ASSIGNED: return '📋';
      case NotificationType.STATUS_CHANGED: return '📊';
      case NotificationType.COMMENT_ADDED: return '💬';
      case NotificationType.USER_CREATED: return '👤';
      case NotificationType.PASSWORD_RESET: return '🔑';
      case NotificationType.ESCALATION_ACCEPTED: return '✅';
      case NotificationType.ESCALATION_REJECTED: return '❌';
      case NotificationType.ESCALATION_REASSIGNED: return '🔄';
      case NotificationType.TEAM_UPDATE: return '👤';
      case NotificationType.SKILL_ADDED: return '🎯';
      default: return '🔔';
    }
  }

  private connectSse(token: string) {
    if (this.eventSource) return;
    console.debug('NotificationService.connectSse using URL:', `${this.API_URL}/stream?token=${encodeURIComponent(token)}`);
    this.eventSource = new EventSource(`${this.API_URL}/stream?token=${encodeURIComponent(token)}`);
    this.eventSource.onopen = () => {
      console.debug('Notification SSE connection opened');
    };
    this.eventSource.onmessage = (event) => {
      try {
        console.debug('Notification SSE message received:', event.data);
        const notification = this.normalizeNotification(JSON.parse(event.data));
        this.notifications.update(notifs => [notification, ...notifs]);
        if (!notification.isRead) {
          this.unreadCount.update(c => c + 1);
        }
        this.playNotificationSound();
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };
    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
    };
  }

  private disconnectSse() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private playNotificationSound() {
    if (this.audio) {
      this.audio.play().catch(() => {
        // Ignore if audio is blocked (user interaction required first)
      });
    }
  }

  toggleOpen() {
    console.debug('NotificationService.toggleOpen called. isOpen=', this.isOpen());
    if (!this.isOpen()) {
      // Fetch notifications when opening dropdown
      this.fetchNotifications().subscribe({
        next: (notifications) => console.debug('Fetched notifications on dropdown open:', notifications.length),
        error: (err) => console.error('Failed to fetch notifications on dropdown open:', err)
      });
    }
    this.isOpen.update(v => !v);
  }

  closeDropdown() {
    this.isOpen.set(false);
  }

  /**
   * Handle notification click - mark as read and navigate to related page.
   */
  handleNotificationClick(notification: Notification) {
    // Close the dropdown immediately
    this.closeDropdown();

    // Mark as read if unread
    if (!notification.isRead) {
      this.markAsRead(notification.id).subscribe();
    }

    // Navigate to ticket detail if there's a ticketId (ticket takes priority)
    if (notification.ticketId) {
      void this.router.navigate(['/tickets', notification.ticketId]).then((navigated) => {
        if (!navigated) {
          console.error('Navigation to ticket failed for notification:', notification);
        }
      });
      return;
    }

    // Navigate to team page if there's a teamId (for TEAM_UPDATE notifications)
    if (notification.teamId) {
      // Route strategy: navigate to /team (agent team view) which handles role-based redirects
      // The role guard on /team will redirect MANAGER/ADMIN to /teams if needed
      void this.router.navigate(['/team']).then((navigated) => {
        if (!navigated) {
          console.error('Navigation to team failed for notification:', notification);
        }
      });
      return;
    }

    console.warn('Notification click has no ticketId or teamId:', notification);
  }

  fetchNotifications() {
    console.debug('NotificationService.fetchNotifications calling:', `${this.API_URL}`);
    return this.http.get<Notification[]>(`${this.API_URL}`).pipe(
      tap(notifs => {
        console.debug('NotificationService.fetchNotifications received:', notifs.length);
        this.notifications.set(notifs.map(this.normalizeNotification));
      }),
      catchError((err) => {
        console.error('Failed to fetch notifications:', err);
        return of([] as Notification[]);
      })
    );
  }

  fetchUnreadCount() {
    return this.http.get<UnreadCountResponse>(`${this.API_URL}/unread-count`).pipe(
      tap(res => this.unreadCount.set(res.count)),
      catchError((err) => {
        console.error('Failed to fetch unread count:', err);
        return of({ count: 0 } as UnreadCountResponse);
      })
    );
  }

  private normalizeNotification(source: any): Notification {
    const ticketId = source.ticketId ?? source.ticket_id ?? null;
    const teamId = source.teamId ?? source.team_id ?? null;
    return {
      id: source.id,
      title: source.title,
      message: source.message,
      type: source.type,
      isRead: source.isRead,
      createdAt: source.createdAt,
      ticketId: ticketId ? String(ticketId) : null,
      teamId: teamId ? String(teamId) : null
    };
  }

  markAsRead(id: string) {
    return this.http.patch<Notification>(`${this.API_URL}/${id}/read`, {}).pipe(
      tap(() => {
        this.notifications.update(notifs => notifs.map(n =>
          n.id === id ? { ...n, isRead: true } : n
        ));
        this.unreadCount.update(c => Math.max(0, c - 1));
      }),
      catchError((err) => {
        console.error('Failed to mark as read:', err);
        return [];
      })
    );
  }

  markAllAsRead(): void {
    this.http.patch<void>(`${this.API_URL}/read-all`, {}).pipe(
      tap(() => {
        this.notifications.update(notifs => notifs.map(n => ({ ...n, isRead: true })));
        this.unreadCount.set(0);
      }),
      catchError((err) => {
        console.error('Failed to mark all as read:', err);
        return of(undefined);
      })
    ).subscribe();
  }
}
