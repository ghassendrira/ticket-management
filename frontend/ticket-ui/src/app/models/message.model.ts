export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt?: string | number;
  conversationId?: string;
  confidence?: number;
  sources?: string[];
  isFallbackGeneral?: boolean;
}
