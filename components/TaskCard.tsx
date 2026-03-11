'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { User as UserIcon, Tag, CalendarClock, Lock } from 'lucide-react';
import { getPriorityColorBordered } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface TaskCardProps {
    task: Task;
    isOverlay?: boolean;
    onClick?: (task: Task) => void;
    disableDrag?: boolean;
}

export function TaskCard({ task, isOverlay, onClick, disableDrag }: TaskCardProps) {
    const { currentUser } = useAuth();
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

    const canDrag = currentUser?.role === 'Admin' || currentUser?.role === 'Manager' || task.assigneeId === currentUser?.id;
    const isDragDisabled = disableDrag || !canDrag;

    // If overlay, we force opacity 1 and maybe add shadow
    if (isOverlay) {
        return (
            <div className="bg-white dark:bg-gray-700 p-3 rounded-md shadow-xl border border-blue-500 cursor-grabbing mb-3 scale-105 min-h-[140px]">
                <CardContent task={task} />
            </div>
        );
    }

    return (
        <div
            ref={isDragDisabled ? undefined : setNodeRef}
            style={style}
            {...(isDragDisabled ? {} : listeners)}
            {...(isDragDisabled ? {} : attributes)}
            onClick={handleClick}
            className={`bg-white dark:bg-gray-700 p-3 rounded-md shadow-sm border min-h-[140px] flex flex-col justify-between ${isDragDisabled
                ? 'border-gray-200 dark:border-gray-600 cursor-not-allowed opacity-60 bg-gray-50 dark:bg-gray-800/80'
                : 'border-l-4 border-l-blue-500 border-gray-200 dark:border-gray-600 cursor-grab hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500'
                } transition-all ${isDragging ? 'opacity-30' : ''} mb-3`}
        >
            <CardContent task={task} />
        </div>
    );
}

function CardContent({ task }: { task: Task }) {
    const { users } = useAuth();

    const assignee = users?.find(u => u.id === task.assigneeId);

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
                    <div
                        className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs uppercase font-medium overflow-hidden"
                        title={assignee?.name || 'Assigned'}
                    >
                        {assignee?.avatarUrl ? (
                            <img 
                                src={assignee.avatarUrl} 
                                alt={assignee.name} 
                                className="w-full h-full object-cover" 
                                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(assignee.name)}&background=random`; }}
                            />
                        ) : (
                            assignee ? assignee.name.charAt(0) : <UserIcon size={14} className="text-white" />
                        )}
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
                {task.isPrivate && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium">
                        <Lock size={10} /> Private
                    </span>
                )}
                {task.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-300 border border-gray-100 dark:border-gray-500">
                        <Tag size={10} /> {tag}
                    </span>
                ))}
            </div>
        </>
    )
}
