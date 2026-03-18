'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Users, Tag, Calendar as CalendarIcon } from 'lucide-react';
import { Task } from '@/types';
import { CustomSelect } from './ui/CustomSelect';

interface CalendarViewProps {
    projectId: string;
    tasks?: Task[];
}

interface CalendarEvent {
    id: string;
    title: string;
    date: string;
    type: 'task' | 'meeting' | 'deadline' | 'milestone';
    color: string;
    time?: string;
    attendees?: string[];
}

const eventColors = {
    // Map priorities to colors
    High: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700',
    Medium: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700',
    Low: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700',
    Critical: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700',
};

const eventTypeColors = {
    task: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700',
    meeting: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700',
    deadline: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700',
    milestone: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700',
};

const ST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // IST is UTC+5.5

const toLocalISOString = (date: Date): string => {
    const istDate = new Date(date.getTime() + ST_OFFSET_MS);
    return istDate.toISOString().split('T')[0];
};

export default function CalendarView({ projectId, tasks = [] }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(toLocalISOString(new Date()));

    // Convert DB tasks to CalendarEvents
    const [customEvents, setCustomEvents] = useState<CalendarEvent[]>([]);

    // Convert DB tasks to CalendarEvents
    const events: CalendarEvent[] = useMemo(() => {
        const taskEvents: CalendarEvent[] = tasks.filter(t => t.dueDate).map(task => ({
            id: task.id,
            title: task.title,
            date: task.dueDate?.split('T')[0] || '',
            type: 'task',
            color: eventColors[task.priority as keyof typeof eventColors] || eventColors.Medium,
            time: task.dueDate?.includes('T') ? new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        }));
        return [...taskEvents, ...customEvents];
    }, [tasks, customEvents]);

    const [showEventForm, setShowEventForm] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', type: 'task' as CalendarEvent['type'], time: '' });

    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days: { date: Date; isCurrentMonth: boolean }[] = [];

        // Previous month days
        const prevMonth = new Date(year, month, 0);
        for (let i = startingDay - 1; i >= 0; i--) {
            const prevDate = new Date(year, month - 1, prevMonth.getDate() - i);
            days.push({ date: prevDate, isCurrentMonth: false });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }

        // Next month days
        // Only fill the remaining days of the current week (7 columns)
        // If we end on a Saturday (idx 6, length % 7 == 0), we add 0 days.
        const remainingDays = (7 - (days.length % 7)) % 7;

        for (let i = 1; i <= remainingDays; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }

        return days;
    }, [currentDate]);

    const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const navigate = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
            return newDate;
        });
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const getEventsForDate = (date: Date) => {
        const dateStr = toLocalISOString(date);
        return events.filter(e => e.date === dateStr);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const handleAddEvent = () => {
        if (!selectedDate || !newEvent.title.trim()) return;

        const event: CalendarEvent = {
            id: `event-${Date.now()}`,
            title: newEvent.title,
            date: selectedDate,
            type: newEvent.type,
            color: eventTypeColors[newEvent.type],
            time: newEvent.time || undefined,
        };

        setCustomEvents([...customEvents, event]);
        setNewEvent({ title: '', type: 'task', time: '' });
        setShowEventForm(false);
    };

    const selectedDateEvents = selectedDate ? events.filter(e => e.date === selectedDate) : [];

    const formattedSelectedDate = useMemo(() => {
        if (!selectedDate) return '';
        const [year, month, day] = selectedDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }, [selectedDate]);

    return (
        <div className="h-full overflow-y-auto flex gap-6 p-6 items-start">
            {/* Calendar Grid */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-visible">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {monthYear}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('prev')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => navigate('next')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Days Header */}
                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="h-auto">
                    <div className="grid grid-cols-7 auto-rows-[minmax(92px,auto)]">
                    {daysInMonth.map(({ date, isCurrentMonth }, idx) => {
                        const dateStr = toLocalISOString(date);
                        const dayEvents = getEventsForDate(date);
                        const isSelected = selectedDate === dateStr;

                        return (
                            <div
                                key={idx}
                                onClick={() => setSelectedDate(dateStr)}
                                className={`p-1 border-r border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors
                                    ${isToday(date) ? 'bg-blue-50 dark:bg-blue-900/30' : !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}
                                    ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}
                                `}
                            >
                                <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full
                                    ${isToday(date) ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}
                                `}>
                                    {date.getDate()}
                                </div>
                                <div className="space-y-1">
                                    {dayEvents.slice(0, 3).map(event => (
                                        <div
                                            key={event.id}
                                            className={`text-xs px-1.5 py-0.5 rounded truncate border ${event.color}`}
                                        >
                                            {event.title}
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                                            +{dayEvents.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </div>
            </div>

            {/* Sidebar - Selected Date Details */}
            <div className="w-80 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {formattedSelectedDate}
                        </h3>
                        {selectedDate && (
                            <button
                                onClick={() => setShowEventForm(!showEventForm)}
                                className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        )}
                    </div>

                    {/* Add Event Form */}
                    {showEventForm && selectedDate && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
                            <input
                                type="text"
                                placeholder="Event title"
                                value={newEvent.title}
                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                            <div className="flex gap-2">
                                <CustomSelect
                                    value={newEvent.type}
                                    onChange={(val: string) => setNewEvent({ ...newEvent, type: val as CalendarEvent['type'] })}
                                    options={[
                                        { value: 'task', label: 'Task' },
                                        { value: 'meeting', label: 'Meeting' },
                                        { value: 'deadline', label: 'Deadline' },
                                        { value: 'milestone', label: 'Milestone' }
                                    ]}
                                    className="flex-1"
                                    searchable={false}
                                />
                                <input
                                    type="time"
                                    value={newEvent.time}
                                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <button
                                onClick={handleAddEvent}
                                className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Add Event
                            </button>
                        </div>
                    )}
                </div>

                {/* Events List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {selectedDateEvents.length === 0 ? (
                        <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                            <CalendarIcon size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No events scheduled</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {selectedDateEvents.map(event => (
                                <div
                                    key={event.id}
                                    className={`p-3 rounded-lg border ${event.color}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-medium text-sm">{event.title}</h4>
                                            <div className="flex items-center gap-2 mt-1 text-xs opacity-75">
                                                <Tag size={12} />
                                                <span className="capitalize">{event.type}</span>
                                            </div>
                                        </div>
                                        {event.time && (
                                            <div className="flex items-center gap-1 text-xs">
                                                <Clock size={12} />
                                                {event.time}
                                            </div>
                                        )}
                                    </div>
                                    {event.attendees && (
                                        <div className="flex items-center gap-1 mt-2 text-xs opacity-75">
                                            <Users size={12} />
                                            {event.attendees.join(', ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Event Types</p>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(eventColors).map(([type, color]) => (
                            <div key={type} className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded ${color.split(' ')[0]}`} />
                                <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{type}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
