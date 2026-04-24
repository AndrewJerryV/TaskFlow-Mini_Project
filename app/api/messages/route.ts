import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Attachment, Message, MessageReaction } from '@/types';

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

        if (threadRootId) {
            const threadMessages = await db.getThreadMessages(threadRootId);
            return NextResponse.json(threadMessages);
        }

        if (conversationType === 'dm') {
            if (!currentUserId || !recipientId || !projectId) {
                return NextResponse.json({ error: 'currentUserId, recipientId, and projectId are required for DMs' }, { status: 400 });
            }

            const messages = await db.getDirectMessages(currentUserId, recipientId, projectId);
            return NextResponse.json(messages);
        }

        if (!projectId) {
            return NextResponse.json({ error: 'ProjectId required' }, { status: 400 });
        }

        const messages = await db.getMessages(projectId);
        return NextResponse.json(messages);
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

        await db.addMessage(newMessage);

        const sender = await db.getUser(newMessage.userId);

        if (newMessage.conversationType === 'dm' && newMessage.recipientId) {
            await db.addNotification({
                userId: newMessage.recipientId,
                type: 'new_message',
                title: 'New Direct Message',
                message: `${sender?.name || 'Someone'} sent you a direct message`,
                link: body.projectId ? `/projects/${body.projectId}?tab=Chat` : '/dashboard',
                entityId: newMessage.id,
                projectId: body.projectId || undefined,
            });
        } else if (newMessage.projectId) {
            const projectMembers = await db.getProjectMembers(newMessage.projectId);
            const membersToNotify = projectMembers.filter(memberId => memberId !== newMessage.userId);
            const project = await db.getProject(newMessage.projectId);

            for (const memberId of membersToNotify) {
                await db.addNotification({
                    userId: memberId,
                    type: 'new_message',
                    title: newMessage.threadRootId ? 'New Thread Reply' : 'New Chat Message',
                    message: `${sender?.name || 'Someone'} sent a message in ${project?.name || 'a project'}`,
                    link: `/projects/${newMessage.projectId}?tab=Chat`,
                    entityId: newMessage.id,
                    projectId: newMessage.projectId,
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

        if (!messageId) {
            return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
        }

        // Handle content update
        if (content !== undefined) {
            const updatedMessage = await db.updateMessageContent(messageId, content);
            if (!updatedMessage) {
                return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
            }
            return NextResponse.json(updatedMessage);
        }

        // Handle pin toggle
        if (isPinned !== undefined) {
            await db.toggleMessagePin(messageId, isPinned);
            const updatedMessage = await db.getMessageById(messageId);
            return NextResponse.json(updatedMessage);
        }

        // Handle reaction toggle
        if (userId && emoji) {
            const message = await db.getMessageById(messageId);
            if (!message) {
                return NextResponse.json({ error: 'Message not found' }, { status: 404 });
            }

            const updatedReactions = toggleReaction(message.reactions || [], emoji, userId);
            const updatedMessage = await db.updateMessageReactions(messageId, updatedReactions);

            if (!updatedMessage) {
                return NextResponse.json({ error: 'Failed to update reactions' }, { status: 500 });
            }

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

        const success = await db.deleteMessage(messageId);
        if (!success) {
            return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting message:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete message' }, { status: 500 });
    }
}
