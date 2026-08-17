import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment.development';

const API_URL = `${environment.apiUrl}/api`;

export interface AttachmentResponse {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedById: string;
  uploadedByName: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
];

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  constructor(private http: HttpClient) {}

  validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File "${file.name}" exceeds max size of 20MB` };
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowedExts = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx', 'txt'];
      if (!allowedExts.includes(ext || '')) {
        return { valid: false, error: `File "${file.name}" has invalid type. Allowed: PDF, PNG, JPG, DOC, DOCX, XLS, XLSX, TXT` };
      }
    }
    return { valid: true };
  }

  getAttachments(ticketId: string) {
    return this.http.get<AttachmentResponse[]>(`${API_URL}/tickets/${ticketId}/attachments`)
      .pipe(catchError(this.handleError));
  }

  uploadAttachment(ticketId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<AttachmentResponse>(`${API_URL}/tickets/${ticketId}/attachments`, formData)
      .pipe(catchError(this.handleError));
  }

  downloadAttachment(attachmentId: string) {
    return this.http.get(`${API_URL}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
      observe: 'response'
    }).pipe(catchError(this.handleError));
  }

  deleteAttachment(attachmentId: string) {
    return this.http.delete<void>(`${API_URL}/attachments/${attachmentId}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    console.error('Attachment service error:', error);
    return throwError(() => error);
  }
}
