import { PrismaClient } from '@prisma/client';
import { Project, Task, User, ActivityLog, Message, Priority, Status } from '@/types';

// PrismaClient Singleton
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Database Adapter to maintain similar API structure but Async
class Database {

    // Generic Getters
    async getUsers(): Promise<User[]> {
        const users = await prisma.user.findMany();
        // Map Prisma types to our types if needed (mostly 1:1)
        return users as unknown as User[];
    }

    async getProjects(): Promise<Project[]> {
        const projects = await prisma.project.findMany();
        return projects as unknown as Project[];
    }

    async getTasks(projectId?: string): Promise<Task[]> {
        let tasks;
        if (projectId) {
            tasks = await prisma.task.findMany({ where: { projectId } });
        } else {
            tasks = await prisma.task.findMany();
        }

        // Parse tags from string to array for SQLite
        return tasks.map((t: any) => ({
            ...t,
            tags: JSON.parse(t.tags || '[]')
        })) as unknown as Task[];
    }

    async getActivityLogs(): Promise<ActivityLog[]> {
        return await prisma.activityLog.findMany({ orderBy: { timestamp: 'desc' } }) as unknown as ActivityLog[];
    }

    async getMessages(projectId: string): Promise<Message[]> {
        return await prisma.message.findMany({
            where: { projectId },
            orderBy: { timestamp: 'asc' }
        }) as unknown as Message[];
    }

    // Generic Modifiers
    async addProject(project: Project) {
        await prisma.project.create({
            data: {
                id: project.id,
                key: project.key,
                name: project.name,
                description: project.description,
                ownerId: project.ownerId,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt
            }
        });
    }

    async addTask(task: Task) {
        await prisma.task.create({
            data: {
                id: task.id,
                projectId: task.projectId,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                assigneeId: task.assigneeId,
                startDate: task.startDate,
                dueDate: task.dueDate,
                tags: JSON.stringify(task.tags || []), // Serialize for SQLite
                createdAt: task.createdAt,
                updatedAt: task.updatedAt
            }
        });

        await this.createLog({
            id: crypto.randomUUID(),
            entityType: 'Task',
            entityId: task.id,
            action: 'Created',
            details: `Task "${task.title}" created.`,
            userId: task.assigneeId || 'system',
            timestamp: new Date().toISOString()
        });
    }

    async updateTask(id: string, updates: Partial<Task>) {
        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) return null;

        const oldStatus = task.status;

        const dataToUpdate: any = { ...updates };
        if (updates.tags) {
            dataToUpdate.tags = JSON.stringify(updates.tags);
        }

        const updated = await prisma.task.update({
            where: { id },
            data: {
                ...dataToUpdate,
                updatedAt: new Date().toISOString()
            }
        });

        if (updates.status && updates.status !== oldStatus) {
            await this.createLog({
                id: crypto.randomUUID(),
                entityType: 'Task',
                entityId: id,
                action: 'Moved',
                details: `Status changed from "${oldStatus}" to "${updates.status}".`,
                userId: 'system',
                timestamp: new Date().toISOString()
            });
        }

        return {
            ...updated,
            tags: JSON.parse(updated.tags || '[]')
        } as unknown as Task;
    }

    async createLog(log: ActivityLog) {
        await prisma.activityLog.create({
            data: {
                id: log.id,
                entityType: log.entityType,
                entityId: log.entityId,
                action: log.action,
                details: log.details,
                userId: log.userId,
                timestamp: log.timestamp
            }
        });
    }

    async addMessage(message: Message) {
        await prisma.message.create({
            data: {
                id: message.id,
                projectId: message.projectId,
                userId: message.userId,
                content: message.content,
                timestamp: message.timestamp
            }
        });
    }

    async addUser(user: Partial<User>) {
        await prisma.user.create({
            data: {
                id: user.id || crypto.randomUUID(),
                name: user.name || 'New Member',
                email: user.email!,
                avatarUrl: user.avatarUrl || '',
                role: user.role || 'Member',
                createdAt: new Date().toISOString()
            }
        });
    }

}

export const db = new Database();

