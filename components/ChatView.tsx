'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Attachment, Message, User } from '@/types';
import {
    Calendar,
    Download,
    FileText,
    Hash,
    Image,
    MessageCircle,
    Paperclip,
    PlayCircle,
    Reply,
    Send,
    Users,
    X,
} from 'lucide-react';
import { MiniCalendar } from '@/components/ui/MiniCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { formatFileSize } from '@/lib/utils';
import { getSupabase } from '@/lib/supabase';

interface ChatViewProps {
    projectId: string;
    projectMemberIds: string[];
}

type Conversation =
    | { type: 'project'; id: 'project-room'; title: string }
    | { type: 'dm'; id: string; title: string; user: User };

const QUICK_REACTIONS = ['\u{1F44D}', '\u2764\uFE0F', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}'];

export default function ChatView({ projectId, projectMemberIds }: ChatViewProps) {
    const { currentUser, users } = useAuth();
    const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string>('project-room');
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [jumpToDate, setJumpToDate] = useState('');
    const [viewingImage, setViewingImage] = useState<Attachment | null>(null);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const projectUsers = useMemo(
        () =>
            projectMemberIds
                .map(memberId => users.find(user => user.id === memberId))
                .filter((user): user is User => Boolean(user)),
        [projectMemberIds, users]
    );

    const conversations = useMemo<Conversation[]>(() => {
        const projectConversation: Conversation = {
            type: 'project',
            id: 'project-room',
            title: 'Project Room',
        };

        const dmConversations = projectUsers
            .filter(user => currentUser && user.id !== currentUser.id)
            .map(user => ({
                type: 'dm' as const,
                id: user.id,
                title: user.name,
                user,
            }));

        return [projectConversation, ...dmConversations];
    }, [projectUsers, currentUser]);

    const activeConversation = conversations.find(conversation => conversation.id === activeConversationId) || conversations[0];

    const messageMap = useMemo(() => {
        const map = new Map<string, Message>();
        messages.forEach(message => map.set(message.id, message));
        return map;
    }, [messages]);

    useEffect(() => {
        if (!currentUser) return;

        const supabase = getSupabase();
        const channel = supabase.channel('online-users', {
            config: { presence: { key: currentUser.id } },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                setOnlineUserIds(Object.keys(state));
            })
            .subscribe(async status => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ user_id: currentUser.id, online_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    const queueScrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    const fetchConversationMessages = async () => {
        if (!currentUser) return;

        setLoading(true);

        try {
            const params = new URLSearchParams();

            if (activeConversation?.type === 'dm') {
                params.set('conversationType', 'dm');
                params.set('currentUserId', currentUser.id);
                params.set('recipientId', activeConversation.id);
            } else {
                params.set('conversationType', 'project');
                params.set('projectId', projectId);
            }

            const response = await fetch(`/api/messages?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch messages');

            const data = await response.json();
            setMessages(Array.isArray(data) ? data : []);
            queueScrollToBottom();
        } catch (error) {
            console.error(error);
            setMessages([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setReplyingTo(null);
        void fetchConversationMessages();
    }, [activeConversationId, projectId, currentUser?.id]);

    useEffect(() => {
        const supabase = getSupabase();
        const channel = supabase
            .channel(`messages-${projectId}-${currentUser?.id || 'guest'}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
                void fetchConversationMessages();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [projectId, currentUser?.id, activeConversationId]);

    const formatTime = (dateStr: string) =>
        new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const formatChatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString();
    };

    const groupedMessages = useMemo(() => {
        const groups: { date: string; messages: Message[] }[] = [];
        let currentDate = '';

        messages.forEach(message => {
            const date = formatChatDate(message.timestamp);
            if (date !== currentDate) {
                currentDate = date;
                groups.push({ date, messages: [message] });
            } else {
                groups[groups.length - 1].messages.push(message);
            }
        });

        return groups;
    }, [messages]);

    const fileToBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
        });

    const handleFileSelect = (type: 'image' | 'video' | 'document') => {
        if (fileInputRef.current) {
            fileInputRef.current.accept =
                type === 'image'
                    ? 'image/*'
                    : type === 'video'
                        ? 'video/*'
                        : '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx';
            fileInputRef.current.click();
        }
        setShowAttachMenu(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setPreviewUrl(null);
        }
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const buildAttachment = async () => {
        if (!selectedFile) return undefined;

        const url = await fileToBase64(selectedFile);
        return {
            name: selectedFile.name,
            type: selectedFile.type.startsWith('image/')
                ? 'image'
                : selectedFile.type.startsWith('video/')
                    ? 'video'
                    : 'document',
            url,
            size: formatFileSize(selectedFile.size),
        } as Attachment;
    };

    const sendMessage = async () => {
        if (!currentUser || (!newMessage.trim() && !selectedFile)) return;

        const attachment = await buildAttachment();
        const payload: Record<string, unknown> = {
            userId: currentUser.id,
            content: newMessage.trim() || (attachment ? `Shared ${attachment.type}: ${attachment.name}` : ''),
            attachment,
            threadRootId: replyingTo?.id || null,
            conversationType: activeConversation?.type === 'dm' ? 'dm' : 'project',
        };

        if (activeConversation?.type === 'dm') {
            payload.recipientId = activeConversation.id;
            payload.projectId = projectId;
        } else {
            payload.projectId = projectId;
        }

        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        clearSelectedFile();
        setNewMessage('');
        setReplyingTo(null);
        await fetchConversationMessages();
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await sendMessage();
        } catch (error) {
            console.error(error);
        }
    };

    const handleReaction = async (messageId: string, emoji: string) => {
        if (!currentUser) return;

        try {
            await fetch('/api/messages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageId,
                    userId: currentUser.id,
                    emoji,
                }),
            });
            await fetchConversationMessages();
        } catch (error) {
            console.error(error);
        }
    };

    const downloadAttachment = (attachment: Attachment) => {
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderAttachment = (attachment: Attachment) => {
        if (attachment.type === 'image') {
            return (
                <div className="mt-2 cursor-pointer overflow-hidden rounded-2xl" onClick={() => setViewingImage(attachment)}>
                    <img src={attachment.url} alt={attachment.name} className="max-w-[280px] rounded-2xl" />
                </div>
            );
        }

        if (attachment.type === 'video') {
            return (
                <div className="mt-2 max-w-[320px] overflow-hidden rounded-2xl">
                    <video src={attachment.url} controls className="w-full rounded-2xl" />
                </div>
            );
        }

        return (
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-slate-100 p-2 dark:bg-slate-700">
                <FileText size={18} className="text-blue-500" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{attachment.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{attachment.size}</p>
                </div>
                <button onClick={() => downloadAttachment(attachment)} className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-600">
                    <Download size={14} />
                </button>
            </div>
        );
    };

    const renderQuotedReply = (message: Message, isSender: boolean) => {
        if (!message.threadRootId) return null;

        const originalMessage = messageMap.get(message.threadRootId);
        if (!originalMessage) return null;

        const originalSender =
            projectUsers.find(user => user.id === originalMessage.userId) ||
            users.find(user => user.id === originalMessage.userId);

        return (
            <button
                type="button"
                onClick={() => {
                    const target = document.getElementById(`message-${originalMessage.id}`);
                    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className={`mb-2 w-full rounded-2xl border px-3 py-2 text-left ${
                    isSender
                        ? 'border-blue-300/40 bg-blue-500/20 text-blue-50'
                        : 'border-slate-200 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-700/60 dark:text-slate-200'
                }`}
            >
                <div className="truncate text-[11px] font-semibold">
                    {originalSender?.name || 'Unknown'}
                </div>
                <div className="truncate text-xs opacity-90">
                    {originalMessage.content || (originalMessage.attachment ? `Attachment: ${originalMessage.attachment.name}` : 'Message')}
                </div>
            </button>
        );
    };

    const renderMessageBubble = (message: Message) => {
        const isSender = message.userId === currentUser?.id;
        const sender =
            projectUsers.find(user => user.id === message.userId) ||
            users.find(user => user.id === message.userId);

        return (
            <div
                key={message.id}
                id={`message-${message.id}`}
                className={`group mb-3 flex ${isSender ? 'justify-end' : 'justify-start'}`}
                onMouseEnter={() => setHoveredMessageId(message.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
            >
                <div className={`max-w-[78%] ${isSender ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isSender && (
                        <div className="mb-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {sender?.name || 'Unknown'}
                        </div>
                    )}
                    <div
                        className={`rounded-[22px] px-4 py-3 shadow-sm ${
                            isSender
                                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/20'
                                : 'border border-white/70 bg-white/90 text-gray-900 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 dark:text-gray-100'
                        }`}
                    >
                        {renderQuotedReply(message, isSender)}
                        {message.content && <p className="whitespace-pre-wrap text-sm">{message.content}</p>}
                        {message.attachment && renderAttachment(message.attachment)}
                        <div className={`mt-2 text-[10px] ${isSender ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                            {formatTime(message.timestamp)}
                        </div>
                    </div>

                    {message.reactions && message.reactions.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                            {message.reactions.map(reaction => (
                                <button
                                    key={`${message.id}-${reaction.emoji}`}
                                    onClick={() => handleReaction(message.id, reaction.emoji)}
                                    className={`rounded-full border px-2 py-0.5 text-xs ${
                                        reaction.userIds.includes(currentUser?.id || '')
                                            ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                            : 'border-slate-200 bg-white/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                    }`}
                                >
                                    {reaction.emoji} {reaction.userIds.length}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className={`mt-1 flex flex-wrap gap-2 text-xs ${hoveredMessageId === message.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                        {QUICK_REACTIONS.map(emoji => (
                            <button
                                key={`${message.id}-${emoji}`}
                                onClick={() => handleReaction(message.id, emoji)}
                                className="rounded-full border border-white/70 bg-white/90 px-2 py-1 shadow-sm backdrop-blur hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                            >
                                {emoji}
                            </button>
                        ))}
                        <button
                            onClick={() => setReplyingTo(message)}
                            className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2 py-1 text-slate-600 shadow-sm backdrop-blur hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            <Reply size={12} />
                            Reply
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const onlineCount = projectUsers.filter(user => onlineUserIds.includes(user.id)).length;

    return (
        <div className="flex h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
            {viewingImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setViewingImage(null)}>
                    <button className="absolute right-4 top-4 p-2 text-white" onClick={() => setViewingImage(null)}>
                        <X size={28} />
                    </button>
                    <img src={viewingImage.url} alt={viewingImage.name} className="max-h-[90vh] max-w-[90vw] object-contain" />
                </div>
            )}

            <aside className="flex w-72 min-h-0 flex-col border-r border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(241,245,255,0.9)_100%)] p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(17,24,39,0.92)_100%)]">
                <div className="mb-4">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Conversations</div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Users size={14} />
                        {Math.max(onlineCount, currentUser ? 1 : 0)} online
                    </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-5">
                    <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Channels</div>
                        <button
                            onClick={() => setActiveConversationId('project-room')}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium ${
                                activeConversationId === 'project-room'
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-gray-700 hover:bg-white/80 dark:text-gray-200 dark:hover:bg-slate-800/70'
                            }`}
                        >
                            <Hash size={16} />
                            Project Room
                        </button>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Direct Messages</div>
                        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                            {conversations
                                .filter(conversation => conversation.type === 'dm')
                                .map(conversation => {
                                    const isOnline = conversation.type === 'dm' && onlineUserIds.includes(conversation.user.id);
                                    return (
                                        <button
                                            key={conversation.id}
                                            onClick={() => setActiveConversationId(conversation.id)}
                                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${
                                                activeConversationId === conversation.id
                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                                                    : 'text-gray-700 hover:bg-white/80 dark:text-gray-200 dark:hover:bg-slate-800/70'
                                            }`}
                                        >
                                            <div className="relative">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                                    {conversation.user.name.charAt(0)}
                                                </div>
                                                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-gray-50 dark:border-gray-950 ${isOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-medium">{conversation.title}</div>
                                                <div className={`truncate text-xs ${activeConversationId === conversation.id ? 'text-blue-100' : 'text-gray-400'}`}>
                                                    {isOnline ? 'Online' : 'Offline'}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            </aside>

            <section className="relative flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/70 px-5 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
                    <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {activeConversation?.type === 'dm' ? activeConversation.title : '# Project Room'}
                        </div>
                        <div className="text-xs text-gray-400">
                            {activeConversation?.type === 'dm'
                                ? 'Private conversation'
                                : `${projectUsers.length} members - shared workspace chat`}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <Calendar size={16} />
                    </button>
                </div>

                {showDatePicker && (
                    <div className="absolute right-5 top-16 z-20">
                        <MiniCalendar
                            currentDate={jumpToDate}
                            onSelect={dateStr => {
                                setJumpToDate(dateStr);
                                const target = scrollRef.current?.querySelector(`[data-date="${dateStr}"]`);
                                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                setShowDatePicker(false);
                            }}
                        />
                    </div>
                )}

                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.09),transparent_28%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_52%,#f8fafc_100%)] px-5 py-4 dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_22%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.14),transparent_20%),linear-gradient(180deg,#0f172a_0%,#111827_100%)]"
                >
                    {loading ? (
                        <div className="mt-20 text-center text-gray-500">Loading messages...</div>
                    ) : messages.length === 0 ? (
                        <div className="mt-20 text-center">
                            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                <MessageCircle size={30} className="text-blue-500" />
                            </div>
                            <p className="font-medium text-gray-700 dark:text-gray-200">No messages yet</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {activeConversation?.type === 'dm' ? 'Start a direct conversation.' : 'Start the project discussion.'}
                            </p>
                        </div>
                    ) : (
                        groupedMessages.map(group => (
                            <div key={group.date}>
                                <div className="my-4 flex justify-center" data-date={messages.find(message => formatChatDate(message.timestamp) === group.date)?.timestamp.split('T')[0]}>
                                    <span className="rounded-full border border-white/60 bg-white/85 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300">
                                        {group.date}
                                    </span>
                                </div>
                                {group.messages.map(message => renderMessageBubble(message))}
                            </div>
                        ))
                    )}
                </div>

                {replyingTo && (
                    <div className="border-t border-slate-200/80 bg-white/70 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
                        <div className="flex items-start justify-between gap-3 rounded-2xl border-l-4 border-blue-500 bg-white/90 px-3 py-2 shadow-sm dark:bg-slate-900/90">
                            <div className="min-w-0">
                                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                    Replying to {projectUsers.find(user => user.id === replyingTo.userId)?.name || users.find(user => user.id === replyingTo.userId)?.name || 'Unknown'}
                                </div>
                                <div className="truncate text-sm text-gray-600 dark:text-gray-300">
                                    {replyingTo.content || (replyingTo.attachment ? `Attachment: ${replyingTo.attachment.name}` : 'Message')}
                                </div>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {selectedFile && (
                    <div className="border-t border-slate-200/80 bg-white/70 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
                        <div className="flex items-center gap-3">
                            {previewUrl && selectedFile.type.startsWith('image/') ? (
                                <img src={previewUrl} alt="Preview" className="h-12 w-12 rounded-lg object-cover" />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                    <FileText size={18} className="text-blue-500" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{selectedFile.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
                            </div>
                            <button onClick={clearSelectedFile} className="rounded-lg p-1 hover:bg-gray-200 dark:hover:bg-gray-800">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-200/80 bg-white/80 px-3 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowAttachMenu(!showAttachMenu)}
                            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            <Paperclip size={18} />
                        </button>
                        {showAttachMenu && (
                            <div className="absolute bottom-12 left-0 z-10 min-w-[160px] rounded-xl border border-slate-200 bg-white/95 py-2 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-800/95">
                                <button type="button" className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => handleFileSelect('image')}>
                                    <Image size={16} /> Photos
                                </button>
                                <button type="button" className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => handleFileSelect('video')}>
                                    <PlayCircle size={16} /> Videos
                                </button>
                                <button type="button" className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => handleFileSelect('document')}>
                                    <FileText size={16} /> Documents
                                </button>
                            </div>
                        )}
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                    <input
                        type="text"
                        className="flex-1 rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/95 dark:text-white"
                        placeholder={activeConversation?.type === 'dm' ? `Message ${activeConversation.title}` : 'Message project room'}
                        value={newMessage}
                        onChange={event => setNewMessage(event.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() && !selectedFile}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700"
                    >
                        <Send size={16} />
                    </button>
                </form>
            </section>
        </div>
    );
}
