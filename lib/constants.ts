import { Priority, Status } from '@/types';

// Priority color classes for badges
export const PRIORITY_COLORS: Record<Priority, string> = {
    Low: 'bg-gray-100 text-gray-600',
    Medium: 'bg-blue-100 text-blue-600',
    High: 'bg-orange-100 text-orange-600',
    Critical: 'bg-red-100 text-red-600',
};

// Priority color classes with borders (for TaskCard)
export const PRIORITY_COLORS_BORDERED: Record<Priority, string> = {
    Low: 'bg-gray-100 text-gray-800 border-gray-200',
    Medium: 'bg-blue-100 text-blue-800 border-blue-200',
    High: 'bg-orange-100 text-orange-800 border-orange-200',
    Critical: 'bg-red-100 text-red-800 border-red-200',
};

// Status color classes for badges
export const STATUS_COLORS: Record<Status, string> = {
    'To Do': 'bg-gray-100 text-gray-600',
    'In Progress': 'bg-blue-100 text-blue-600',
    'Review': 'bg-purple-100 text-purple-600',
    'Done': 'bg-green-100 text-green-600',
};

// Status color classes for BacklogView (with uppercase bold style)
export const STATUS_COLORS_BACKLOG: Record<Status, string> = {
    'To Do': 'bg-gray-100 text-gray-600',
    'In Progress': 'bg-blue-100 text-blue-700',
    'Review': 'bg-purple-100 text-purple-700',
    'Done': 'bg-green-100 text-green-700',
};

// Role color classes
export const ROLE_COLORS: Record<string, string> = {
    Admin: 'bg-purple-100 text-purple-700',
    Manager: 'bg-blue-100 text-blue-700',
    Member: 'bg-gray-100 text-gray-600',
};

// Action display info for activity logs - uses icon name instead of emoji
export const ACTION_DISPLAY: Record<string, { iconName: 'Sparkles' | 'ArrowRight' | 'Trash2' | 'MessageSquare' | 'Edit'; bgColor: string }> = {
    Created: { iconName: 'Sparkles', bgColor: 'bg-green-100 text-green-600' },
    Moved: { iconName: 'ArrowRight', bgColor: 'bg-blue-100 text-blue-600' },
    Deleted: { iconName: 'Trash2', bgColor: 'bg-red-100 text-red-600' },
    Commented: { iconName: 'MessageSquare', bgColor: 'bg-purple-100 text-purple-600' },
    Updated: { iconName: 'Edit', bgColor: 'bg-gray-100 text-gray-600' },
};

// Status options for dropdowns
export const STATUSES: Status[] = ['To Do', 'In Progress', 'Review', 'Done'];

// Priority options for dropdowns
export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Critical'];
