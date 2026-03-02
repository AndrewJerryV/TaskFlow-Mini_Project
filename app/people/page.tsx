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
            role: 'Member',
            skills: [],
            wellnessScore: 85,
            maxWorkload: 5
        };
        setUsers([...users, newUser]);
        setInviteEmail('');
        setIsInviteOpen(false);
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'Admin': return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300';
            case 'Manager': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
            default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        if (!currentUser) return;

        // Prevent demoting the last admin locally as a quick check
        if (userId === currentUser.id && newRole !== 'Admin') {
            const adminCount = users.filter(u => u.role === 'Admin').length;
            if (adminCount <= 1) {
                alert("You are the only Admin. You cannot change your role.");
                return;
            }

            if (!window.confirm("Are you sure you want to remove your Admin privileges? You will lose access to Admin features immediately.")) {
                return;
            }
        }

        try {
            const res = await fetch(`/api/users/${userId}/role?userId=${currentUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update user role');
            }

            // Update local state
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as "Admin" | "Manager" | "Member" } : u));
        } catch (error: any) {
            console.error('Error updating role:', error);
            alert(error.message);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading users...</div>;
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <UsersIcon size={24} className="text-gray-500 dark:text-gray-400" />
                        People
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your workspace members.</p>
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
                        className={`bg-white dark:bg-gray-800 p-6 rounded-xl border shadow-sm flex items-center space-x-4 ${currentUser?.id === user.id ? 'border-blue-300 dark:border-blue-600 ring-1 ring-blue-100 dark:ring-blue-900' : 'border-gray-200 dark:border-gray-700'
                            }`}
                    >
                        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 text-lg font-semibold overflow-hidden">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                user.name.charAt(0)
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                                {currentUser?.id === user.id && (
                                    <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">You</span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Mail size={12} /> {user.email}
                            </p>
                            {currentUser?.role === 'Admin' ? (
                                <select
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 border-none cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium ${getRoleBadgeColor(user.role)}`}
                                >
                                    <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" value="Admin">Admin</option>
                                    <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" value="Manager">Manager</option>
                                    <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" value="Member">Member</option>
                                </select>
                            ) : (
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${getRoleBadgeColor(user.role)}`}>
                                    <Shield size={10} />
                                    {user.role}
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {/* Add Member Card - Only for Admins */}
                {currentUser?.role === 'Admin' && (
                    <div
                        className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center p-6 text-gray-400 dark:text-gray-500 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
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
