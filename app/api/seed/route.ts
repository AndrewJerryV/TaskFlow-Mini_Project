import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// Helper to get a date relative to today
function daysFromNow(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
}

function daysAgo(days: number): string {
    return daysFromNow(-days);
}

// ============================================
// SAMPLE DATA - Using valid UUIDs
// ============================================

// Fixed UUIDs for users (so we can reference them in other tables)
const USER_IDS = {
    andrew: '11111111-1111-1111-1111-111111111111',
    sarah: '22222222-2222-2222-2222-222222222222',
    mike: '33333333-3333-3333-3333-333333333333',
    emma: '44444444-4444-4444-4444-444444444444',
    alex: '55555555-5555-5555-5555-555555555555',
};

// Fixed UUIDs for projects
const PROJECT_IDS = {
    mobile: '66666666-6666-6666-6666-666666666666',
    website: '77777777-7777-7777-7777-777777777777',
    api: '88888888-8888-8888-8888-888888888888',
    analytics: '99999999-9999-9999-9999-999999999999',
};

// Fixed UUIDs for tasks
const TASK_IDS = {
    task1: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    task2: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    task3: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    task4: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    task5: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    task6: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    task7: '11111111-aaaa-aaaa-aaaa-111111111111',
    task8: '22222222-bbbb-bbbb-bbbb-222222222222',
    task9: '33333333-cccc-cccc-cccc-333333333333',
    task10: '44444444-dddd-dddd-dddd-444444444444',
    task11: '55555555-eeee-eeee-eeee-555555555555',
    task12: '66666666-ffff-ffff-ffff-666666666666',
    task13: '77777777-aaaa-bbbb-cccc-777777777777',
    task14: '88888888-bbbb-cccc-dddd-888888888888',
    task15: '99999999-cccc-dddd-eeee-999999999999',
    task16: 'aaaaaaaa-dddd-eeee-ffff-aaaaaaaaaaaa',
};

const users = [
    {
        id: USER_IDS.andrew,
        name: 'Andrew Jerry',
        email: 'andrew@taskflow.dev',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Andrew',
        role: 'Admin' as const,
        created_at: daysAgo(90),
    },
    {
        id: USER_IDS.sarah,
        name: 'Sarah Chen',
        email: 'sarah.chen@taskflow.dev',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        role: 'Manager' as const,
        created_at: daysAgo(85),
    },
    {
        id: USER_IDS.mike,
        name: 'Mike Rodriguez',
        email: 'mike.r@taskflow.dev',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
        role: 'Member' as const,
        created_at: daysAgo(60),
    },
    {
        id: USER_IDS.emma,
        name: 'Emma Wilson',
        email: 'emma.w@taskflow.dev',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
        role: 'Member' as const,
        created_at: daysAgo(45),
    },
    {
        id: USER_IDS.alex,
        name: 'Alex Kumar',
        email: 'alex.kumar@taskflow.dev',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
        role: 'Member' as const,
        created_at: daysAgo(30),
    },
];

const projects = [
    {
        id: PROJECT_IDS.mobile,
        name: 'TaskFlow Mobile App',
        description: 'Native mobile application for iOS and Android with offline support, push notifications, and real-time sync capabilities.',
        key: 'TFM',
        owner_id: USER_IDS.andrew,
        created_at: daysAgo(60),
        updated_at: daysAgo(1),
    },
    {
        id: PROJECT_IDS.website,
        name: 'Website Redesign 2024',
        description: 'Complete redesign of the marketing website with new branding, improved UX, and conversion optimization.',
        key: 'WEB',
        owner_id: USER_IDS.sarah,
        created_at: daysAgo(45),
        updated_at: daysAgo(2),
    },
    {
        id: PROJECT_IDS.api,
        name: 'API v2 Development',
        description: 'Next-generation REST and GraphQL API with improved performance, better documentation, and webhook support.',
        key: 'API',
        owner_id: USER_IDS.andrew,
        created_at: daysAgo(30),
        updated_at: daysAgo(1),
    },
    {
        id: PROJECT_IDS.analytics,
        name: 'Analytics Dashboard',
        description: 'Real-time analytics dashboard with custom reports, data visualization, and export capabilities.',
        key: 'ANA',
        owner_id: USER_IDS.sarah,
        created_at: daysAgo(20),
        updated_at: daysAgo(3),
    },
];

