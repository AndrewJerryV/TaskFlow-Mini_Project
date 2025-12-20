'use client';

import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { Badge } from 'lucide-react'; // Placeholder logic

// Utility to get color by priority
const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
        case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'Medium': return 'bg-blue-100 text-blue-800 border-blue-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

interface TaskCardProps {
    task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task }
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`bg-white p-3 rounded-md shadow-sm border border-gray-200 cursor-grab hover:shadow-md transition-all ${isDragging ? 'opacity-50' : ''} mb-3`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)} font-medium`}>
                    {task.priority}
                </span>
                {task.assigneeId && (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                        {/* Fallback avatar */}
                        UI
                    </div>
                )}
            </div>
            <h4 className="font-medium text-gray-900 text-sm mb-1">{task.title}</h4>
            <div className="flex flex-wrap gap-1 mt-2">
                {task.tags.map(tag => (
                    <span key={tag} className="text-[10px] items-center px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-100">
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
}
