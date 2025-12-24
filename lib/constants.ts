import { Priority, Status } from '@/types';

// Priority color classes for badges
export const PRIORITY_COLORS: Record<Priority, string> = {
    Low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    Medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    High: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
    Critical: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
};

// Priority color classes with borders (for TaskCard) - vibrant colors for visibility
export const PRIORITY_COLORS_BORDERED: Record<Priority, string> = {
    Low: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-500/30 dark:border-teal-500',
    Medium: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/30 dark:border-blue-500',
    High: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-500/30 dark:border-orange-500',
    Critical: 'bg-red-100 text-red-600 border-red-300 dark:bg-red-500/30 dark:border-red-500',
};

// Status color classes for badges
export const STATUS_COLORS: Record<Status, string> = {
    'To Do': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    'In Progress': 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    'Review': 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
    'Done': 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300',
};

// Status color classes for BacklogView (with uppercase bold style)
export const STATUS_COLORS_BACKLOG: Record<Status, string> = {
    'To Do': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200',
    'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200',
    'Review': 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200',
    'Done': 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200',
};

// Role color classes
export const ROLE_COLORS: Record<string, string> = {
    Admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    Manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    Member: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

// Action display info for activity logs - uses icon name instead of emoji
export const ACTION_DISPLAY: Record<string, { iconName: 'Sparkles' | 'ArrowRight' | 'Trash2' | 'MessageSquare' | 'Edit'; bgColor: string }> = {
    Created: { iconName: 'Sparkles', bgColor: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' },
    Moved: { iconName: 'ArrowRight', bgColor: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' },
    Deleted: { iconName: 'Trash2', bgColor: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' },
    Commented: { iconName: 'MessageSquare', bgColor: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400' },
    Updated: { iconName: 'Edit', bgColor: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
};

// Status options for dropdowns
export const STATUSES: Status[] = ['To Do', 'In Progress', 'Review', 'Done'];

// Priority options for dropdowns
export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Critical'];
