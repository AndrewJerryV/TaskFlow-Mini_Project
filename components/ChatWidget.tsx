'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Message } from '@/types';
import { MessageSquare, X, Send } from 'lucide-react';

export function ChatWidget({ projectId }: { projectId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newItem, setNewItem] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Poll for messages
    useEffect(() => {
        if (isOpen && projectId) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 3000); // 3s polling
            return () => clearInterval(interval);
        }
    }, [isOpen, projectId]);

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/messages?projectId=${projectId}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
                scrollToBottom();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.trim()) return;

        try {
            await fetch('/api/messages', {
                method: 'POST',
                body: JSON.stringify({
                    projectId,
                    content: newItem,
                    userId: 'u1'
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            setNewItem('');
            fetchMessages();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="w-80 h-96 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div className="bg-blue-600 p-3 flex justify-between items-center text-white">
                        <h3 className="font-semibold text-sm">Team Chat</h3>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 rounded p-1">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto bg-gray-50" ref={scrollRef}>
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-400 text-xs mt-10">No messages yet. Say hi!</div>
                        ) : (
                            messages.map(m => (
                                <div key={m.id} className={`mb-3 flex ${m.userId === 'u1' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.userId === 'u1' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                                        {m.content}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                        <input
                            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                            placeholder="Type a message..."
                            value={newItem}
                            onChange={e => setNewItem(e.target.value)}
                        />
                        <button type="submit" className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700">
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
            >
                <MessageSquare size={24} />
            </button>
        </div>
    );
}