const tasks = [
    // TaskFlow Mobile App Tasks
    {
        id: TASK_IDS.task1,
        project_id: PROJECT_IDS.mobile,
        title: 'Implement push notification system',
        description: 'Set up Firebase Cloud Messaging for both iOS and Android. Handle notification permissions, badge counts, and deep linking from notifications.',
        status: 'In Progress' as const,
        priority: 'High' as const,
        assignee_id: USER_IDS.mike,
        due_date: daysFromNow(5),
        start_date: daysAgo(3),
        created_at: daysAgo(10),
        updated_at: daysAgo(1),
        tags: ['mobile', 'notifications', 'firebase'],
    },
    {
        id: TASK_IDS.task2,
        project_id: PROJECT_IDS.mobile,
        title: 'Design offline sync architecture',
        description: 'Create a robust offline-first architecture using SQLite for local storage. Handle conflict resolution when syncing with the server.',
        status: 'Done' as const,
        priority: 'Critical' as const,
        assignee_id: USER_IDS.andrew,
        due_date: daysAgo(2),
        start_date: daysAgo(15),
        created_at: daysAgo(20),
        updated_at: daysAgo(2),
        tags: ['architecture', 'offline', 'sync'],
    },
    {
        id: TASK_IDS.task3,
        project_id: PROJECT_IDS.mobile,
        title: 'Build task creation form',
        description: 'Create intuitive task creation UI with title, description, priority picker, due date selector, and assignee dropdown.',
        status: 'Review' as const,
        priority: 'Medium' as const,
        assignee_id: USER_IDS.emma,
        due_date: daysFromNow(2),
        start_date: daysAgo(5),
        created_at: daysAgo(8),
        updated_at: daysAgo(1),
        tags: ['ui', 'forms', 'mobile'],
    },
    {
        id: TASK_IDS.task4,
        project_id: PROJECT_IDS.mobile,
        title: 'Implement biometric authentication',
        description: 'Add Face ID and Touch ID support for iOS, fingerprint authentication for Android. Include fallback to PIN code.',
        status: 'To Do' as const,
        priority: 'Medium' as const,
        assignee_id: USER_IDS.alex,
        due_date: daysFromNow(14),
        start_date: null,
        created_at: daysAgo(5),
        updated_at: daysAgo(5),
        tags: ['security', 'authentication', 'mobile'],
    },
    {
        id: TASK_IDS.task5,
        project_id: PROJECT_IDS.mobile,
        title: 'Create app store screenshots',
        description: 'Design and generate screenshots for App Store and Play Store listings in all required sizes and languages.',
        status: 'To Do' as const,
        priority: 'Low' as const,
        assignee_id: null,
        due_date: daysFromNow(30),
        start_date: null,
        created_at: daysAgo(3),
        updated_at: daysAgo(3),
        tags: ['design', 'marketing', 'app-store'],
    },

    // Website Redesign Tasks
    {
        id: TASK_IDS.task6,
        project_id: PROJECT_IDS.website,
        title: 'Create new design system',
        description: 'Establish comprehensive design system including color palette, typography, spacing, components, and documentation.',
        status: 'Done' as const,
        priority: 'Critical' as const,
        assignee_id: USER_IDS.emma,
        due_date: daysAgo(10),
        start_date: daysAgo(30),
        created_at: daysAgo(40),
        updated_at: daysAgo(10),
        tags: ['design', 'ui', 'documentation'],
    },
    {
        id: TASK_IDS.task7,
        project_id: PROJECT_IDS.website,
        title: 'Build landing page',
        description: 'Implement the new landing page with hero section, features overview, testimonials, pricing, and call-to-action sections.',
        status: 'In Progress' as const,
        priority: 'High' as const,
        assignee_id: USER_IDS.mike,
        due_date: daysFromNow(7),
        start_date: daysAgo(5),
        created_at: daysAgo(12),
        updated_at: daysAgo(1),
        tags: ['frontend', 'landing-page', 'marketing'],
    },
    {
        id: TASK_IDS.task8,
        project_id: PROJECT_IDS.website,
        title: 'Set up A/B testing framework',
        description: 'Integrate Google Optimize or similar tool for A/B testing. Set up first experiments for hero section and CTA buttons.',
        status: 'To Do' as const,
        priority: 'Medium' as const,
        assignee_id: USER_IDS.sarah,
        due_date: daysFromNow(14),
        start_date: null,
        created_at: daysAgo(7),
        updated_at: daysAgo(7),
        tags: ['analytics', 'testing', 'optimization'],
    },
    {
        id: TASK_IDS.task9,
        project_id: PROJECT_IDS.website,
        title: 'Optimize Core Web Vitals',
        description: 'Improve LCP, FID, and CLS scores. Implement lazy loading, optimize images, and minimize JavaScript bundle size.',
        status: 'Review' as const,
        priority: 'High' as const,
        assignee_id: USER_IDS.alex,
        due_date: daysFromNow(3),
        start_date: daysAgo(7),
        created_at: daysAgo(14),
        updated_at: daysAgo(2),
        tags: ['performance', 'seo', 'optimization'],
    },

    // API v2 Development Tasks
    {
        id: TASK_IDS.task10,
        project_id: PROJECT_IDS.api,
        title: 'Design GraphQL schema',
        description: 'Create comprehensive GraphQL schema with types, queries, mutations, and subscriptions. Include proper pagination and filtering.',
        status: 'Done' as const,
        priority: 'Critical' as const,
        assignee_id: USER_IDS.andrew,
        due_date: daysAgo(5),
        start_date: daysAgo(20),
        created_at: daysAgo(25),
        updated_at: daysAgo(5),
        tags: ['graphql', 'api', 'schema'],
    },
    {
        id: TASK_IDS.task11,
        project_id: PROJECT_IDS.api,
        title: 'Implement rate limiting',
        description: 'Add configurable rate limiting per API key and endpoint. Include burst allowance and proper error responses.',
        status: 'In Progress' as const,
        priority: 'High' as const,
        assignee_id: USER_IDS.alex,
        due_date: daysFromNow(4),
        start_date: daysAgo(2),
        created_at: daysAgo(10),
        updated_at: daysAgo(1),
        tags: ['security', 'api', 'rate-limiting'],
    },
    {
        id: TASK_IDS.task12,
        project_id: PROJECT_IDS.api,
        title: 'Build webhook delivery system',
        description: 'Create reliable webhook delivery with retry logic, signature verification, and delivery status tracking.',
        status: 'To Do' as const,
        priority: 'Medium' as const,
        assignee_id: USER_IDS.mike,
        due_date: daysFromNow(10),
        start_date: null,
        created_at: daysAgo(8),
        updated_at: daysAgo(8),
        tags: ['webhooks', 'api', 'integration'],
    },
    {
        id: TASK_IDS.task13,
        project_id: PROJECT_IDS.api,
        title: 'Write API documentation',
        description: 'Create comprehensive API documentation with examples, authentication guide, and error reference using OpenAPI/Swagger.',
        status: 'In Progress' as const,
        priority: 'Medium' as const,
        assignee_id: USER_IDS.sarah,
        due_date: daysFromNow(7),
        start_date: daysAgo(3),
        created_at: daysAgo(15),
        updated_at: daysAgo(1),
        tags: ['documentation', 'api', 'developer-experience'],
    },

    // Analytics Dashboard Tasks
    {
        id: TASK_IDS.task14,
        project_id: PROJECT_IDS.analytics,
        title: 'Build real-time chart components',
        description: 'Create reusable chart components (line, bar, pie, area) with real-time data updates using WebSocket connections.',
        status: 'In Progress' as const,
        priority: 'High' as const,
        assignee_id: USER_IDS.emma,
        due_date: daysFromNow(6),
        start_date: daysAgo(4),
        created_at: daysAgo(10),
        updated_at: daysAgo(1),
        tags: ['charts', 'frontend', 'real-time'],
    },
    {
        id: TASK_IDS.task15,
        project_id: PROJECT_IDS.analytics,
        title: 'Implement data export feature',
        description: 'Allow users to export reports in CSV, Excel, and PDF formats. Include scheduled exports via email.',
        status: 'To Do' as const,
        priority: 'Medium' as const,
        assignee_id: null,
        due_date: daysFromNow(21),
        start_date: null,
        created_at: daysAgo(6),
        updated_at: daysAgo(6),
        tags: ['export', 'reports', 'pdf'],
    },
    {
        id: TASK_IDS.task16,
        project_id: PROJECT_IDS.analytics,
        title: 'Design custom report builder',
        description: 'Create drag-and-drop interface for building custom reports with filters, grouping, and visualization options.',
        status: 'To Do' as const,
        priority: 'Critical' as const,
        assignee_id: USER_IDS.andrew,
        due_date: daysFromNow(14),
        start_date: null,
        created_at: daysAgo(5),
        updated_at: daysAgo(5),
        tags: ['design', 'ui', 'reports'],
    },
];

