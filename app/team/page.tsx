'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserStatsCard } from '@/components/UserStatsCard';
import { ShieldAlert, Plus } from 'lucide-react';
import { UserHistoryModal } from '@/components/UserHistoryModal';
import { AddUserDialog } from '@/components/forms/AddUserDialog';
import { User } from '@/types';
import { EditSkillsDialog } from '@/components/forms/EditSkillsDialog';

export default function TeamPage() {
    const { currentUser } = useAuth();
    const [teamData, setTeamData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [editingSkillsUser, setEditingSkillsUser] = useState<User | null>(null);

    const fetchTeamData = () => {
        setLoading(true);
        if (currentUser?.role === 'Admin' || currentUser?.role === 'Manager') {
            fetch('/api/team')
                .then(res => res.json())
                .then(data => {
                    if (currentUser) {
                        data.sort((a: User, b: User) => {
                            if (a.id === currentUser.id) return -1;
                            if (b.id === currentUser.id) return 1;
                            return 0;
                        });
                    }
                    setTeamData(data);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamData();
    }, [currentUser]);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading team data...</div>;
    }

    if (!currentUser || (currentUser.role !== 'Admin' && currentUser.role !== 'Manager')) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
                <ShieldAlert size={48} className="text-red-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Access Denied</h2>
                <p className="mt-2">You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <header className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Monitor team workload, capacity, and wellness. Click on a member to view details.
                    </p>
                </div>
                {currentUser?.role === 'Admin' && (
                    <button
                        onClick={() => setIsAddUserOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-transparent"
                    >
                        <Plus size={18} />
                        Add New User
                    </button>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamData.map(user => (
                    <UserStatsCard
                        key={user.id}
                        user={user}
                        onClick={() => setSelectedUser(user)}
                        onEditSkills={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setEditingSkillsUser(user);
                        }}
                    />
                ))}
            </div>

            {teamData.length === 0 && (
                <div className="text-center py-12 text-gray-400 italic">
                    No team members found.
                </div>
            )}

            <UserHistoryModal
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                user={selectedUser}
                onEditSkills={() => {
                    if (selectedUser) {
                        setEditingSkillsUser(selectedUser);
                        setSelectedUser(null);
                    }
                }}
            />

            <AddUserDialog
                isOpen={isAddUserOpen}
                onClose={() => setIsAddUserOpen(false)}
                onSuccess={() => {
                    fetchTeamData();
                }}
            />

            {editingSkillsUser && (
                <EditSkillsDialog
                    isOpen={!!editingSkillsUser}
                    onClose={() => setEditingSkillsUser(null)}
                    onSuccess={() => {
                        fetchTeamData();
                    }}
                    user={editingSkillsUser}
                />
            )}
        </div>
    );
}
