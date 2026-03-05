'use client';

import React from 'react';
import { useTimer } from '@/contexts/TimerContext';
import { Clock, Square } from 'lucide-react';

export function TimerRunningIndicator() {
    const { activeTimer, stopTimer, elapsedMinutes } = useTimer();

    if (!activeTimer) return null;

    const handleStopTimer = async () => {
        await stopTimer();
    };

    return (
        <div className="flex items-center gap-2 bg-blue-600 dark:bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-sm animate-in slide-in-from-right duration-300 max-w-[280px]">
            <div className="relative flex-shrink-0">
                <Clock size={13} className="animate-spin-slow" />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            </div>
            <span className="truncate max-w-[120px]" title={activeTimer.taskTitle}>
                {activeTimer.taskTitle}
            </span>
            <span className="font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0">
                {Math.floor(elapsedMinutes / 60)}h {elapsedMinutes % 60}m
            </span>
            <button
                onClick={handleStopTimer}
                className="flex items-center gap-1 bg-white text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold hover:bg-blue-50 transition-colors flex-shrink-0"
                title="Stop timer and save to database"
            >
                <Square size={8} fill="currentColor" />
                Stop
            </button>
        </div>
    );
}
