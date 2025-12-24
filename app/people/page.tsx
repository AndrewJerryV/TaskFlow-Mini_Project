'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { Mail, Plus, Shield, Users as UsersIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';

export default function PeoplePage() {
    const { users: authUsers, currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');

    useEffect(() => {
        // Use users from auth context or fetch from API
        if (authUsers.length > 0) {
            setUsers(authUsers);
            setLoading(false);
        } else {
            fetch('/api/users')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setUsers(data);
                    }
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [authUsers]);

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock add - in a real app, this would create the user in the database
        const newUser: User = {
            id: crypto.randomUUID(),
            name: inviteEmail.split('@')[0],
            email: inviteEmail,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(inviteEmail.split('@')[0])}&background=random`,
            createdAt: new Date().toISOString(),
            role: 'Member'
        };
        setUsers([...users, newUser]);
        setInviteEmail('');
        setIsInviteOpen(false);
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'Admin': return 'bg-purple-100 text-purple-700';
            case 'Manager': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading users...</div>;
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <UsersIcon size={24} className="text-gray-500" />
                        People
                    </h1>
                    <p className="text-gray-500">Manage your workspace members.</p>
                </div>
                {currentUser?.role === 'Admin' && (
                    <button
                        onClick={() => setIsInviteOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
                    >
                        <Plus size={16} /> Invite People
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(user => (
                    <div
                        key={user.id}
                        className={`bg-white p-6 rounded-xl border shadow-sm flex items-center space-x-4 ${currentUser?.id === user.id ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'
                            }`}
                    >
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-lg font-semibold overflow-hidden">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                user.name.charAt(0)
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">{user.name}</h3>
                                {currentUser?.id === user.id && (
                                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">You</span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail size={12} /> {user.email}
                            </p>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${getRoleBadgeColor(user.role)}`}>
                                <Shield size={10} />
                                {user.role}
                            </span>
                        </div>
                    </div>
                ))}

                {/* Add Member Card - Only for Admins */}
                {currentUser?.role === 'Admin' && (
                    <div
                        className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-6 text-gray-400 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={() => setIsInviteOpen(true)}
                    >
                        <Plus size={32} className="mb-2 opacity-50" />
                        <span className="text-sm font-medium">Invite new member</span>
                    </div>
                )}
            </div>

            <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite to Workspace">
                <form onSubmit={handleInvite} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="colleague@company.com"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsInviteOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                        >
                            Cancel
                        </button>
                        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                            Send Invite
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
