'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { Badge, User, Tag } from 'lucide-react';

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
    isOverlay?: boolean;
}

export function TaskCard({ task, isOverlay }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task }
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
    } : undefined;

    // If overlay, we force opacity 1 and maybe add shadow
    if (isOverlay) {
        return (
            <div className="bg-white p-3 rounded-md shadow-xl border border-blue-500 cursor-grabbing mb-3 scale-105">
                <CardContent task={task} />
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`bg-white p-3 rounded-md shadow-sm border border-gray-200 cursor-grab hover:shadow-md hover:border-blue-300 transition-all ${isDragging ? 'opacity-30' : ''} mb-3`}
        >
            <CardContent task={task} />
        </div>
    );
}

function CardContent({ task }: { task: Task }) {
    return (
        <>
            <div className="flex justify-between items-start mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)} font-medium`}>
                    {task.priority}
                </span>
                {task.assigneeId && (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <User size={14} />
                    </div>
                )}
            </div>
            <h4 className="font-medium text-gray-900 text-sm mb-1">{task.title}</h4>
            <div className="flex flex-wrap gap-1 mt-2">
                {task.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-100">
                        <Tag size={10} /> {tag}
                    </span>
                ))}
            </div>
        </>
    )
}