const messages = [
    // Mobile App project messages
    {
        id: 'aaa11111-1111-1111-1111-111111111111',
        project_id: PROJECT_IDS.mobile,
        user_id: USER_IDS.andrew,
        content: 'Hey team! Great progress on the mobile app. Let\'s sync up tomorrow about the offline architecture.',
        timestamp: daysAgo(5),
    },
    {
        id: 'aaa22222-2222-2222-2222-222222222222',
        project_id: PROJECT_IDS.mobile,
        user_id: USER_IDS.mike,
        content: 'Sounds good! I\'ve been looking into Firebase Cloud Messaging - should we use topics or individual device tokens?',
        timestamp: daysAgo(5),
    },
    {
        id: 'aaa33333-3333-3333-3333-333333333333',
        project_id: PROJECT_IDS.mobile,
        user_id: USER_IDS.emma,
        content: 'I think topics would work better for broadcast messages, but we need individual tokens for task assignments.',
        timestamp: daysAgo(5),
    },
    {
        id: 'aaa44444-4444-4444-4444-444444444444',
        project_id: PROJECT_IDS.mobile,
        user_id: USER_IDS.andrew,
        content: 'Good point Emma! Let\'s use a hybrid approach. I\'ll document the architecture.',
        timestamp: daysAgo(4),
    },
    {
        id: 'aaa55555-5555-5555-5555-555555555555',
        project_id: PROJECT_IDS.mobile,
        user_id: USER_IDS.alex,
        content: 'Quick question - should I start on biometric auth now or wait for the offline sync to be done?',
        timestamp: daysAgo(2),
    },
    {
        id: 'aaa66666-6666-6666-6666-666666666666',
        project_id: PROJECT_IDS.mobile,
        user_id: USER_IDS.andrew,
        content: 'Wait for the sync to be done - the auth flow depends on it. Focus on code review for now.',
        timestamp: daysAgo(2),
    },

    // Website project messages
    {
        id: 'bbb11111-1111-1111-1111-111111111111',
        project_id: PROJECT_IDS.website,
        user_id: USER_IDS.sarah,
        content: 'The new design system looks amazing! Great work @Emma 🎨',
        timestamp: daysAgo(10),
    },
    {
        id: 'bbb22222-2222-2222-2222-222222222222',
        project_id: PROJECT_IDS.website,
        user_id: USER_IDS.emma,
        content: 'Thanks Sarah! I\'ve uploaded the Figma files and component documentation to the shared drive.',
        timestamp: daysAgo(10),
    },
    {
        id: 'bbb33333-3333-3333-3333-333333333333',
        project_id: PROJECT_IDS.website,
        user_id: USER_IDS.mike,
        content: 'Just started on the landing page implementation. The design tokens make it so much easier!',
        timestamp: daysAgo(3),
    },
    {
        id: 'bbb44444-4444-4444-4444-444444444444',
        project_id: PROJECT_IDS.website,
        user_id: USER_IDS.alex,
        content: 'I\'ve submitted the Core Web Vitals optimization for review. LCP went from 3.2s to 1.8s! 🚀',
        timestamp: daysAgo(2),
    },

    // API project messages
    {
        id: 'ccc11111-1111-1111-1111-111111111111',
        project_id: PROJECT_IDS.api,
        user_id: USER_IDS.andrew,
        content: 'GraphQL schema is finalized and documented. Ready for implementation!',
        timestamp: daysAgo(5),
    },
    {
        id: 'ccc22222-2222-2222-2222-222222222222',
        project_id: PROJECT_IDS.api,
        user_id: USER_IDS.sarah,
        content: 'I\'ll start on the API docs this week. Any specific sections you want me to prioritize?',
        timestamp: daysAgo(4),
    },
    {
        id: 'ccc33333-3333-3333-3333-333333333333',
        project_id: PROJECT_IDS.api,
        user_id: USER_IDS.andrew,
        content: 'Authentication and the task endpoints would be most useful first - those are what developers ask about most.',
        timestamp: daysAgo(4),
    },
];

