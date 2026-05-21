import React from 'react';
import { Task } from '@/types';

// --- PIE CHART ---
interface PieData {
    label: string;
    value: number;
    color: string;
}

export function PieChart({ data }: { data: PieData[] }) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercent = 0;

    if (total === 0) return (
        <div className="flex flex-col items-center justify-center p-8 text-gray-400">
            <div className="w-24 h-24 rounded-full border-4 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center mb-3">
                <span className="text-xs">No data</span>
            </div>
            <p className="text-xs text-gray-400">No tasks completed yet</p>
        </div>
    );

    function getCoordinatesForPercent(percent: number) {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    }

    return (
        <div className="flex flex-col md:flex-row items-center gap-8 justify-center p-4 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <div className="relative">
                {/* Decorative background circle */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-gray-100 to-transparent dark:from-gray-800 pointer-events-none transform scale-105"></div>

                <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-36 h-36 transform -rotate-90 drop-shadow-md">
                    {data.map((slice, index) => {
                        if (slice.value === 0) return null;
                        const startPercent = cumulativePercent;
                        const slicePercent = slice.value / total;
                        cumulativePercent += slicePercent;

                        // Add a tiny gap between slices for a cleaner look if there are multiple slices
                        const gap = data.filter(d => d.value > 0).length > 1 ? 0.005 : 0;
                        const endPercent = cumulativePercent - gap;

                        const [startX, startY] = getCoordinatesForPercent(startPercent);
                        const [endX, endY] = getCoordinatesForPercent(endPercent);

                        // If full circle
                        if (slicePercent === 1) {
                            return (
                                <circle
                                    key={index}
                                    cx="0" cy="0" r="1"
                                    fill="transparent"
                                    stroke={slice.color}
                                    strokeWidth="0.3"
                                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                                />
                            );
                        }

                        const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
                        const pathData = `
                            M ${startX * 0.7} ${startY * 0.7}
                            L ${startX} ${startY} 
                            A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} 
                            L ${endX * 0.7} ${endY * 0.7}
                            A 0.7 0.7 0 ${largeArcFlag} 0 ${startX * 0.7} ${startY * 0.7}
                        `;

                        return (
                            <path
                                key={index}
                                d={pathData}
                                fill={slice.color}
                                className="transition-all duration-300 hover:opacity-80 cursor-pointer transform hover:scale-105 hover:-translate-x-1 hover:-translate-y-1 origin-center"
                                style={{ transformOrigin: 'center' }}
                            />
                        );
                    })}
                    {/* Inner circle for donut hole aesthetic */}
                    <circle cx="0" cy="0" r="0.65" className="fill-white dark:fill-gray-800" />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{total}</span>
                    <span className="text-[10px] uppercase font-medium tracking-wider text-gray-500 dark:text-gray-400">Tasks</span>
                </div>
            </div>

            <div className="flex flex-wrap md:flex-col gap-3 md:gap-4 justify-center">
                {data.map((slice, idx) => (
                    slice.value > 0 && (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors w-32">
                            <div
                                className="w-3.5 h-3.5 rounded-full shadow-sm ring-2 ring-white dark:ring-gray-800"
                                style={{ backgroundColor: slice.color }}
                            ></div>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{slice.label}</span>
                                <span className="text-[10px] text-gray-500 font-medium">
                                    {slice.value} task{slice.value !== 1 ? 's' : ''} ({Math.round((slice.value / total) * 100)}%)
                                </span>
                            </div>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}

// --- TIMELINE (GANTT) ---
export function TaskTimeline({ tasks }: { tasks: Task[] }) {
    if (tasks.length === 0) return (
        <div className="flex items-center justify-center p-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/30">
            <span className="text-sm text-gray-400 font-medium">No timeline data available</span>
        </div>
    );

    // Filter tasks with valid dates for better visualization
    const validTasks = tasks.map(t => ({
        ...t,
        start: t.startDate ? new Date(t.startDate).getTime() : new Date(t.createdAt).getTime(),
        end: t.dueDate ? new Date(t.dueDate).getTime() : (t.status === 'Done' ? new Date(t.updatedAt).getTime() : new Date().getTime())
    })).sort((a, b) => a.start - b.start);

    if (validTasks.length === 0) return null;

    const minTime = Math.min(...validTasks.map(t => t.start));
    // Add buffer to max time
    const maxTime = Math.max(...validTasks.map(t => t.end)) + (1000 * 60 * 60 * 24 * 2);
    const totalDuration = maxTime - minTime;

    return (
        <div className="border border-gray-100 dark:border-gray-700/80 rounded-xl p-5 bg-white dark:bg-gray-800/80 shadow-sm relative overflow-hidden text-sm">
            <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10"
                style={{ backgroundImage: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px)', backgroundSize: '10% 100%' }}>
            </div>

            <div className="flex items-center justify-between mb-6 relative z-10">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Project Timeline
                </h4>
            </div>

            <div className="space-y-4 relative z-10">
                {validTasks.slice(0, 8).map((task, index) => { // Limiting to 8 for simple view
                    const left = ((task.start - minTime) / totalDuration) * 100;
                    const width = Math.max(((task.end - task.start) / totalDuration) * 100, 2); // Min 2% width for visibility

                    const colorClass = task.status === 'Done' ? 'bg-emerald-500' :
                        task.status === 'In Progress' ? 'bg-blue-500' :
                            task.status === 'Review' ? 'bg-amber-500' :
                                'bg-gray-400 dark:bg-gray-500';

                    return (
                        <div key={task.id} className="grid grid-cols-12 gap-4 items-center group">
                            <div className="col-span-4 md:col-span-3">
                                <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate text-right border-r border-gray-200 dark:border-gray-700 pr-3 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                    {task.title}
                                </p>
                            </div>
                            <div className="col-span-8 md:col-span-9 relative h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
                                <div
                                    className={`absolute h-full rounded-full ${colorClass} transition-all duration-300 ease-out`}
                                    style={{
                                        left: `${left}%`,
                                        width: `${width}%`,
                                        opacity: 0.9
                                    }}
                                    title={`${task.status}: ${new Date(task.start).toLocaleDateString()} - ${new Date(task.end).toLocaleDateString()}`}
                                >
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-between text-[10px] font-medium text-gray-400 mt-5 pt-3 border-t border-gray-100 dark:border-gray-700/50 relative z-10">
                <div className="flex flex-col">
                    <span className="uppercase tracking-widest text-[8px] text-gray-300">Start</span>
                    <span>{new Date(minTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="uppercase tracking-widest text-[8px] text-gray-300">End</span>
                    <span>{new Date(maxTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 1.5s infinite;
                }
            `}} />
        </div>
    );
}
