export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Status = 'To Do' | 'In Progress' | 'Review' | 'Done';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string; // Optional
  createdAt?: string; // Optional for now
  role: 'Admin' | 'Manager' | 'Member';
  // AI/Health Extensions
  skills: string[];
  dob?: string;
  skillExperience?: Record<string, number>;
  wellnessScore: number; // 0-100
  maxWorkload: number;
  burnoutRisk?: 'Low' | 'Medium' | 'High'; // Derived
  // Contact Info
  phone?: string;
  officeAddress?: string;
  age?: number;
  timezone?: string;
  // Settings
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursWeekends?: boolean;
  twoFactorEnabled?: boolean;
  companySize?: 'Small (1-10)' | 'Medium (11-50)' | 'Large (50+)';
  // AI Settings
  burnoutSensitivity?: number;
  autoAssign?: boolean;
  skillMatchPriority?: boolean;
  aiDeadlines?: boolean;
  // Notification Settings
  authProvider?: string;
}

export interface Attachment {
  name: string;
  type: 'image' | 'video' | 'document';
  url: string;
  size?: string;
}

export interface Message {
  id: string;
  projectId?: string;
  userId: string;
  content: string;
  timestamp: string;
  attachment?: Attachment;
  conversationType?: 'project' | 'dm';
  recipientId?: string;
  threadRootId?: string | null;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string; // ISO Date
}

export interface TimeLog {
  userId: string;
  minutes: number;
  date: string; // ISO Date string
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  projectId?: string;
  startTime: string; // ISO Date
  endTime?: string | null; // ISO Date
  durationMinutes?: number | null;
  note?: string;
  createdAt: string;
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
  isPrivate?: boolean;
  dependencies?: string[]; // Array of task IDs this task depends on
}


export interface Document {
  id: string;
  projectId: string;
  title: string;
  type: 'page' | 'file';
  content?: string;
  filePath?: string;
  fileType?: string;
  size?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  key: string;
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

export type FormFieldType = 'text' | 'comment' | 'radiogroup' | 'checkbox' | 'dropdown' | 'rating' | 'date';

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
  choices?: string[]; // For radiogroup, checkbox, dropdown
  rateMin?: number;
  rateMax?: number;
  minLabel?: string;
  maxLabel?: string;
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

export interface Notification {
  id: string;
  userId: string;
  type: 'task_assigned' | 'task_status_changed' | 'new_message' | 'new_form' | 'general';
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  entityId?: string;
  projectId?: string;
  createdAt: string;
}

export interface Deployment {
  id: string;
  projectId: string;
  version: string;
  environment: 'Development' | 'Staging' | 'Production';
  status: 'In Progress' | 'Completed' | 'Failed';
  releaseNotes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentTask {
  deploymentId: string;
  taskId: string;
  linkedAt: string;
}

export interface DbSchema {
  users: User[];
  projects: Project[];
  tasks: Task[];
  activityLogs: ActivityLog[];
  messages: Message[];
  forms: Form[];
  formResponses: FormResponse[];
  notifications: Notification[];
  deployments: Deployment[];
  deploymentTasks: DeploymentTask[];
}
