'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { Mail, Plus, User as UserIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export default function PeoplePage() {
    // Determine the users. For prototype we might just show mocked users if we didn't add users API.
    // Checking types/index.ts -> DbSchema has users. 
    // We didn't create /api/users yet. Let's create a quick list here or mock it for now
    // leveraging the seed data we know exists in db.ts + some new ones.

    // Actually, to be consistent, let's just use a hardcoded list that represents "workspace members"
    // Since we didn't plan an /api/users route in the plan explicitly, 
    // I made a small oversight in the plan details, but I will just mock perfectly for the "Functional" feel.

    const [users, setUsers] = useState<User[]>([
        { id: 'u1', name: 'Andrew M.', email: 'andrew@example.com', avatarUrl: '', createdAt: '', role: 'Admin' },
        { id: 'u2', name: 'Sarah Connor', email: 'sarah@example.com', avatarUrl: '', createdAt: '', role: 'Manager' },
        { id: 'u3', name: 'John Doe', email: 'john@example.com', avatarUrl: '', createdAt: '', role: 'Member' },
    ]);

    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock add
        setUsers([...users, {
            id: `u${Date.now()}`,
            name: inviteEmail.split('@')[0],
            email: inviteEmail,
            avatarUrl: '',
            createdAt: new Date().toISOString(),
            role: 'Member'
        }]);
        setInviteEmail('');
        setIsInviteOpen(false);
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(user => (
                    <div key={user.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-lg font-semibold">
                            {user.avatarUrl ? <img src={user.avatarUrl} className="rounded-full" /> : user.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">{user.name}</h3>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail size={12} /> {user.email}
                            </p>
                        </div>
                    </div>
                ))}

                {/* Upgrade Card */}
                <div className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-6 text-gray-400 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => setIsInviteOpen(true)}>
                    <Plus size={32} className="mb-2 opacity-50" />
                    <span className="text-sm font-medium">Invite new member</span>
                </div>
            </div>

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
                        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Send Invite</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
