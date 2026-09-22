import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Document, DocumentStatus } from '../../models';
import { environment } from '../../../environments/environment';

export interface DocumentFilters {
  categoryId?: string;
  status?: DocumentStatus | '';
  query?: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly apiUrl = `${environment.kbApiUrl}/documents`;

  constructor(private readonly http: HttpClient) {}

  listDocuments(filters?: DocumentFilters): Observable<Document[]> {
    let params = new HttpParams();

    if (filters?.categoryId) {
      params = params.set('category', filters.categoryId);
    }

    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    if (filters?.query) {
      params = params.set('q', filters.query);
    }

    return this.http.get<Document[]>(this.apiUrl, { params });
  }

  getDocument(documentId: string): Observable<Document> {
    return this.http.get<Document>(`${this.apiUrl}/${documentId}`);
  }

  uploadDocument(
    file: File,
    categoryId: string,
    title?: string,
    version?: string,
    publicationStatus?: string
  ): Observable<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('categoryId', categoryId);
    if (title) {
      formData.append('title', title);
    }
    if (version) {
      formData.append('version', version);
    }
    if (publicationStatus) {
      formData.append('publicationStatus', publicationStatus);
    }
    return this.http.post<Document>(this.apiUrl, formData);
  }

  updateDocument(documentId: string, payload: Partial<Document>): Observable<Document> {
    return this.http.put<Document>(`${this.apiUrl}/${documentId}`, payload);
  }

  reindexDocument(documentId: string): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/${documentId}/reindex`, {});
  }

  deleteDocument(documentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${documentId}`);
  }

  toggleDocumentActive(documentId: string, active: boolean): Observable<Document> {
    const newStatus = active ? 'ACTIVE' : 'INACTIVE';
    return this.updateDocument(documentId, { status: newStatus } as any);
}

}
