export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Status = 'To Do' | 'In Progress' | 'Review' | 'Done';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'Admin' | 'Manager' | 'Member';
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string; // ISO Date
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  assigneeId?: string; // User ID
  dueDate?: string; // ISO Date
  createdAt: string; // ISO Date
  updatedAt: string; // ISO Date
  tags: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  key: string; // e.g., "TF" -> TF-1
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  entityType: 'Task' | 'Project';
  entityId: string;
  action: 'Created' | 'Updated' | 'Deleted' | 'Moved' | 'Commented';
  details: string;
  userId: string;
  timestamp: string;
}

export interface DbSchema {
  users: User[];
  projects: Project[];
  tasks: Task[];
  activityLogs: ActivityLog[];
}
