// frontend/src/app/models.ts
export type Status = 'Open' | 'In Progress' | 'Blocked' | 'Done';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Role = 'Admin' | 'Agent';
export type CommentType = 'General' | 'Status update' | 'System-generated';

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Request {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  dueDate: string;
  assignedAgentId?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  requestId: string;
  author: string;
  text: string;
  type: CommentType;
  createdAt: string;
}

export const validTransitions: Record<Status, Status[]> = {
  'Open': ['In Progress', 'Blocked'],
  'In Progress': ['Done', 'Blocked'],
  'Blocked': ['In Progress'],
  'Done': []
};

export function isOverdue(request: Request): boolean {
  return request.status !== 'Done' && new Date(request.dueDate) < new Date();
}

export function shouldEscalate(request: Request): boolean {
  if (request.status === 'Done' || request.priority === 'Critical') return false;
  const dueDate = new Date(request.dueDate);
  const now = new Date();
  const daysOverdue = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysOverdue > 3;
}