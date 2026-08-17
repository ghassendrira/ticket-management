export interface User {
  id: string;
  username: string;
  role: 'ADMIN' | 'AGENT' | 'MANAGER';
  fullName: string;
}
