import { User, Priority, Status } from '@/types';
import {
    PRIORITY_COLORS,
    PRIORITY_COLORS_BORDERED,
    STATUS_COLORS,
    STATUS_COLORS_BACKLOG,
    ROLE_COLORS,
    ACTION_DISPLAY
} from './constants';

/**
 * Get user name by ID from a list of users
 */
export function getUserName(users: User[], userId: string): string {
    if (userId === 'system') return 'System';
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown';
}

/**
 * Get priority color classes
 */
export function getPriorityColor(priority: Priority): string {
    return PRIORITY_COLORS[priority] || PRIORITY_COLORS.Low;
}

/**
 * Get priority color classes with borders
 */
export function getPriorityColorBordered(priority: Priority): string {
    return PRIORITY_COLORS_BORDERED[priority] || PRIORITY_COLORS_BORDERED.Low;
}

/**
 * Get status color classes
 */
export function getStatusColor(status: Status): string {
    return STATUS_COLORS[status] || STATUS_COLORS['To Do'];
}

/**
 * Get status color classes for backlog view
 */
export function getStatusColorBacklog(status: Status): string {
    return STATUS_COLORS_BACKLOG[status] || STATUS_COLORS_BACKLOG['To Do'];
}

/**
 * Get role color classes
 */
export function getRoleColor(role: string): string {
    return ROLE_COLORS[role] || ROLE_COLORS.Member;
}

/**
 * Get action display info (icon name and background color)
 */
export function getActionDisplay(action: string): { iconName: string; bgColor: string } {
    return ACTION_DISPLAY[action] || ACTION_DISPLAY.Updated;
}
