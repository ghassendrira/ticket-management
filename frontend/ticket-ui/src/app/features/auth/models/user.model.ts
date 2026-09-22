export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'ADMIN' | 'AGENT' | 'MANAGER' | 'CUSTOMER' | string;
  fullName: string;
  active?: boolean;
  mustChangePassword?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  lastLoginAt?: string | Date;
  avatar?: string;
  teams?: Array<{ id: string; name: string }>;
}