const comments = [
    // Comments on push notification task
    {
        id: 'ddd11111-1111-1111-1111-111111111111',
        task_id: TASK_IDS.task1,
        user_id: USER_IDS.andrew,
        content: 'Make sure to handle the case where users deny notification permissions - we need a graceful fallback.',
        created_at: daysAgo(2),
    },
    {
        id: 'ddd22222-2222-2222-2222-222222222222',
        task_id: TASK_IDS.task1,
        user_id: USER_IDS.mike,
        content: 'Good point! I\'ll add an in-app notification center as a fallback for users who disable push notifications.',
        created_at: daysAgo(2),
    },
    {
        id: 'ddd33333-3333-3333-3333-333333333333',
        task_id: TASK_IDS.task1,
        user_id: USER_IDS.emma,
        content: 'We should also consider notification grouping for Android - don\'t want to spam users with individual notifications.',
        created_at: daysAgo(1),
    },

    // Comments on task creation form
    {
        id: 'ddd44444-4444-4444-4444-444444444444',
        task_id: TASK_IDS.task3,
        user_id: USER_IDS.sarah,
        content: 'Can we add a keyboard shortcut to quickly create tasks? Maybe Cmd+N or similar?',
        created_at: daysAgo(3),
    },
    {
        id: 'ddd55555-5555-5555-5555-555555555555',
        task_id: TASK_IDS.task3,
        user_id: USER_IDS.emma,
        content: 'Added! Also implemented Cmd+Enter to submit the form. Updating the PR now.',
        created_at: daysAgo(2),
    },

    // Comments on landing page
    {
        id: 'ddd66666-6666-6666-6666-666666666666',
        task_id: TASK_IDS.task7,
        user_id: USER_IDS.sarah,
        content: 'The hero section looks great! Can we add a subtle animation to the pricing cards on scroll?',
        created_at: daysAgo(2),
    },
    {
        id: 'ddd77777-7777-7777-7777-777777777777',
        task_id: TASK_IDS.task7,
        user_id: USER_IDS.mike,
        content: 'Sure! I\'ll use Intersection Observer for a fade-in effect. Should be smooth even on mobile.',
        created_at: daysAgo(1),
    },

    // Comments on Core Web Vitals
    {
        id: 'ddd88888-8888-8888-8888-888888888888',
        task_id: TASK_IDS.task9,
        user_id: USER_IDS.andrew,
        content: 'Amazing performance improvements! Did you try preloading the LCP image?',
        created_at: daysAgo(3),
    },
    {
        id: 'ddd99999-9999-9999-9999-999999999999',
        task_id: TASK_IDS.task9,
        user_id: USER_IDS.alex,
        content: 'Yes! That alone shaved off 400ms. Also implemented dynamic imports for below-the-fold components.',
        created_at: daysAgo(2),
    },

    // Comments on GraphQL schema
    {
        id: 'eee11111-1111-1111-1111-111111111111',
        task_id: TASK_IDS.task10,
        user_id: USER_IDS.sarah,
        content: 'Should we add cursor-based pagination from the start, or is offset pagination fine for v2?',
        created_at: daysAgo(8),
    },
    {
        id: 'eee22222-2222-2222-2222-222222222222',
        task_id: TASK_IDS.task10,
        user_id: USER_IDS.andrew,
        content: 'Let\'s go with cursor-based - it handles real-time updates better and we won\'t need to migrate later.',
        created_at: daysAgo(7),
    },

    // Comments on rate limiting
    {
        id: 'eee33333-3333-3333-3333-333333333333',
        task_id: TASK_IDS.task11,
        user_id: USER_IDS.mike,
        content: 'What should be the default rate limit for free tier users?',
        created_at: daysAgo(1),
    },
    {
        id: 'eee44444-4444-4444-4444-444444444444',
        task_id: TASK_IDS.task11,
        user_id: USER_IDS.andrew,
        content: 'Let\'s start with 1000 requests/hour for free tier, 10000 for pro, and unlimited for enterprise.',
        created_at: daysAgo(1),
    },

    // Comments on chart components
    {
        id: 'eee55555-5555-5555-5555-555555555555',
        task_id: TASK_IDS.task14,
        user_id: USER_IDS.sarah,
        content: 'Love the real-time updates! Can we add a loading skeleton while data is being fetched?',
        created_at: daysAgo(2),
    },
    {
        id: 'eee66666-6666-6666-6666-666666666666',
        task_id: TASK_IDS.task14,
        user_id: USER_IDS.emma,
        content: 'Already on it! Using a shimmer effect that matches the chart dimensions.',
        created_at: daysAgo(1),
    },
];

