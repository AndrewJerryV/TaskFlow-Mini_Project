'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Task } from '@/types';

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
    const [elapsedMinutes, setElapsedMinutes] = useState(0);

    // Initial load from localStorage
    useEffect(() => {
        if (!currentUser) {
            setActiveTimer(null);
            return;
        }

        const savedTimer = localStorage.getItem(`${STORAGE_KEY}_${currentUser.id}`);
        if (savedTimer) {
            try {
                const parsed = JSON.parse(savedTimer);
                setActiveTimer(parsed);
                // Calculate initial elapsed time
                const start = new Date(parsed.startTime);
                const now = new Date();
                const diff = Math.floor((now.getTime() - start.getTime()) / 60000);
                setElapsedMinutes(Math.max(0, diff));
            } catch (e) {
                console.error('Failed to parse saved timer', e);
                localStorage.removeItem(`${STORAGE_KEY}_${currentUser.id}`);
            }
        }
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
        }, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, [activeTimer]);

    // Sync across tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (currentUser && e.key === `${STORAGE_KEY}_${currentUser.id}`) {
                if (e.newValue) {
                    setActiveTimer(JSON.parse(e.newValue));
                } else {
                    setActiveTimer(null);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [currentUser]);

    const startTimer = (task: Task) => {
        if (!currentUser) return;

        const newTimer: ActiveTimer = {
            taskId: task.id,
            taskTitle: task.title,
            projectId: task.projectId,
            startTime: new Date().toISOString(),
        };

        // Instant local update
        setActiveTimer(newTimer);
        setElapsedMinutes(0);
        localStorage.setItem(`${STORAGE_KEY}_${currentUser.id}`, JSON.stringify(newTimer));
        window.dispatchEvent(new CustomEvent('timer-state-changed'));

        // Also write to DB so other users can see this timer is active
        fetch('/api/tasks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: task.id,
                userId: currentUser.id,
                activeTimerStart: newTimer.startTime,
            })
        }).catch(err => console.error('Failed to set active_timer_start in DB:', err));
    };

    const stopTimer = async () => {
        if (!activeTimer || !currentUser) return;

        const endTime = new Date();
        const startTime = new Date(activeTimer.startTime);
        const diffMs = endTime.getTime() - startTime.getTime();
        const totalMinutes = Math.max(1, Math.round(diffMs / 60000));

        try {
            // 1. Fetch current task to get latest timeLogs
            const res = await fetch(`/api/tasks/${activeTimer.taskId}`);
            if (!res.ok) throw new Error('Failed to fetch task');
            const task: Task = await res.json();

            // 2. Prepare new time log
            const newTimeLog = {
                userId: currentUser.id,
                minutes: totalMinutes,
                date: endTime.toISOString()
            };

            const updatedTimeLogs = [...(task.timeLogs || []), newTimeLog];

            // 3. Save to database
            const updateRes = await fetch('/api/tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: activeTimer.taskId,
                    userId: currentUser.id,
                    activeTimerStart: null, // Ensure DB timer is cleared if it exists
                    timeLogs: updatedTimeLogs
                })
            });

            if (!updateRes.ok) throw new Error('Failed to update task');

            // 4. Clear local state
            setActiveTimer(null);
            setElapsedMinutes(0);
            localStorage.removeItem(`${STORAGE_KEY}_${currentUser.id}`);
            window.dispatchEvent(new CustomEvent('timer-state-changed'));

        } catch (error) {
            console.error('Error stopping timer and saving log:', error);
            // Even if API fails, we clear local timer to stop the UI ribbon from being stuck
            // Users can manually log time if needed, but a stuck ribbon is worse
            setActiveTimer(null);
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
