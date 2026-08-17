import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment.development';

const API_URL = environment.apiUrl;

export interface SimilarTicketResponse {
  ticketId: string;
  similarityScore: number;
  resolutionSummary: string;
}

export interface TranslationResponse {
  translatedText: string;
  targetLanguageCode: string;
  targetLanguageName: string;
  provider: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  constructor(private http: HttpClient) {}

  getSummary(title: string, description: string) {
    return this.http.post<{ summary: string }>(`${API_URL}/api/ai/summary`, {
      title,
      description
    }).pipe(catchError(this.handleError));
  }

  getSuggestedResponse(title: string, description: string) {
    return this.http.post<{ suggestedReply: string }>(`${API_URL}/api/ai/suggest-response`, {
      title,
      description
    }).pipe(catchError(this.handleError));
  }

  translateText(text: string, targetLanguageCode: string, targetLanguageName: string) {
    return this.http.post<TranslationResponse>(`${API_URL}/api/ai/translate`, {
      text,
      targetLanguageCode,
      targetLanguageName
    }).pipe(catchError(this.handleError));
  }

  findSimilarTickets(ticketId: string, content: string) {
    const params = new HttpParams().set('content', content);
    return this.http.get<SimilarTicketResponse[]>(`${API_URL}/api/tickets/${ticketId}/similar`, { params })
      .pipe(catchError(this.handleError));
  }

  storeEmbedding(ticketId: string, ticketContent: string, resolutionSummary: string) {
    return this.http.post<void>(`${API_URL}/api/tickets/${ticketId}/embedding`, {
      ticketContent,
      resolutionSummary
    }).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    console.error('AI service error:', error);
    console.error('Error status:', error.status);
    console.error('Error message:', error.message);
    console.error('Error body:', error.error);
    return throwError(() => error);
  }
}
