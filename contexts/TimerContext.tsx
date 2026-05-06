'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Task } from '@/types';
import { db } from '@/lib/db';

interface ActiveTimer {
    taskId: string;
    taskTitle: string;
    projectId: string;
    startTime: string; // ISO string
}

interface TimerContextType {
    activeTimer: ActiveTimer | null;
    startTimer: (task: Task) => void;
    stopTimer: () => Promise<void>;
    elapsedMinutes: number;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const STORAGE_KEY = 'taskflow_active_timer';

export function TimerProvider({ children }: { children: ReactNode }) {
    const { currentUser } = useAuth();
    const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
    const [dbTimerId, setDbTimerId] = useState<string | null>(null);
    const [elapsedMinutes, setElapsedMinutes] = useState(0);

    // Initial load from DB (Source of truth) and localStorage (Speed)
    useEffect(() => {
        if (!currentUser) {
            setActiveTimer(null);
            setDbTimerId(null);
            return;
        }

        const syncTimer = async () => {
            try {
                const dbEntry = await db.getActiveTimer(currentUser.id);
                if (dbEntry) {
                    const newTimer: ActiveTimer = {
                        taskId: dbEntry.taskId,
                        taskTitle: '',
                        projectId: dbEntry.projectId || '',
                        startTime: dbEntry.startTime,
                    };
                    setActiveTimer(newTimer);
                    setDbTimerId(dbEntry.id);

                    const start = new Date(dbEntry.startTime);
                    const diff = Math.floor((new Date().getTime() - start.getTime()) / 60000);
                    setElapsedMinutes(Math.max(0, diff));
                    return;
                }

                // 2. Fallback to localStorage if DB is empty but we had something (less likely now)
                const savedTimer = localStorage.getItem(`${STORAGE_KEY}_${currentUser.id}`);
                if (savedTimer) {
                    const parsed = JSON.parse(savedTimer);
                    setActiveTimer(parsed);
                    const start = new Date(parsed.startTime);
                    const diff = Math.floor((new Date().getTime() - start.getTime()) / 60000);
                    setElapsedMinutes(Math.max(0, diff));
                }
            } catch (e) {
                console.error('Failed to sync timer', e);
            }
        };

        syncTimer();
    }, [currentUser]);

    // Sync across tabs via localStorage
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (currentUser && e.key === `${STORAGE_KEY}_${currentUser.id}`) {
                if (e.newValue) {
                    const parsed = JSON.parse(e.newValue);
                    setActiveTimer(parsed);
                    const start = new Date(parsed.startTime);
                    const diff = Math.floor((new Date().getTime() - start.getTime()) / 60000);
                    setElapsedMinutes(Math.max(0, diff));
                } else {
                    setActiveTimer(null);
                    setDbTimerId(null);
                    setElapsedMinutes(0);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [currentUser]);

    // Update elapsed time counter
    useEffect(() => {
        if (!activeTimer) {
            setElapsedMinutes(0);
            return;
        }

        const interval = setInterval(() => {
            const start = new Date(activeTimer.startTime);
            const now = new Date();
            const diff = Math.floor((now.getTime() - start.getTime()) / 60000);
            setElapsedMinutes(Math.max(0, diff));
        }, 30000); 

        return () => clearInterval(interval);
    }, [activeTimer]);

    const startTimer = async (task: Task) => {
        if (!currentUser) return;

        try {
            const entry = await db.startTimeEntry(task.id, currentUser.id, task.projectId);
            if (!entry) throw new Error('Failed to start timer in DB');

            const newTimer: ActiveTimer = {
                taskId: task.id,
                taskTitle: task.title,
                projectId: task.projectId,
                startTime: entry.startTime,
            };

            setActiveTimer(newTimer);
            setDbTimerId(entry.id);
            setElapsedMinutes(0);
            
            localStorage.setItem(`${STORAGE_KEY}_${currentUser.id}`, JSON.stringify(newTimer));
            window.dispatchEvent(new CustomEvent('timer-state-changed'));
        } catch (err) {
            console.error('Failed to start timer:', err);
        }
    };

    const stopTimer = async () => {
        if (!currentUser) {
            setActiveTimer(null);
            setDbTimerId(null);
            setElapsedMinutes(0);
            return;
        }

        try {
            if (dbTimerId) {
                const stoppedEntry = await db.stopTimeEntry(dbTimerId, 'Logged via TaskFlow Timer');
                if (!stoppedEntry) throw new Error('Failed to stop timer in DB');
            } else {
                const stoppedEntries = await db.stopActiveTimersForUser(currentUser.id, undefined, 'Logged via TaskFlow Timer');
                if (stoppedEntries.length === 0) throw new Error('Failed to stop timer in DB');
            }

            // Clear local state after server confirms stop.
            setActiveTimer(null);
            setDbTimerId(null);
            setElapsedMinutes(0);
            localStorage.removeItem(`${STORAGE_KEY}_${currentUser.id}`);
            window.dispatchEvent(new CustomEvent('timer-state-changed'));

        } catch (error) {
            console.error('Error stopping timer:', error);
            // Even if API fails, we clear local timer to stop UI from being stuck
            setActiveTimer(null);
            setDbTimerId(null);
            localStorage.removeItem(`${STORAGE_KEY}_${currentUser.id}`);
            window.dispatchEvent(new CustomEvent('timer-state-changed'));
        }
    };

    return (
        <TimerContext.Provider value={{ activeTimer, startTimer, stopTimer, elapsedMinutes }}>
            {children}
        </TimerContext.Provider>
    );
}

export function useTimer() {
    const context = useContext(TimerContext);
    if (!context) {
        throw new Error('useTimer must be used within a TimerProvider');
    }
    return context;
}
