import { NextResponse } from 'next/server';
import { Attachment, Message, MessageReaction } from '@/types';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

function toggleReaction(reactions: MessageReaction[] = [], emoji: string, userId: string): MessageReaction[] {
    const next = [...reactions];
    const index = next.findIndex(reaction => reaction.emoji === emoji);

    if (index === -1) {
        next.push({ emoji, userIds: [userId] });
        return next;
    }

    const current = next[index];
    const alreadyReacted = current.userIds.includes(userId);
    const userIds = alreadyReacted
        ? current.userIds.filter(id => id !== userId)
        : [...current.userIds, userId];

    if (userIds.length === 0) {
        next.splice(index, 1);
        return next;
    }

    next[index] = { ...current, userIds };
    return next;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const currentUserId = searchParams.get('currentUserId');
        const recipientId = searchParams.get('recipientId');
        const threadRootId = searchParams.get('threadRootId');
        const conversationType = searchParams.get('conversationType') || 'project';

        const supabase = getSupabaseForRequest(request);
        if (threadRootId) {
            const { data: threadMessages } = await supabase.from('messages').select('*').eq('thread_root_id', threadRootId).order('created_at', { ascending: true });
            return NextResponse.json(threadMessages || []);
        }

        if (conversationType === 'dm') {
            if (!currentUserId || !recipientId || !projectId) {
                return NextResponse.json({ error: 'currentUserId, recipientId, and projectId are required for DMs' }, { status: 400 });
            }

            const { data: messages } = await supabase.from('messages').select('*').or(
                `and(user_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(user_id.eq.${recipientId},recipient_id.eq.${currentUserId})`
            ).eq('project_id', projectId).order('created_at', { ascending: true });
            return NextResponse.json(messages || []);
        }

        if (!projectId) {
            return NextResponse.json({ error: 'ProjectId required' }, { status: 400 });
        }

        const { data: messages } = await supabase.from('messages').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
        return NextResponse.json(messages || []);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        let attachment: Attachment | undefined;
        if (body.attachment) {
            attachment = body.attachment as Attachment;
        }

        const conversationType: Message['conversationType'] = body.conversationType === 'dm' ? 'dm' : 'project';

        if (!body.userId || (!body.content && !attachment)) {
            return NextResponse.json({ error: 'Missing fields: need userId and either content or attachment' }, { status: 400 });
        }

        if (conversationType === 'project' && !body.projectId) {
            return NextResponse.json({ error: 'projectId is required for project chat' }, { status: 400 });
        }

        if (conversationType === 'dm' && (!body.recipientId || !body.projectId)) {
            return NextResponse.json({ error: 'recipientId and projectId are required for direct messages' }, { status: 400 });
        }

        const newMessage: Message = {
            id: crypto.randomUUID(),
            projectId: body.projectId || undefined,
            userId: body.userId,
            content: body.content || '',
            timestamp: new Date().toISOString(),
            attachment,
            conversationType,
            recipientId: body.recipientId || undefined,
            threadRootId: body.threadRootId || null,
            reactions: [],
        };

        const supabase2 = getSupabaseForRequest(request);
        const { error: insertErr } = await supabase2.from('messages').insert({
            id: newMessage.id,
            project_id: newMessage.projectId || null,
            user_id: newMessage.userId,
            content: newMessage.content,
            created_at: newMessage.timestamp,
            attachment: newMessage.attachment || null,
            conversation_type: newMessage.conversationType,
            recipient_id: newMessage.recipientId || null,
            thread_root_id: newMessage.threadRootId || null,
            reactions: newMessage.reactions || []
        });

        if (insertErr) {
            console.error('Error inserting message:', insertErr);
            return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
        }

        const { data: sender } = await supabase2.from('users').select('id, name').eq('id', newMessage.userId).maybeSingle();

        if (newMessage.conversationType === 'dm' && newMessage.recipientId) {
            await supabase2.from('notifications').insert({
                user_id: newMessage.recipientId,
                type: 'new_message',
                title: 'New Direct Message',
                message: `${sender?.name || 'Someone'} sent you a direct message`,
                link: body.projectId ? `/projects/${body.projectId}?tab=Chat` : '/dashboard',
                entity_id: newMessage.id,
                project_id: body.projectId || null,
                is_read: false,
                created_at: new Date().toISOString()
            });
        } else if (newMessage.projectId) {
            const { data: projectMembers } = await supabase2.from('project_members').select('user_id').eq('project_id', newMessage.projectId);
            const membersToNotify = (projectMembers || []).map((m: any) => m.user_id).filter((memberId: string) => memberId !== newMessage.userId);
            const { data: project } = await supabase2.from('projects').select('*').eq('id', newMessage.projectId).maybeSingle();

            for (const memberId of membersToNotify) {
                await supabase2.from('notifications').insert({
                    user_id: memberId,
                    type: 'new_message',
                    title: newMessage.threadRootId ? 'New Thread Reply' : 'New Chat Message',
                    message: `${sender?.name || 'Someone'} sent a message in ${project?.name || 'a project'}`,
                    link: `/projects/${newMessage.projectId}?tab=Chat`,
                    entity_id: newMessage.id,
                    project_id: newMessage.projectId,
                    is_read: false,
                    created_at: new Date().toISOString()
                });
            }
        }

        return NextResponse.json(newMessage);
    } catch (error) {
        console.error('Error creating message:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create message' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { messageId, userId, emoji, content, isPinned } = body;
        const supabase = getSupabaseForRequest(request);

        if (!messageId) {
            return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
        }

        // Handle content update
        if (content !== undefined) {
            const { data: updatedMessage, error } = await supabase.from('messages').update({ content }).eq('id', messageId).select().maybeSingle();
            if (error || !updatedMessage) {
                return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
            }
            return NextResponse.json(updatedMessage);
        }

        // Handle pin toggle
        if (isPinned !== undefined) {
            const { data: updatedMessage, error } = await supabase.from('messages').update({ is_pinned: isPinned }).eq('id', messageId).select().maybeSingle();
            if (error) return NextResponse.json({ error: 'Failed to update pin' }, { status: 500 });
            return NextResponse.json(updatedMessage);
        }

        // Handle reaction toggle
        if (userId && emoji) {
            const { data: message } = await supabase.from('messages').select('reactions').eq('id', messageId).maybeSingle();
            if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

            const updatedReactions = toggleReaction(message.reactions || [], emoji, userId);
            const { data: updatedMessage, error } = await supabase.from('messages').update({ reactions: updatedReactions }).eq('id', messageId).select().maybeSingle();
            if (error || !updatedMessage) return NextResponse.json({ error: 'Failed to update reactions' }, { status: 500 });
            return NextResponse.json(updatedMessage);
        }

        return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
    } catch (error) {
        console.error('Error updating message:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update message' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const messageId = searchParams.get('messageId');

        if (!messageId) {
            return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
        }

        const supabase = getSupabaseForRequest(request);
        const { error } = await supabase.from('messages').delete().eq('id', messageId);
        if (error) return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting message:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete message' }, { status: 500 });
    }
}
