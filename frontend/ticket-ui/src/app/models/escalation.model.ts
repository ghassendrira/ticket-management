import { Category } from './category.model';

export type EscalationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EscalationPriorityFrench = 'BASSE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE';

export const PRIORITY_FR_TO_EN: Record<EscalationPriorityFrench, EscalationPriority> = {
  BASSE: 'LOW',
  MOYENNE: 'MEDIUM',
  HAUTE: 'HIGH',
  CRITIQUE: 'CRITICAL',
};

export const PRIORITY_EN_TO_FR: Record<EscalationPriority, EscalationPriorityFrench> = {
  LOW: 'BASSE',
  MEDIUM: 'MOYENNE',
  HIGH: 'HAUTE',
  CRITICAL: 'CRITIQUE',
};

export const PRIORITY_LABELS: Record<EscalationPriority, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

export const PRIORITY_COLORS: Record<EscalationPriority, string> = {
  LOW: '#10B981',
  MEDIUM: '#F59E0B',
  HIGH: '#EF4444',
  CRITICAL: '#991B1B',
};

export type EscalationCategory =
  | 'ACCOUNT_ACCESS'
  | 'BILLING'
  | 'TECHNICAL'
  | 'ORDER'
  | 'DELIVERY'
  | 'SECURITY'
  | 'INFORMATION';

export const CATEGORY_LABELS: Record<EscalationCategory, string> = {
  ACCOUNT_ACCESS: 'Accès compte',
  BILLING: 'Facturation',
  TECHNICAL: 'Technique',
  ORDER: 'Commande',
  DELIVERY: 'Livraison',
  SECURITY: 'Sécurité',
  INFORMATION: 'Information',
};

export interface Escalation {
  id: string;
  conversationId: string;
  categoryId: string;
  title: string;
  summary: string;
  priority: EscalationPriority;
  status: EscalationStatus;
  createdAt: string;
  updatedAt: string;
  agentId?: string;
  category?: Category;
  rejectionReason?: string;
  ticketId?: string | null;
  ticketStatus?: string | null;
}

export type EscalationStatus =
  | 'SUBMITTED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED'
  | 'ESCALATED'
  | 'PENDING'
  | 'ACCEPTED'
  | 'CANCELLED'
  | 'REASSIGNED';

export interface EscalationCreatedResponse {
  id: string;
  ticketId?: string | null;
  requestId?: string | null;
  ticketStatus?: string | null;
  ticketCreationStatus?: 'SUCCESS' | 'PENDING_UNAVAILABLE' | 'FAILED' | null;
  message?: string | null;
}

export interface EscalationData {
  id: string;
  conversationId: string;
  categoryId: string;
  title: string;
  summary: string;
  priority: EscalationPriority;
  status?: string;
}

export interface CreateEscalationPayload {
  title: string;
  summary: string;
  description?: string;
  conversationId?: string;
  requestId?: string;
  priority?: EscalationPriority;
  categoryId?: string;
  status?: string;
}

export interface PrepareEscalationResponse {
  category: EscalationCategory | null;
  aiCategoryRaw: string | null;
  categoryConfidence: number | null;
  priority: EscalationPriority | null;
  title: string;
  summary?: string | null;
  description?: string | null;
  resume?: string | null;
  aiAnalysisSuccess: boolean;
  errorMessage: string | null;
  categoryId: string | null;
}

export function mapEscalationToFrontend(raw: Escalation): Escalation {
  return raw;
}

export function mapEscalationStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'SUBMITTED': 'PENDING',
    'IN_PROGRESS': 'ACCEPTED',
    'RESOLVED': 'RESOLVED',
    'REJECTED': 'REJECTED',
    'ESCALATED': 'REASSIGNED',
    'PENDING': 'PENDING',
    'ACCEPTED': 'ACCEPTED',
    'CANCELLED': 'CANCELLED',
    'REASSIGNED': 'REASSIGNED'
  };
  return statusMap[status] || 'PENDING';
}
