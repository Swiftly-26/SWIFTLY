// src/app/models.ts

export type Status = 'Open' | 'In Progress' | 'Blocked' | 'Done';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Role = 'Admin' | 'Agent';
export type CommentType = 'General' | 'Status update' | 'System-generated';

// Represents a user (Admin or Agent)
export interface User {
  id: string;
  name: string;
  role: Role;
}

// Represents a work request
export interface Request {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  dueDate: string; // ISO string
  assignedAgentId?: string; // optional, can be unassigned
  tags?: string[]; // optional tags for categorization
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Represents a comment on a request
export interface Comment {
  id: string;
  requestId: string;
  author: string;
  text: string;
  type: CommentType;
  createdAt: string;
}

// Utility: maps for validating transitions
export const validTransitions: Record<Status, Status[]> = {
  'Open': ['In Progress', 'Blocked'],
  'In Progress': ['Done', 'Blocked'],
  'Blocked': ['In Progress'],
  'Done': []
};