const activityLogs = [
    // Recent activity
    {
        id: 'fff11111-1111-1111-1111-111111111111',
        entity_type: 'Task' as const,
        entity_id: TASK_IDS.task1,
        action: 'Updated' as const,
        details: 'Status changed from "To Do" to "In Progress".',
        user_id: USER_IDS.mike,
        timestamp: daysAgo(3),
    },
    {
        id: 'fff22222-2222-2222-2222-222222222222',
        entity_type: 'Task' as const,
        entity_id: TASK_IDS.task2,
        action: 'Moved' as const,
        details: 'Status changed from "Review" to "Done".',
        user_id: USER_IDS.andrew,
        timestamp: daysAgo(2),
    },
    {
        id: 'fff33333-3333-3333-3333-333333333333',
        entity_type: 'Task' as const,
        entity_id: TASK_IDS.task3,
        action: 'Updated' as const,
        details: 'Status changed from "In Progress" to "Review".',
        user_id: USER_IDS.emma,
        timestamp: daysAgo(1),
    },
    {
        id: 'fff44444-4444-4444-4444-444444444444',
        entity_type: 'Task' as const,
        entity_id: TASK_IDS.task7,
        action: 'Commented' as const,
        details: 'Comment added on "Build landing page".',
        user_id: USER_IDS.sarah,
        timestamp: daysAgo(2),
    },
    {
        id: 'fff55555-5555-5555-5555-555555555555',
        entity_type: 'Task' as const,
        entity_id: TASK_IDS.task9,
        action: 'Updated' as const,
        details: 'Status changed from "In Progress" to "Review".',
        user_id: USER_IDS.alex,
        timestamp: daysAgo(2),
    },
    {
        id: 'fff66666-6666-6666-6666-666666666666',
        entity_type: 'Task' as const,
        entity_id: TASK_IDS.task10,
        action: 'Moved' as const,
        details: 'Status changed from "Review" to "Done".',
        user_id: USER_IDS.andrew,
        timestamp: daysAgo(5),
    },
    {
        id: 'fff77777-7777-7777-7777-777777777777',
        entity_type: 'Task' as const,
        entity_id: TASK_IDS.task6,
        action: 'Moved' as const,
        details: 'Status changed from "Review" to "Done".',
        user_id: USER_IDS.emma,
        timestamp: daysAgo(10),
    },
    {
        id: 'fff88888-8888-8888-8888-888888888888',
        entity_type: 'Project' as const,
        entity_id: PROJECT_IDS.analytics,
        action: 'Created' as const,
        details: 'Project "Analytics Dashboard" created.',
        user_id: USER_IDS.sarah,
        timestamp: daysAgo(20),
    },
    {
        id: 'fff99999-9999-9999-9999-999999999999',
        entity_type: 'Task' as const,
        entity_id: TASK_IDS.task14,
        action: 'Created' as const,
        details: 'Task "Build real-time chart components" created.',
        user_id: USER_IDS.emma,
        timestamp: daysAgo(10),
    },
    {
        id: 'fff00000-0000-0000-0000-000000000000',
        entity_type: 'Task' as const,
        entity_id: TASK_IDS.task11,
        action: 'Updated' as const,
        details: 'Status changed from "To Do" to "In Progress".',
        user_id: USER_IDS.alex,
        timestamp: daysAgo(2),
    },
];

