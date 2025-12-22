'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { Mail, Plus, User as UserIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export default function PeoplePage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
                setUsers(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail })
            });

            if (res.ok) {
                const newUser = await res.json();
                setUsers([...users, newUser]);
                setInviteEmail('');
                setIsInviteOpen(false);
            }
        } catch (error) {
            console.error('Failed to invite:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">People</h1>
                    <p className="text-gray-500">Manage your workspace members.</p>
                </div>
                <button
                    onClick={() => setIsInviteOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                    <Plus size={16} /> Invite People
                </button>
            </div>

            {loading ? (
                <div className="text-gray-400">Loading members...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map(user => (
                        <div key={user.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-lg font-semibold overflow-hidden">
                                {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">{user.name}</h3>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                    <Mail size={12} /> {user.email}
                                </p>
                                <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {user.role}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Upgrade Card */}
                    <div className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-6 text-gray-400 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => setIsInviteOpen(true)}>
                        <Plus size={32} className="mb-2 opacity-50" />
                        <span className="text-sm font-medium">Invite new member</span>
                    </div>
                </div>
            )}

            <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite to Workspace">
                <form onSubmit={handleInvite} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full border border-gray-300 rounded px-3 py-2"
                            placeholder="colleague@company.com"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button
                            disabled={isSubmitting}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Sending...' : 'Send Invite'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
