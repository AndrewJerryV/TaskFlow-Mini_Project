export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Status = 'To Do' | 'In Progress' | 'Review' | 'Done';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string; // Optional
  createdAt?: string; // Optional for now
  role: 'Admin' | 'Manager' | 'Member';
}

export interface Message {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  timestamp: string;
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
  startDate?: string; // ISO Date
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

export type FormFieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'number';

export interface FormFieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: FormFieldOption[]; // For select, checkbox, radio
}

export interface Form {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  fields: FormField[];
  status: 'draft' | 'active' | 'closed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormResponse {
  id: string;
  formId: string;
  respondentId: string;
  answers: Record<string, any>; // fieldId -> answer value
  submittedAt: string;
}

export interface DbSchema {
  users: User[];
  projects: Project[];
  tasks: Task[];
  activityLogs: ActivityLog[];
  messages: Message[];
  forms: Form[];
  formResponses: FormResponse[];
}
