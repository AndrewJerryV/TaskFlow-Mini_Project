'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { User, Tag, CalendarClock } from 'lucide-react';
import { getPriorityColorBordered } from '@/lib/utils';

interface TaskCardProps {
    task: Task;
    isOverlay?: boolean;
    onClick?: (task: Task) => void;
    disableDrag?: boolean;
}

export function TaskCard({ task, isOverlay, onClick, disableDrag }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task },
        disabled: disableDrag
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
    } : undefined;

    const handleClick = (e: React.MouseEvent) => {
        // Only trigger click if not dragging
        if (!isDragging && onClick) {
            onClick(task);
        }
    };

    // If overlay, we force opacity 1 and maybe add shadow
    if (isOverlay) {
        return (
            <div className="bg-white dark:bg-gray-700 p-3 rounded-md shadow-xl border border-blue-500 cursor-grabbing mb-3 scale-105">
                <CardContent task={task} />
            </div>
        );
    }

    return (
        <div
            ref={disableDrag ? undefined : setNodeRef}
            style={style}
            {...(disableDrag ? {} : listeners)}
            {...(disableDrag ? {} : attributes)}
            onClick={handleClick}
            className={`bg-white dark:bg-gray-700 p-3 rounded-md shadow-sm border ${disableDrag
                ? 'border-gray-200 dark:border-gray-600 cursor-pointer hover:border-gray-300 dark:hover:border-gray-500'
                : 'border-l-4 border-l-blue-500 border-gray-200 dark:border-gray-600 cursor-grab hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500'
                } transition-all ${isDragging ? 'opacity-30' : ''} mb-3`}
        >
            <CardContent task={task} />
        </div>
    );
}

function CardContent({ task }: { task: Task }) {

    const formattedDate = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        })
        : "No deadline";

    const isOverdue =
        task.dueDate &&
        new Date(task.dueDate) < new Date() &&
        task.status !== "Done";

    return (
        <>
            <div className="flex justify-between items-start mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColorBordered(task.priority)} font-medium`}>
                    {task.priority}
                </span>
                {task.assigneeId && (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <User size={14} />
                    </div>
                )}
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">{task.title}</h4>
            <div className='flex gap-1 items-center'>
                <CalendarClock size={12} color='grey' />
                <p className={`text-[10px] font-medium ${isOverdue ? "text-red-600" : "text-gray-500"}`}>
                    Due: {formattedDate}
                </p>
            </div>


            <div className="flex flex-wrap gap-1 mt-2">
                {task.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-300 border border-gray-100 dark:border-gray-500">
                        <Tag size={10} /> {tag}
                    </span>
                ))}
            </div>
        </>
    )
}
