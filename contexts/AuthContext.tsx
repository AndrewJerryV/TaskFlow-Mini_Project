'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
    currentUser: User | null;
    users: User[];
    isLoading: boolean;
    login: (user: User) => void;
    logout: () => void;
    setCurrentUser: (user: User | null) => void;
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
                // Fetch available users
                const res = await fetch('/api/users');
                let data: User[] = [];
                if (res.ok) {
                    data = await res.json();
                    setUsers(Array.isArray(data) ? data : []);
                }

                // Restore session from localStorage but prefer fresh data
                const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (stored) {
                    try {
                        const storedUser = JSON.parse(stored);
                        // Find the updated user object from the fresh API response
                        const freshUser = Array.isArray(data) ? data.find((u: User) => u.id === storedUser.id) : null;

                        if (freshUser) {
                            setCurrentUser(freshUser);
                            // Update local storage to match fresh data
                            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(freshUser));
                        } else {
                            // If user not found in fresh data (likely legacy ID 'u1'), clear session
                            console.warn("Stored user not found in fresh data, clearing session.");
                            setCurrentUser(null);
                            localStorage.removeItem(LOCAL_STORAGE_KEY);
                        }
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
        <AuthContext.Provider value={{ currentUser, users, isLoading, login, logout, setCurrentUser }}>
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