export async function POST() {
    const supabase = getSupabase();
    const results: string[] = [];
    let hasErrors = false;

    try {
        // Clear existing data
        results.push('🗑️ Clearing existing data...');

        await supabase.from('comments').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('messages').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('activity_logs').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('tasks').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('projects').delete().gte('id', '00000000-0000-0000-0000-000000000000');

        results.push('✅ Existing data cleared');

        // Seed users
        results.push('👥 Seeding users...');
        const { error: usersError } = await supabase.from('users').upsert(users, { onConflict: 'id' });
        if (usersError) {
            results.push(`❌ Error seeding users: ${usersError.message}`);
            hasErrors = true;
        } else {
            results.push(`✅ Seeded ${users.length} users`);
        }

        // Seed projects
        results.push('📁 Seeding projects...');
        const { error: projectsError } = await supabase.from('projects').insert(projects);
        if (projectsError) {
            results.push(`❌ Error seeding projects: ${projectsError.message}`);
            hasErrors = true;
        } else {
            results.push(`✅ Seeded ${projects.length} projects`);
        }

        // Seed tasks
        results.push('📋 Seeding tasks...');
        const { error: tasksError } = await supabase.from('tasks').insert(tasks);
        if (tasksError) {
            results.push(`❌ Error seeding tasks: ${tasksError.message}`);
            hasErrors = true;
        } else {
            results.push(`✅ Seeded ${tasks.length} tasks`);
        }

        // Seed messages
        results.push('💬 Seeding messages...');
        const { error: messagesError } = await supabase.from('messages').insert(messages);
        if (messagesError) {
            results.push(`❌ Error seeding messages: ${messagesError.message}`);
            hasErrors = true;
        } else {
            results.push(`✅ Seeded ${messages.length} messages`);
        }

        // Seed comments
        results.push('📝 Seeding comments...');
        const { error: commentsError } = await supabase.from('comments').insert(comments);
        if (commentsError) {
            results.push(`❌ Error seeding comments: ${commentsError.message}`);
            hasErrors = true;
        } else {
            results.push(`✅ Seeded ${comments.length} comments`);
        }

        // Seed activity logs
        results.push('📊 Seeding activity logs...');
        const { error: logsError } = await supabase.from('activity_logs').insert(activityLogs);
        if (logsError) {
            results.push(`❌ Error seeding activity logs: ${logsError.message}`);
            hasErrors = true;
        } else {
            results.push(`✅ Seeded ${activityLogs.length} activity logs`);
        }

        // Summary
        if (!hasErrors) {
            results.push('');
            results.push('🎉 Database seeded successfully!');
            results.push('');
            results.push('📋 Summary:');
            results.push(`   • ${users.length} users`);
            results.push(`   • ${projects.length} projects`);
            results.push(`   • ${tasks.length} tasks`);
            results.push(`   • ${messages.length} messages`);
            results.push(`   • ${comments.length} comments`);
            results.push(`   • ${activityLogs.length} activity logs`);
        }

        return NextResponse.json({
            success: !hasErrors,
            results,
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            results,
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Use POST to seed the database with sample data',
        warning: 'This will clear existing projects, tasks, messages, comments, and activity logs!',
    });
}
