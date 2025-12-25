'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';

export default function LoginPage() {
    const { login, currentUser, users, isLoading } = useAuth();
    const router = useRouter();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Redirect if already logged in
    useEffect(() => {
        if (currentUser && !isLoading) {
            router.push('/');
        }
    }, [currentUser, isLoading, router]);

    const handleLogin = () => {
        if (selectedUser) {
            login(selectedUser);
            router.push('/');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (currentUser) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
                        <img src="/icon.svg" alt="TaskFlow" className="h-full w-auto" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome to TaskFlow</h1>
                    <p className="text-gray-500 mt-2">Select a user to continue</p>
                </div>

                <div className="space-y-3 mb-6">
                    {users.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">
                            <p>No users found.</p>
                            <p className="text-sm mt-2">Run the seed SQL script in Supabase first.</p>
                        </div>
                    ) : (
                        users.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => setSelectedUser(user)}
                                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${selectedUser?.id === user.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-semibold overflow-hidden">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        user.name.charAt(0)
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="font-semibold text-gray-900">{user.name}</div>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                                    user.role === 'Manager' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                    {user.role}
                                </span>
                            </button>
                        ))
                    )}
                </div>

                <button
                    onClick={handleLogin}
                    disabled={!selectedUser}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                >
                    {selectedUser ? `Continue as ${selectedUser.name}` : 'Select a user'}
                </button>
            </div>
        </div>
    );
}
