import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Conversation, FeedbackValue, Message } from '../../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly apiUrl = `${environment.conversationApiUrl}/conversations`;

  constructor(private readonly http: HttpClient) {}

  listConversations(customerId?: string): Observable<Conversation[]> {
    const params = customerId ? new HttpParams().set('customerId', customerId) : undefined;
    return this.http.get<Conversation[]>(this.apiUrl, { params });
  }

  getConversation(conversationId: string): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.apiUrl}/${conversationId}`);
  }

  createConversation(customerId?: string): Observable<Conversation> {
    const payload = customerId?.trim() ? { customerId: customerId.trim() } : {};
    return this.http.post<Conversation>(this.apiUrl, payload);
  }

  sendMessage(conversationId: string, content: string): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.apiUrl}/${conversationId}/messages`, {
      role: 'USER',
      content
    });
  }

  submitFeedback(messageId: string, value: FeedbackValue): Observable<void> {
    return this.http.post<void>(`${environment.conversationApiUrl}/messages/${messageId}/feedback`, {
      value
    });
  }
}
