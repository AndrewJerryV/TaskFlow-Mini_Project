import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        const countOnly = searchParams.get('countOnly') === 'true';

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        if (countOnly) {
            const count = await db.getUnreadNotificationCount(userId);
            return NextResponse.json({ count });
        }

        const notifications = await db.getNotifications(userId);
        return NextResponse.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, userId, markAllRead } = body;

        if (markAllRead) {
            if (!userId) {
                return NextResponse.json({ error: 'User ID required for mark all read' }, { status: 400 });
            }
            const success = await db.markAllNotificationsRead(userId);
            if (!success) {
                return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 });
            }
            return NextResponse.json({ success: true });
        }

        if (!id) {
            return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
        }

        const success = await db.markNotificationRead(id);
        if (!success) {
            return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating notification:', error);
        return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    }
}
