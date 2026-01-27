'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniCalendarProps {
    onSelect: (date: string) => void;
    currentDate?: string;
    className?: string;
}

export function MiniCalendar({ onSelect, currentDate, className = '' }: MiniCalendarProps) {
    const [viewDate, setViewDate] = useState(currentDate ? new Date(currentDate) : new Date());

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

    // Previous month filler days
    const prevMonthDays = [];
    const prevMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0);
    for (let i = firstDay - 1; i >= 0; i--) {
        prevMonthDays.push(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, prevMonth.getDate() - i));
    }

    // Current month days
    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
        currentMonthDays.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), i));
    }

    const allDays = [...prevMonthDays, ...currentMonthDays];

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateClick = (date: Date) => {
        const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
        onSelect(dateStr);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    return (
        <div className={`w-64 bg-white dark:bg-gray-800 rounded-lg shadow p-3 ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                    <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-xs text-gray-400 dark:text-gray-500 font-medium py-1">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {allDays.map((date, idx) => {
                    const isCurrentMonth = date.getMonth() === viewDate.getMonth();
                    const isSelected = currentDate === date.toLocaleDateString('en-CA');

                    return (
                        <button
                            key={idx}
                            onClick={() => handleDateClick(date)}
                            className={`
                                h-8 w-8 rounded text-xs flex items-center justify-center transition-colors
                                ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'}
                                ${isToday(date) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold' : ''}
                                ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                            `}
                        >
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>

            <button
                onClick={() => handleDateClick(new Date())}
                className="w-full mt-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
                Today
            </button>
        </div>
    );
}
