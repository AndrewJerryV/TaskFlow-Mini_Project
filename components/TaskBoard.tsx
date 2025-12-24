'use client';

import React, { useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor, defaultDropAnimationSideEffects, useDroppable } from '@dnd-kit/core';
import { Task, Status } from '@/types';
import { TaskCard } from './TaskCard';
import { createPortal } from 'react-dom';

type TaskBoardProps = {
    tasks: Task[];
    onTaskMove: (taskId: string, newStatus: Status) => void;
};

const COLUMNS: Status[] = ['To Do', 'In Progress', 'Done'];

function Column({ id, title, tasks }: { id: Status, title: string, tasks: Task[] }) {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div ref={setNodeRef} className="flex-1 min-w-[280px] flex flex-col h-full bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-gray-200/60 dark:border-gray-700/60 ml-3 first:ml-0">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${id === 'To Do' ? 'bg-gray-400' : id === 'In Progress' ? 'bg-blue-500' : 'bg-green-500'}`} />
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">{title}</h3>
                </div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{tasks.length}</span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto min-h-[100px]">
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                ))}
                {tasks.length === 0 && (
                    <div className="h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-sm italic border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-lg">
                        Empty
                    </div>
                )}
            </div>
        </div>
    );
}

export function TaskBoard({ tasks, onTaskMove }: TaskBoardProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const activeTask = tasks.find(t => t.id === activeId);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            // Check if over.id is a known status
            if (COLUMNS.includes(over.id as any)) {
                onTaskMove(active.id as string, over.id as Status);
            }
        }
        setActiveId(null);
    };

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex h-full overflow-x-auto pb-4">
                {COLUMNS.map(status => (
                    <Column
                        key={status}
                        id={status}
                        title={status}
                        tasks={tasks.filter(t => t.status === status)}
                    />
                ))}
            </div>

            {/* Drag Portal */}
            {typeof window !== 'undefined' && createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                    {activeTask ? (
                        <div className="transform rotate-3 cursor-grabbing">
                            <TaskCard task={activeTask} isOverlay />
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
