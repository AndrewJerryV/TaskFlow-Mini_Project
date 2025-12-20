import fs from 'fs';
import path from 'path';
import { DbSchema, Project, Task, User, ActivityLog } from '@/types';

const DB_PATH = path.join(process.cwd(), 'data.json');

const INITIAL_DATA: DbSchema = {
    users: [
        { id: 'u1', name: 'Andrew User', email: 'andrew@example.com', role: 'Admin', avatarUrl: 'https://ui-avatars.com/api/?name=Andrew+User&background=0D8ABC&color=fff' },
        { id: 'u2', name: 'Jane Doe', email: 'jane@example.com', role: 'Manager', avatarUrl: 'https://ui-avatars.com/api/?name=Jane+Doe&background=random' },
    ],
    projects: [
        {
            id: 'p1',
            name: 'TaskFlow Development',
            description: 'Building the ultimate work management platform.',
            key: 'TF',
            ownerId: 'u1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            id: 'p2',
            name: 'Marketing Campaign Q1',
            description: 'Launch strategy for the new product line.',
            key: 'MKT',
            ownerId: 'u2',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    ],
    tasks: [
        {
            id: 't1',
            projectId: 'p1',
            title: 'Initialize Project',
            description: 'Set up Next.js and Tailwind.',
            status: 'Done',
            priority: 'High',
            assigneeId: 'u1',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ['Dev', 'Setup'],
        },
        {
            id: 't2',
            projectId: 'p1',
            title: 'Implement Task Board',
            description: 'Create a Kanban board using dnd-kit.',
            status: 'In Progress',
            priority: 'Critical',
            assigneeId: 'u1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ['Feature', 'Frontend'],
        },
        {
            id: 't3',
            projectId: 'p1',
            title: 'User Authentication',
            description: 'Implement secure login flow.',
            status: 'To Do',
            priority: 'Medium',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ['Backend'],
        }
    ],
    activityLogs: [
        {
            id: 'l1',
            entityType: 'Task',
            entityId: 't1',
            action: 'Created',
            details: 'Task created.',
            userId: 'u1',
            timestamp: new Date(Date.now() - 86400000).toISOString()
        },
        {
            id: 'l2',
            entityType: 'Task',
            entityId: 't1',
            action: 'Moved',
            details: 'Moved from "In Progress" to "Done".',
            userId: 'u1',
            timestamp: new Date().toISOString()
        }
    ],
};

// Singleton to handle DB operations
class Database {
    private data: DbSchema | null = null;

    constructor() {
        this.load();
    }

    private load() {
        try {
            if (!fs.existsSync(DB_PATH)) {
                this.data = INITIAL_DATA;
                this.save();
            } else {
                const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
                this.data = JSON.parse(fileContent);
            }
        } catch (error) {
            console.error('Failed to load database:', error);
            this.data = INITIAL_DATA;
        }
    }

    private save() {
        if (this.data) {
            fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2));
        }
    }

    // Generic Getters
    getUsers(): User[] { return this.data?.users || []; }
    getProjects(): Project[] { return this.data?.projects || []; }
    getTasks(projectId?: string): Task[] {
        const allTasks = this.data?.tasks || [];
        if (projectId) return allTasks.filter(t => t.projectId === projectId);
        return allTasks;
    }
    getActivityLogs(): ActivityLog[] { return this.data?.activityLogs || []; }

    // Generic Modifiers
    addProject(project: Project) {
        this.data?.projects.push(project);
        this.save();
    }

    addTask(task: Task) {
        this.data?.tasks.push(task);
        this.createLog({
            id: crypto.randomUUID(),
            entityType: 'Task',
            entityId: task.id,
            action: 'Created',
            details: `Task "${task.title}" created.`,
            userId: task.assigneeId || 'system',
            timestamp: new Date().toISOString()
        });
        this.save();
    }

    updateTask(id: string, updates: Partial<Task>) {
        const task = this.data?.tasks.find(t => t.id === id);
        if (!task) return null;

        const oldStatus = task.status;
        Object.assign(task, updates);
        task.updatedAt = new Date().toISOString();

        if (updates.status && updates.status !== oldStatus) {
            this.createLog({
                id: crypto.randomUUID(),
                entityType: 'Task',
                entityId: task.id,
                action: 'Moved',
                details: `Status changed from "${oldStatus}" to "${updates.status}".`,
                userId: 'system', // In a real app, this would be the current user
                timestamp: new Date().toISOString()
            });
        }

        this.save();
        return task;
    }

    createLog(log: ActivityLog) {
        this.data?.activityLogs.unshift(log); // Add to beginning
        this.save();
    }
}

export const db = new Database();
