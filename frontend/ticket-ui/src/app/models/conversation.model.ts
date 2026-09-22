import { Message } from './message.model';

export type ConversationStatus = 'OPEN' | 'RESOLVED' | 'ESCALATED';
export type FeedbackValue = 'UP' | 'DOWN';

export interface Conversation {
  id: string;
  customerId: string;
  status: ConversationStatus;
  title?: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  supportTicketId?: string | null;
  supportTicketStatus?: string | null;
}
