'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
    currentUser: User | null;
    users: User[];
    isLoading: boolean;
    login: (user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'taskflow_current_user';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load users from API and restore session
    useEffect(() => {
        const init = async () => {
            try {
                // Fetch available users
                const res = await fetch('/api/users');
                if (res.ok) {
                    const data = await res.json();
                    setUsers(Array.isArray(data) ? data : []);
                }

                // Restore session from localStorage
                const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (stored) {
                    try {
                        const user = JSON.parse(stored);
                        setCurrentUser(user);
                    } catch {
                        localStorage.removeItem(LOCAL_STORAGE_KEY);
                    }
                }
            } catch (error) {
                console.error('Failed to initialize auth:', error);
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, []);

    const login = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    };

    return (
        <AuthContext.Provider value={{ currentUser, users, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
