import { Category } from './category.model';

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED';
export type PublicationStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Chunk {
  id: string;
  documentId: string;
  pageNumber: number;
  content: string;
  score?: number;
}

export interface DocumentHistoryItem {
  status: DocumentStatus;
  timestamp: string;
  note?: string;
}

export interface Document {
  id: string;
  name: string;
  categoryId: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt?: string;
  filePath?: string;
  fileType?: string;
  version?: string;
  publicationStatus?: PublicationStatus;
  active?: boolean;
  deleted?: boolean;
  chunksCount?: number;
  indexingHistory?: DocumentHistoryItem[];
  category?: Category;
}
