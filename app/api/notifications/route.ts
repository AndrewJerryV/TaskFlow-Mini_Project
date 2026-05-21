import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        const countOnly = searchParams.get('countOnly') === 'true';

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        if (countOnly) {
            const supabase = getSupabaseForRequest(request);
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);
            if (error) {
                console.error('Error counting notifications:', error);
                return NextResponse.json({ count: 0 });
            }
            return NextResponse.json({ count: count || 0 });
        }

        const supabase = getSupabaseForRequest(request);
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error);
            return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
        }

        return NextResponse.json((data || []).map((n: any) => ({
            id: n.id,
            userId: n.user_id,
            type: n.type,
            title: n.title,
            message: n.message,
            isRead: n.is_read,
            link: n.link,
            entityId: n.entity_id,
            projectId: n.project_id,
            createdAt: n.created_at,
        })));
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
            const supabase = getSupabaseForRequest(request);
            const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
            if (error) {
                console.error('Error marking all notifications read:', error);
                return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 });
            }
            return NextResponse.json({ success: true });
        }

        if (!id) {
            return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
        }

        const supabase2 = getSupabaseForRequest(request);
        const { error: markError } = await supabase2.from('notifications').update({ is_read: true }).eq('id', id);
        if (markError) {
            console.error('Error marking notification read:', markError);
            return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating notification:', error);
        return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    }
}
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, type, title, message, link, entityId, projectId } = body;

        if (!userId || !type || !title || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase3 = getSupabaseForRequest(request);
        const { error: insertError } = await supabase3.from('notifications').insert({
            user_id: userId,
            type,
            title,
            message,
            link: link || null,
            entity_id: entityId || null,
            project_id: projectId || null,
            is_read: false,
            created_at: new Date().toISOString()
        });

        if (insertError) {
            console.error('Error creating notification:', insertError);
            return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error creating notification:', error);
        return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }
}
