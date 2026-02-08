import { User, Priority, Status } from '@/types';
import {
    PRIORITY_COLORS,
    PRIORITY_COLORS_BORDERED,
    STATUS_COLORS,
    STATUS_COLORS_BACKLOG,
    ROLE_COLORS,
    ACTION_DISPLAY
} from './constants';
import { format, formatDistanceToNow, subDays, subMonths, subYears, addDays, isAfter, isBefore } from 'date-fns';

// ============================================
// Date Formatting Utilities (using date-fns)
// ============================================

/**
 * Format a date string for display (e.g., "Feb 8, 2026")
 */
export function formatDate(dateStr: string): string {
    try {
        return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
        return 'Unknown date';
    }
}

/**
 * Format a date string with time (e.g., "Feb 8, 2026, 10:30 PM")
 */
export function formatDateTime(dateStr: string): string {
    try {
        return format(new Date(dateStr), 'MMM d, yyyy, h:mm a');
    } catch {
        return 'Unknown date';
    }
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateStr: string): string {
    try {
        return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
        return 'recently';
    }
}

/**
 * Get the start date for a time range filter
 */
export function getTimeRangeDate(range: 'week' | 'month' | 'quarter' | 'year' | 'all'): Date {
    const now = new Date();
    switch (range) {
        case 'week':
            return subDays(now, 7);
        case 'month':
            return subDays(now, 30);
        case 'quarter':
            return subDays(now, 90);
        case 'year':
            return subYears(now, 1);
        case 'all':
        default:
            return new Date(0);
    }
}

/**
 * Check if a date is within the next N days
 */
export function isDueWithinDays(dateStr: string, days: number): boolean {
    try {
        const dueDate = new Date(dateStr);
        const now = new Date();
        const futureDate = addDays(now, days);
        return isAfter(dueDate, now) && isBefore(dueDate, futureDate);
    } catch {
        return false;
    }
}

/**
 * Check if a date is overdue
 */
export function isOverdue(dateStr: string): boolean {
    try {
        return isBefore(new Date(dateStr), new Date());
    } catch {
        return false;
    }
}

// ============================================
// File Utilities
// ============================================

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ============================================
// User Utilities
// ============================================

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
