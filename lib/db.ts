import { getSupabase, DbUser, DbProject, DbTask, DbActivityLog, DbMessage } from './supabase';
import { Project, Task, User, ActivityLog, Message } from '@/types';

// Helper functions to convert between snake_case DB and camelCase TS
function toUser(dbUser: DbUser): User {
    return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        avatarUrl: dbUser.avatar_url,
        role: dbUser.role,
        createdAt: dbUser.created_at,
    };
}

function toProject(dbProject: DbProject): Project {
    return {
        id: dbProject.id,
        name: dbProject.name,
        description: dbProject.description || '',
        key: dbProject.key,
        ownerId: dbProject.owner_id,
        createdAt: dbProject.created_at,
        updatedAt: dbProject.updated_at,
    };
}

function toTask(dbTask: DbTask): Task {
    return {
        id: dbTask.id,
        projectId: dbTask.project_id,
        title: dbTask.title,
        description: dbTask.description,
        status: dbTask.status,
        priority: dbTask.priority,
        assigneeId: dbTask.assignee_id,
        dueDate: dbTask.due_date,
        startDate: dbTask.start_date,
        createdAt: dbTask.created_at,
        updatedAt: dbTask.updated_at,
        tags: dbTask.tags || [],
    };
}

function toActivityLog(dbLog: DbActivityLog): ActivityLog {
    return {
        id: dbLog.id,
        entityType: dbLog.entity_type,
        entityId: dbLog.entity_id,
        action: dbLog.action,
        details: dbLog.details || '',
        userId: dbLog.user_id,
        timestamp: dbLog.timestamp,
    };
}

function toMessage(dbMessage: DbMessage): Message {
    return {
        id: dbMessage.id,
        projectId: dbMessage.project_id,
        userId: dbMessage.user_id,
        content: dbMessage.content,
        timestamp: dbMessage.timestamp,
    };
}

// Database class with async Supabase operations
class Database {
    // Users
    async getUsers(): Promise<User[]> {
        const { data, error } = await getSupabase()
            .from('users')
            .select('*');

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }
        return (data || []).map(toUser);
    }

    // Projects
    async getProjects(): Promise<Project[]> {
        const { data, error } = await getSupabase()
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching projects:', error);
            return [];
        }
        return (data || []).map(toProject);
    }

    async addProject(project: Project): Promise<void> {
        const { error } = await getSupabase()
            .from('projects')
            .insert({
                id: project.id,
                name: project.name,
                description: project.description,
                key: project.key,
                owner_id: project.ownerId,
                created_at: project.createdAt,
                updated_at: project.updatedAt,
            });

        if (error) {
            console.error('Error adding project:', error);
        }
    }

    // Tasks
    async getTasks(projectId?: string): Promise<Task[]> {
        let query = getSupabase().from('tasks').select('*');

        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }
        return (data || []).map(toTask);
    }

    async addTask(task: Task): Promise<void> {
        const { error } = await getSupabase()
            .from('tasks')
            .insert({
                id: task.id,
                project_id: task.projectId,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                assignee_id: task.assigneeId,
                due_date: task.dueDate,
                start_date: task.startDate,
                created_at: task.createdAt,
                updated_at: task.updatedAt,
                tags: task.tags,
            });

        if (error) {
            console.error('Error adding task:', error);
            return;
        }

        // Create activity log
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

    async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
        // First get the current task to compare status
        const { data: currentTasks, error: fetchError } = await getSupabase()
            .from('tasks')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !currentTasks) {
            console.error('Error fetching task for update:', fetchError);
            return null;
        }

        const oldStatus = currentTasks.status;

        // Build update object in snake_case
        const dbUpdates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
        if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

        const { data, error } = await getSupabase()
            .from('tasks')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating task:', error);
            return null;
        }

        // Log status change
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

        return toTask(data);
    }

    // Activity Logs
    async getActivityLogs(): Promise<ActivityLog[]> {
        const { data, error } = await getSupabase()
            .from('activity_logs')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('Error fetching activity logs:', error);
            return [];
        }
        return (data || []).map(toActivityLog);
    }

    async createLog(log: ActivityLog): Promise<void> {
        const { error } = await getSupabase()
            .from('activity_logs')
            .insert({
                id: log.id,
                entity_type: log.entityType,
                entity_id: log.entityId,
                action: log.action,
                details: log.details,
                user_id: log.userId,
                timestamp: log.timestamp,
            });

        if (error) {
            console.error('Error creating activity log:', error);
        }
    }

    // Messages
    async getMessages(projectId: string): Promise<Message[]> {
        const { data, error } = await getSupabase()
            .from('messages')
            .select('*')
            .eq('project_id', projectId)
            .order('timestamp', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
        return (data || []).map(toMessage);
    }

    async addMessage(message: Message): Promise<void> {
        const { error } = await getSupabase()
            .from('messages')
            .insert({
                id: message.id,
                project_id: message.projectId,
                user_id: message.userId,
                content: message.content,
                timestamp: message.timestamp,
            });

        if (error) {
            console.error('Error adding message:', error);
        }
    }
}

export const db = new Database();
