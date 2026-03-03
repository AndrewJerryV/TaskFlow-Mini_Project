'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Message, Attachment } from '@/types';
import { Send, MessageCircle, Paperclip, Image, FileText, X, Download, Calendar, PlayCircle } from 'lucide-react';
import { MiniCalendar } from '@/components/ui/MiniCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { getUserName, formatFileSize } from '@/lib/utils';
import { getSupabase } from '@/lib/supabase';
import { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

interface ChatViewProps {
    projectId: string;
}

// Message type alias for local use
type ChatMessage = Message;

export default function ChatView({ projectId }: ChatViewProps) {
    const { currentUser, users } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [jumpToDate, setJumpToDate] = useState('');
    const [viewingImage, setViewingImage] = useState<Attachment | null>(null);

    // Poll for messages
    const isFirstLoad = useRef(true);
    const fetchRef = useRef<(() => Promise<void>) | undefined>(undefined);

    // Check if user is near bottom of chat
    const isNearBottom = () => {
        if (!scrollRef.current) return true;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        return scrollHeight - scrollTop - clientHeight < 100;
    };

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/messages?projectId=${projectId}`);
            if (res.ok) {
                const data = await res.json();
                const wasNearBottom = isNearBottom();
                setMessages(prev => {
                    // Only auto-scroll if:
                    // 1. It's the first load, or
                    // 2. User was already near the bottom
                    if (isFirstLoad.current || wasNearBottom) {
                        scrollToBottom();
                    }
                    isFirstLoad.current = false;
                    return data;
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Keep fetchRef always pointing to the latest fetchMessages
    fetchRef.current = fetchMessages;

    useEffect(() => {
        if (!projectId) return;

        fetchMessages();

        const supabase = getSupabase();
        const channel = supabase
            .channel(`public:messages:project_id=eq.${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `project_id=eq.${projectId}`
                },
                (payload: RealtimePostgresInsertPayload<any>) => {
                    // Update messages if not already present (avoid duplicates from optimistic updates)
                    setMessages(prev => {
                        if (prev.some(m => m.id === payload.new.id)) return prev;

                        const newMsg: ChatMessage = {
                            id: payload.new.id,
                            projectId: payload.new.project_id,
                            userId: payload.new.user_id,
                            content: payload.new.content,
                            timestamp: payload.new.timestamp,
                            attachment: payload.new.attachment ? JSON.parse(payload.new.attachment) : undefined
                        };

                        const wasNearBottom = isNearBottom();
                        if (wasNearBottom) {
                            scrollToBottom();
                        }
                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [projectId]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    const handleFileSelect = (type: 'image' | 'video' | 'document') => {
        if (fileInputRef.current) {
            let accept = '';
            switch (type) {
                case 'image': accept = 'image/*'; break;
                case 'video': accept = 'video/*'; break;
                case 'document': accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx'; break;
            }
            fileInputRef.current.accept = accept;
            fileInputRef.current.click();
        }
        setShowAttachMenu(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                setPreviewUrl(URL.createObjectURL(file));
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // formatFileSize is now imported from lib/utils

    // Convert file to base64 data URL
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedFile) || !currentUser) return;

        // Create attachment info if file selected
        let attachment: Attachment | undefined;
        let attachmentUrl: string | undefined;

        if (selectedFile) {
            // Convert file to base64 for storage
            try {
                attachmentUrl = await fileToBase64(selectedFile);
            } catch (err) {
                console.error('Error converting file to base64:', err);
                return;
            }

            const type = selectedFile.type.startsWith('image/') ? 'image'
                : selectedFile.type.startsWith('video/') ? 'video' : 'document';
            attachment = {
                name: selectedFile.name,
                type,
                url: attachmentUrl,
                size: formatFileSize(selectedFile.size)
            };
        }

        // Determine message content
        const messageContent = newMessage || (attachment ? `Shared ${attachment.type}: ${attachment.name}` : '');

        // Optimistic update
        const tempMessage: ChatMessage = {
            id: `temp-${Date.now()}`,
            projectId,
            content: messageContent,
            userId: currentUser.id,
            timestamp: new Date().toISOString(),
            attachment
        };
        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');
        clearSelectedFile();
        scrollToBottom();

        try {
            await fetch('/api/messages', {
                method: 'POST',
                body: JSON.stringify({
                    projectId,
                    content: messageContent,
                    userId: currentUser.id,
                    attachment
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            fetchMessages();
        } catch (e) {
            console.error(e);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Format date for chat with special Today/Yesterday handling
    const formatChatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString();
    };

    // Group messages by date
    const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';
    messages.forEach(msg => {
        const msgDate = formatChatDate(msg.timestamp);
        if (msgDate !== currentDate) {
            currentDate = msgDate;
            groupedMessages.push({ date: msgDate, messages: [msg] });
        } else {
            groupedMessages[groupedMessages.length - 1].messages.push(msg);
        }
    });

    const isCurrentUser = (userId: string) => currentUser?.id === userId;

    // Download attachment function
    const downloadAttachment = (attachment: Attachment) => {
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Open image in lightbox modal
    const openImage = (attachment: Attachment) => {
        setViewingImage(attachment);
    };

    const renderAttachment = (attachment: Attachment) => {
        if (attachment.type === 'image') {
            return (
                <div className="mt-2 rounded-lg overflow-hidden max-w-[240px] cursor-pointer group relative" onClick={() => openImage(attachment)}>
                    <img src={attachment.url} alt={attachment.name} className="w-full h-auto" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">Click to view</span>
                    </div>
                </div>
            );
        }
        if (attachment.type === 'video') {
            return (
                <div className="mt-2 rounded-lg overflow-hidden max-w-[280px]">
                    <video src={attachment.url} controls className="w-full h-auto" />
                </div>
            );
        }
        return (
            <div className="mt-2 flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                <FileText size={20} className="text-blue-600 dark:text-blue-400" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{attachment.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{attachment.size}</p>
                </div>
                <button
                    onClick={() => downloadAttachment(attachment)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    title="Download file"
                >
                    <Download size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* Image Lightbox Modal */}
            {viewingImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
                    onClick={() => setViewingImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
                        onClick={() => setViewingImage(null)}
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={viewingImage.url}
                        alt={viewingImage.name}
                        className="max-w-[90vw] max-h-[90vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded">
                        {viewingImage.name}
                    </p>
                </div>
            )}

            {/* Thin Header Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <MessageCircle size={16} className="text-white" />
                    <span className="text-white text-sm font-medium">Team Chat</span>
                    <span className="text-blue-200 text-xs">• {users.length} members</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-blue-200 text-xs">{Math.min(users.length, 1)} online</span>
                    </div>
                    {/* Date Jump */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="Jump to date"
                        >
                            <Calendar size={16} />
                        </button>
                        {showDatePicker && (
                            <div className="absolute right-0 top-full mt-1 z-20">
                                <MiniCalendar
                                    onSelect={(dateStr) => {
                                        setJumpToDate(dateStr);
                                        // Find the date separator for this date and scroll to it
                                        if (scrollRef.current) {
                                            const targetDate = dateStr;
                                            const dateSeparator = scrollRef.current.querySelector(`[data-date="${targetDate}"]`);
                                            if (dateSeparator) {
                                                dateSeparator.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            } else {
                                                // If exact date not found, find closest date after
                                                const allDates = scrollRef.current.querySelectorAll('[data-date]');
                                                for (const el of allDates) {
                                                    const elDate = el.getAttribute('data-date');
                                                    if (elDate && elDate >= targetDate) {
                                                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                        setShowDatePicker(false);
                                    }}
                                    currentDate={jumpToDate}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div
                className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900"
                ref={scrollRef}
            >
                {loading ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-20">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center mt-20">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-3 flex items-center justify-center">
                            <MessageCircle size={32} className="text-blue-500 dark:text-blue-400" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 font-medium">No messages yet</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Start the conversation!</p>
                    </div>
                ) : (
                    groupedMessages.map((group, gi) => (
                        <div key={gi} data-date-group={group.date}>
                            {/* Date Separator */}
                            <div
                                className="flex justify-center my-4"
                                data-date={messages.find(m => formatChatDate(m.timestamp) === group.date)?.timestamp.split('T')[0]}
                            >
                                <span className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400">
                                    {group.date}
                                </span>
                            </div>

                            {/* Messages */}
                            {group.messages.map((msg, mi) => {
                                const isSender = isCurrentUser(msg.userId);
                                const senderName = getUserName(users, msg.userId);
                                const showName = !isSender && (mi === 0 || group.messages[mi - 1].userId !== msg.userId);
                                const showAvatar = !isSender && (mi === group.messages.length - 1 || group.messages[mi + 1].userId !== msg.userId);

                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex mb-2 ${isSender ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {/* Avatar for received messages */}
                                        {!isSender && (
                                            <div className="w-8 mr-2 flex flex-col justify-end">
                                                {showAvatar && (
                                                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                        {senderName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div
                                            className={`max-w-[70%] px-3 py-2 rounded-lg shadow-sm ${isSender
                                                ? 'bg-blue-600 text-white rounded-br-none'
                                                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                                                }`}
                                        >
                                            {/* Sender Name */}
                                            {showName && (
                                                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                                                    {senderName}
                                                </p>
                                            )}

                                            {/* Message Content */}
                                            {msg.content && (
                                                <p className={`text-sm break-words ${isSender ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                                                    {msg.content}
                                                </p>
                                            )}

                                            {/* Attachment */}
                                            {msg.attachment && renderAttachment(msg.attachment)}

                                            {/* Time */}
                                            <p className={`text-[10px] mt-1 text-right ${isSender ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                                {formatTime(msg.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>

            {/* File Preview */}
            {selectedFile && (
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center gap-3">
                    {previewUrl && selectedFile.type.startsWith('image/') ? (
                        <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded" />
                    ) : (
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                            <FileText size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <button onClick={clearSelectedFile} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                        <X size={18} className="text-gray-500 dark:text-gray-400" />
                    </button>
                </div>
            )}

            {/* Input Area - Flush to bottom */}
            <form onSubmit={handleSend} className="px-3 py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-shrink-0">
                {/* Attachment Button */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <Paperclip size={20} />
                    </button>

                    {/* Attachment Menu */}
                    {showAttachMenu && (
                        <div className="absolute bottom-12 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[160px] z-10">
                            <button
                                type="button"
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                onClick={() => handleFileSelect('image')}
                            >
                                <Image size={18} className="text-gray-500 dark:text-gray-400" />
                                Photos
                            </button>
                            <button
                                type="button"
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                onClick={() => handleFileSelect('video')}
                            >
                                <PlayCircle size={18} className="text-gray-500 dark:text-gray-400" />
                                Videos
                            </button>
                            <button
                                type="button"
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                onClick={() => handleFileSelect('document')}
                            >
                                <FileText size={18} className="text-gray-500 dark:text-gray-400" />
                                Documents
                            </button>
                        </div>
                    )}
                </div>

                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

                <input
                    type="text"
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim() && !selectedFile}
                    className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
