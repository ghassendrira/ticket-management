import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';

import {
  CreateEscalationPayload,
  Escalation,
  EscalationCreatedResponse,
  PrepareEscalationResponse,
} from '../../models/escalation.model';
import { environment } from '../../../environments/environment';

export type { Escalation };

export interface AcceptEscalationPayload {
  setInProgress: boolean;
  takeOwnership: boolean;
}

export interface RejectEscalationPayload {
  reason: string;
}

export interface ReassignEscalationPayload {
  agentId: string;
}

@Injectable({ providedIn: 'root' })
export class EscalationService {
  private readonly apiUrl = `${environment.conversationApiUrl}/escalations`;
  private readonly conversationsUrl = `${environment.conversationApiUrl}/conversations`;

  constructor(private readonly http: HttpClient) {}

  prepareEscalation(
    conversationId: string,
  ): Observable<PrepareEscalationResponse> {
    return this.http
      .get<PrepareEscalationResponse>(
        `${this.conversationsUrl}/${conversationId}/prepare-escalation`,
      )
      .pipe(
        catchError((err: unknown) => {
          if (
            err instanceof HttpErrorResponse &&
            err.status === 503 &&
            err.error &&
            typeof err.error === 'object' &&
            'aiAnalysisSuccess' in err.error
          ) {
            return of(err.error as PrepareEscalationResponse);
          }
          return throwError(() => err);
        }),
      );
  }

  listEscalations(): Observable<Escalation[]> {
    return this.http.get<Escalation[]>(this.apiUrl);
  }

  createEscalation(
    conversationId: string,
    payload: CreateEscalationPayload,
  ): Observable<EscalationCreatedResponse> {
    return this.http.post<EscalationCreatedResponse>(
      `${this.conversationsUrl}/${conversationId}/escalate`,
      payload,
    );
  }

  acceptEscalation(
    id: string,
    payload: AcceptEscalationPayload,
  ): Observable<Escalation> {
    return this.http.post<Escalation>(`${this.apiUrl}/${id}/accept`, payload);
  }

  rejectEscalation(
    id: string,
    payload: RejectEscalationPayload,
  ): Observable<Escalation> {
    return this.http.post<Escalation>(`${this.apiUrl}/${id}/reject`, payload);
  }

  reassignEscalation(
    id: string,
    payload: ReassignEscalationPayload,
  ): Observable<Escalation> {
    return this.http.post<Escalation>(`${this.apiUrl}/${id}/reassign`, payload);
  }
}
