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

    if (total === 0) return <div className="text-center text-gray-400 text-xs">No data</div>;

    function getCoordinatesForPercent(percent: number) {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    }

    return (
        <div className="flex items-center gap-8 justify-center">
            <svg viewBox="-1 -1 2 2" className="w-32 h-32 transform -rotate-90">
                {data.map((slice, index) => {
                    if (slice.value === 0) return null;
                    const startPercent = cumulativePercent;
                    const slicePercent = slice.value / total;
                    cumulativePercent += slicePercent;
                    const endPercent = cumulativePercent;

                    const [startX, startY] = getCoordinatesForPercent(startPercent);
                    const [endX, endY] = getCoordinatesForPercent(endPercent);

                    // If full circle
                    if (slicePercent === 1) {
                        return <circle key={index} cx="0" cy="0" r="1" fill={slice.color} />;
                    }

                    const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
                    const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;

                    return <path key={index} d={pathData} fill={slice.color} />;
                })}
            </svg>
            <div className="space-y-2">
                {data.map((slice, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: slice.color }}></span>
                        <span className="text-gray-600 dark:text-gray-300 font-medium">{slice.label}</span>
                        <span className="text-gray-400">({slice.value})</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- TIMELINE (GANTT) ---
export function TaskTimeline({ tasks }: { tasks: Task[] }) {
    if (tasks.length === 0) return <div className="text-center text-gray-400 text-xs">No tasks to display</div>;

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
        <div className="border border-gray-100 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-800/50">
            <h4 className="text-xs font-semibold text-gray-500 mb-4 uppercase">Project Timeline</h4>
            <div className="space-y-3">
                {validTasks.slice(0, 8).map(task => { // Limiting to 8 for simple view
                    const left = ((task.start - minTime) / totalDuration) * 100;
                    const width = Math.max(((task.end - task.start) / totalDuration) * 100, 1); // Min 1% width

                    const color = task.status === 'Done' ? 'bg-green-400' :
                        task.status === 'In Progress' ? 'bg-blue-400' : 'bg-gray-300';

                    return (
                        <div key={task.id} className="grid grid-cols-12 gap-2 item-center group">
                            <div className="col-span-3 text-[10px] text-gray-500 truncate text-right pr-2">
                                {task.title}
                            </div>
                            <div className="col-span-9 relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`absolute h-full rounded-full opacity-80 ${color} group-hover:opacity-100 transition-all`}
                                    style={{ left: `${left}%`, width: `${width}%` }}
                                    title={`${new Date(task.start).toLocaleDateString()} - ${new Date(task.end).toLocaleDateString()}`}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-20">
                <span>{new Date(minTime).toLocaleDateString()}</span>
                <span>{new Date(maxTime).toLocaleDateString()}</span>
            </div>
        </div>
    );
}
