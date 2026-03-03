import { getSupabase, DbUser, DbProject, DbTask, DbActivityLog, DbMessage, DbComment, DbForm, DbFormResponse, DbDocument, DbShortcut, DbRepoLink, DbFormLink, DbNotification } from './supabase';
import { Project, Task, User, ActivityLog, Message, Comment, Form, FormResponse, Document, Notification } from '@/types';

// Helper functions to convert between snake_case DB and camelCase TS
function toUser(dbUser: DbUser): User {
    return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        avatarUrl: dbUser.avatar_url,
        role: dbUser.role,
        createdAt: dbUser.created_at,
        dob: dbUser.dob,
        skillExperience: typeof dbUser.skill_experience === 'string' ? JSON.parse(dbUser.skill_experience) : dbUser.skill_experience,
        // Use actual skills from database
        skills: dbUser.skills || [],
        wellnessScore: dbUser.wellness_score || 85,
        maxWorkload: dbUser.max_workload || 5,
        burnoutRisk: 'Low',
        phone: dbUser.phone,
        officeAddress: dbUser.office_address,
        // Settings
        timezone: dbUser.timezone,
        quietHoursStart: dbUser.quiet_hours_start,
        quietHoursEnd: dbUser.quiet_hours_end,
        quietHoursWeekends: dbUser.quiet_hours_weekends,
        twoFactorEnabled: dbUser.two_factor_enabled,
        // AI Settings
        burnoutSensitivity: dbUser.burnout_sensitivity,
        autoAssign: dbUser.auto_assign,
        skillMatchPriority: dbUser.skill_match_priority,
        aiDeadlines: dbUser.ai_deadlines,
        // Notification Settings
        emailDigestFrequency: dbUser.email_digest_frequency,
        pushNotifications: dbUser.push_notifications,
        soundAlerts: dbUser.sound_alerts,
    } as User;
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
        attachment: dbMessage.attachment ? JSON.parse(dbMessage.attachment) : undefined,
    };
}

function toComment(dbComment: DbComment): Comment {
    return {
        id: dbComment.id,
        taskId: dbComment.task_id,
        userId: dbComment.user_id,
        content: dbComment.content,
        createdAt: dbComment.created_at,
    };
}

function toForm(dbForm: DbForm): Form {
    return {
        id: dbForm.id,
        projectId: dbForm.project_id,
        title: dbForm.title,
        description: dbForm.description,
        fields: JSON.parse(dbForm.fields || '[]'),
        status: dbForm.status,
        createdBy: dbForm.created_by,
        createdAt: dbForm.created_at,
        updatedAt: dbForm.updated_at,
    };
}

function toFormResponse(dbResponse: DbFormResponse): FormResponse {
    return {
        id: dbResponse.id,
        formId: dbResponse.form_id,
        respondentId: dbResponse.respondent_id,
        answers: JSON.parse(dbResponse.answers || '{}'),
        submittedAt: dbResponse.submitted_at,
    };
}


function toDocument(dbDoc: DbDocument): Document {
    return {
        id: dbDoc.id,
        projectId: dbDoc.project_id,
        title: dbDoc.title,
        type: dbDoc.type as 'page' | 'file',
        content: dbDoc.content,
        filePath: dbDoc.file_path,
        fileType: dbDoc.file_type,
        size: dbDoc.size,
        createdBy: dbDoc.created_by,
        createdAt: dbDoc.created_at,
        updatedAt: dbDoc.updated_at,
    };
}

function toNotification(dbNotif: DbNotification): Notification {
    return {
        id: dbNotif.id,
        userId: dbNotif.user_id,
        type: dbNotif.type,
        title: dbNotif.title,
        message: dbNotif.message,
        isRead: dbNotif.is_read,
        link: dbNotif.link,
        entityId: dbNotif.entity_id,
        projectId: dbNotif.project_id,
        createdAt: dbNotif.created_at,
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

    async getUser(id: string): Promise<User | null> {
        const { data, error } = await getSupabase()
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('Error fetching user:', error);
            return null;
        }
        return toUser(data);
    }

    async updateUserSettings(userId: string, settings: Partial<{
        phone: string;
        officeAddress: string;
        timezone: string;
        quietHoursStart: string;
        quietHoursEnd: string;
        quietHoursWeekends: boolean;
        twoFactorEnabled: boolean;
        maxWorkload: number;
        burnoutSensitivity: number;
        autoAssign: boolean;
        skillMatchPriority: boolean;
        aiDeadlines: boolean;
        emailDigestFrequency: string;
        pushNotifications: boolean;
        soundAlerts: boolean;
    }>): Promise<User | null> {
        const { data, error } = await getSupabase()
            .from('users')
            .update({
                phone: settings.phone,
                office_address: settings.officeAddress,
                timezone: settings.timezone,
                quiet_hours_start: settings.quietHoursStart,
                quiet_hours_end: settings.quietHoursEnd,
                quiet_hours_weekends: settings.quietHoursWeekends,
                two_factor_enabled: settings.twoFactorEnabled,
                max_workload: settings.maxWorkload,
                burnout_sensitivity: settings.burnoutSensitivity,
                auto_assign: settings.autoAssign,
                skill_match_priority: settings.skillMatchPriority,
                ai_deadlines: settings.aiDeadlines,
                email_digest_frequency: settings.emailDigestFrequency,
                push_notifications: settings.pushNotifications,
                sound_alerts: settings.soundAlerts,
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating user settings:', error);
            return null;
        }
        return toUser(data);
    }

    async updateUserRole(userId: string, newRole: string): Promise<boolean> {
        const { error } = await getSupabase()
            .from('users')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) {
            console.error('Error updating user role:', error);
            return false;
        }
        return true;
    }

    async updateUserSkills(userId: string, skills: string[], skillExperience: Record<string, number>): Promise<{ success: boolean; error?: any }> {
        const { error } = await getSupabase()
            .from('users')
            .update({
                skills,
                skill_experience: skillExperience
            })
            .eq('id', userId);

        if (error) {
            console.error('Error updating user skills:', error);
            return { success: false, error };
        }
        return { success: true };
    }

    async addUser(userData: {
        email: string;
        password?: string;
        fullName: string;
        role: string;
        dob?: string;
        skillExperience?: Record<string, number>;
        maxWorkload: number;
    }): Promise<User | null> {
        const skillsArray = userData.skillExperience ? Object.keys(userData.skillExperience) : [];
        const { data: userId, error } = await getSupabase().rpc('admin_create_user', {
            p_email: userData.email,
            p_password: userData.password || 'TaskFlow@123',
            p_full_name: userData.fullName,
            p_user_role: userData.role,
            p_skills: skillsArray,
            p_dob: userData.dob,
            p_skill_experience: userData.skillExperience,
            p_max_workload: userData.maxWorkload
        });

        if (error) {
            console.error('Error creating user via RPC:', error);
            throw new Error(error.message);
        }

        if (userId) {
            return await this.getUser(userId as string);
        }
        return null;
    }

    // Projects
    async getProjects(userId?: string): Promise<Project[]> {
        let user: User | null = null;
        if (userId) {
            user = await this.getUser(userId);
        }

        let query = getSupabase().from('projects').select('*');

        // Only filter if userId is provided and user is not an Admin
        if (userId) {
            if (!user) {
                console.warn(`User with ID ${userId} not found in getProjects. Returning empty list.`);
                return [];
            }

            if (user.role !== 'Admin') {
                const { data: membershipData, error: membershipError } = await getSupabase()
                    .from('project_members')
                    .select('project_id')
                    .eq('user_id', userId);

                if (membershipError) {
                    console.error('Error fetching project memberships:', membershipError);
                }

                const projectIds = membershipData ? membershipData.map((m: any) => m.project_id) : [];

                // Construct the or filter string
                const ownerFilter = `owner_id.eq.${userId}`;
                const membershipFilter = projectIds.length > 0 ? `,id.in.(${projectIds.join(',')})` : '';

                query = query.or(`${ownerFilter}${membershipFilter}`);
            }
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching projects:', error);
            return [];
        }
        return (data || []).map(toProject);
    }

    async getProject(id: string): Promise<Project | null> {
        const { data, error } = await getSupabase()
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
                console.error('Error fetching project:', error);
            }
            return null;
        }
        return toProject(data);
    }

    async getProjectMembers(projectId: string): Promise<string[]> {
        const { data, error } = await getSupabase()
            .from('project_members')
            .select('user_id')
            .eq('project_id', projectId);

        if (error) {
            console.error('Error fetching project members:', error);
            return [];
        }
        return (data || []).map((m: any) => m.user_id);
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
            return;
        }

        // Add creator as the first member (Owner)
        await this.addProjectMember(project.id, project.ownerId, 'Owner');
    }

    async addProjectMember(projectId: string, userId: string, role: string = 'Member'): Promise<boolean> {
        const { error } = await getSupabase()
            .from('project_members')
            .insert({
                project_id: projectId,
                user_id: userId,
                role: role
            });

        if (error) {
            console.error('Error adding project member:', error);
            return false;
        }
        return true;
    }

    async removeProjectMember(projectId: string, userId: string): Promise<boolean> {
        const { error } = await getSupabase()
            .from('project_members')
            .delete()
            .eq('project_id', projectId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error removing project member:', error);
            return false;
        }
        return true;
    }

    async deleteProject(id: string): Promise<boolean> {
        // Delete all tasks in this project first
        const { error: tasksError } = await getSupabase()
            .from('tasks')
            .delete()
            .eq('project_id', id);

        if (tasksError) {
            console.error('Error deleting project tasks:', tasksError);
        }

        // Delete the project
        const { error } = await getSupabase()
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting project:', error);
            return false;
        }
        return true;
    }

    // Tasks
    async getTasks(projectId?: string, assigneeId?: string): Promise<Task[]> {
        let query = getSupabase().from('tasks').select('*');

        if (projectId) {
            query = query.eq('project_id', projectId);
        }
        if (assigneeId) {
            query = query.eq('assignee_id', assigneeId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }
        return (data || []).map(toTask);
    }

    async addTask(task: Task, userId: string = 'system'): Promise<void> {
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
            userId: userId,
            timestamp: new Date().toISOString()
        });
    }

    async updateTask(id: string, updates: Partial<Task>, userId: string = 'system'): Promise<Task | null> {
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
                userId: userId,
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

    async getUserActivityLogs(userId: string): Promise<ActivityLog[]> {
        const { data, error } = await getSupabase()
            .from('activity_logs')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('Error fetching user activity logs:', error);
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
                attachment: message.attachment ? JSON.stringify(message.attachment) : null,
            });

        if (error) {
            console.error('Error adding message:', error);
            throw new Error(`Failed to add message: ${error.message}`);
        }
    }

    // Get single task by ID
    async getTaskById(id: string): Promise<Task | null> {
        const { data, error } = await getSupabase()
            .from('tasks')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('Error fetching task:', error);
            return null;
        }
        return toTask(data);
    }

    // Delete task
    async deleteTask(id: string, userId: string): Promise<boolean> {
        // Get task title for activity log
        const task = await this.getTaskById(id);
        if (!task) return false;

        const { error } = await getSupabase()
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting task:', error);
            return false;
        }

        // Log deletion
        await this.createLog({
            id: crypto.randomUUID(),
            entityType: 'Task',
            entityId: id,
            action: 'Deleted',
            details: `Task "${task.title}" deleted.`,
            userId: userId,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    // Comments
    async getComments(taskId: string): Promise<Comment[]> {
        const { data, error } = await getSupabase()
            .from('comments')
            .select('*')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching comments:', error);
            return [];
        }
        return (data || []).map(toComment);
    }

    async addComment(comment: Comment): Promise<void> {
        const { error } = await getSupabase()
            .from('comments')
            .insert({
                id: comment.id,
                task_id: comment.taskId,
                user_id: comment.userId,
                content: comment.content,
                created_at: comment.createdAt,
            });

        if (error) {
            console.error('Error adding comment:', error);
            return;
        }

        // Log comment activity
        const task = await this.getTaskById(comment.taskId);
        await this.createLog({
            id: crypto.randomUUID(),
            entityType: 'Task',
            entityId: comment.taskId,
            action: 'Commented',
            details: `Comment added on "${task?.title || 'task'}".`,
            userId: comment.userId,
            timestamp: new Date().toISOString()
        });
    }

    // Forms
    async getForms(projectId: string): Promise<Form[]> {
        const { data, error } = await getSupabase()
            .from('forms')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching forms:', error);
            return [];
        }
        return (data || []).map(toForm);
    }

    async getFormById(id: string): Promise<Form | null> {
        const { data, error } = await getSupabase()
            .from('forms')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('Error fetching form:', error);
            return null;
        }
        return toForm(data);
    }

    async addForm(form: Form): Promise<void> {
        const { error } = await getSupabase()
            .from('forms')
            .insert({
                id: form.id,
                project_id: form.projectId,
                title: form.title,
                description: form.description,
                fields: JSON.stringify(form.fields),
                status: form.status,
                created_by: form.createdBy,
                created_at: form.createdAt,
                updated_at: form.updatedAt,
            });

        if (error) {
            console.error('Error adding form:', error);
            throw new Error(error.message);
        }
    }

    async updateForm(id: string, updates: Partial<Form>): Promise<Form | null> {
        const dbUpdates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.fields !== undefined) dbUpdates.fields = JSON.stringify(updates.fields);
        if (updates.status !== undefined) dbUpdates.status = updates.status;

        const { data, error } = await getSupabase()
            .from('forms')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating form:', error);
            return null;
        }
        return toForm(data);
    }

    async deleteForm(id: string): Promise<boolean> {
        // Delete all responses first
        await getSupabase()
            .from('form_responses')
            .delete()
            .eq('form_id', id);

        const { error } = await getSupabase()
            .from('forms')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting form:', error);
            return false;
        }
        return true;
    }

    // Form Responses
    async getFormResponses(formId: string): Promise<FormResponse[]> {
        const { data, error } = await getSupabase()
            .from('form_responses')
            .select('*')
            .eq('form_id', formId)
            .order('submitted_at', { ascending: false });

        if (error) {
            console.error('Error fetching form responses:', error);
            return [];
        }
        return (data || []).map(toFormResponse);
    }

    async getFormResponsesByRespondent(projectId: string, respondentId: string): Promise<FormResponse[]> {
        // First get all forms in the project
        const forms = await this.getForms(projectId);
        if (forms.length === 0) return [];

        const formIds = forms.map(f => f.id);

        const { data, error } = await getSupabase()
            .from('form_responses')
            .select('*')
            .in('form_id', formIds)
            .eq('respondent_id', respondentId);

        if (error) {
            console.error('Error fetching respondent form responses:', error);
            return [];
        }
        return (data || []).map(toFormResponse);
    }

    async addFormResponse(response: FormResponse): Promise<void> {
        const { error } = await getSupabase()
            .from('form_responses')
            .insert({
                id: response.id,
                form_id: response.formId,
                respondent_id: response.respondentId,
                answers: JSON.stringify(response.answers),
                submitted_at: response.submittedAt,
            });

        if (error) {
            console.error('Error adding form response:', error);
            throw new Error(`Failed to add form response: ${error.message}`);
        }
    }

    async updateFormResponse(id: string, answers: any): Promise<FormResponse | null> {
        const { data, error } = await getSupabase()
            .from('form_responses')
            .update({
                answers: JSON.stringify(answers),
                submitted_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating form response:', error);
            return null;
        }
        return toFormResponse(data);
    }

    async upsertFormResponse(response: FormResponse): Promise<FormResponse | null> {
        // Check if response already exists for this form and respondent
        const { data: existing, error: existError } = await getSupabase()
            .from('form_responses')
            .select('*')
            .eq('form_id', response.formId)
            .eq('respondent_id', response.respondentId)
            .single();

        if (existError && existError.code !== 'PGRST116') {
            console.error('Error checking existing form response:', existError);
            return null;
        }

        if (existing) {
            return this.updateFormResponse(existing.id, response.answers);
        } else {
            await this.addFormResponse(response);
            return response;
        }
    }

    async getProjectFormsActivity(projectId: string): Promise<number> {
        const forms = await this.getForms(projectId);
        if (forms.length === 0) return 0;

        const formIds = forms.map(f => f.id);
        const { count, error } = await getSupabase()
            .from('form_responses')
            .select('*', { count: 'exact', head: true })
            .in('form_id', formIds);

        if (error) {
            console.error('Error fetching project forms activity:', error);
            return 0;
        }
        return count || 0;
    }

    // Documents
    async getDocuments(projectId: string): Promise<Document[]> {
        const { data, error } = await getSupabase()
            .from('documents')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching documents:', error);
            return [];
        }
        return (data || []).map(toDocument);
    }

    async createDocument(doc: Document): Promise<Document | null> {
        const { data, error } = await getSupabase()
            .from('documents')
            .insert({
                id: doc.id,
                project_id: doc.projectId,
                title: doc.title,
                type: doc.type,
                content: doc.content,
                file_path: doc.filePath,
                file_type: doc.fileType,
                size: doc.size,
                created_by: doc.createdBy,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating document:', error);
            return null;
        }
        return toDocument(data);
    }

    async deleteDocument(docId: string): Promise<boolean> {
        const { error } = await getSupabase()
            .from('documents')
            .delete()
            .eq('id', docId);

        if (error) {
            console.error('Error deleting document:', error);
            return false;
        }
        return true;
    }

    async updateDocument(docId: string, updates: { title?: string; content?: string }): Promise<boolean> {
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };

        if (updates.title !== undefined) {
            updateData.title = updates.title;
        }
        if (updates.content !== undefined) {
            updateData.content = updates.content;
        }

        const { error } = await getSupabase()
            .from('documents')
            .update(updateData)
            .eq('id', docId);

        if (error) {
            console.error('Error updating document:', error);
            return false;
        }
        return true;
    }

    // Shortcuts
    async getShortcuts(projectId: string): Promise<DbShortcut[]> {
        const { data, error } = await getSupabase()
            .from('shortcuts')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching shortcuts:', error);
            return [];
        }
        return data || [];
    }

    async addShortcut(shortcut: { id: string; project_id: string; name: string; url: string; type: 'link' | 'repository' }): Promise<DbShortcut | null> {
        const { data, error } = await getSupabase()
            .from('shortcuts')
            .insert({
                id: shortcut.id,
                project_id: shortcut.project_id,
                name: shortcut.name,
                url: shortcut.url,
                type: shortcut.type,
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding shortcut:', error);
            return null;
        }
        return data;
    }

    async deleteShortcut(id: string): Promise<boolean> {
        const { error } = await getSupabase()
            .from('shortcuts')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting shortcut:', error);
            return false;
        }
        return true;
    }

    // Repo Links
    async getRepoLinks(projectId: string): Promise<DbRepoLink[]> {
        const { data, error } = await getSupabase()
            .from('repo_links')
            .select('*')
            .eq('project_id', projectId)
            .order('added_at', { ascending: true });

        if (error) {
            console.error('Error fetching repo links:', error);
            return [];
        }
        return data || [];
    }

    async addRepoLink(repoLink: { id: string; project_id: string; name: string; url: string; owner: string; repo: string; description?: string }): Promise<DbRepoLink | null> {
        const { data, error } = await getSupabase()
            .from('repo_links')
            .insert({
                id: repoLink.id,
                project_id: repoLink.project_id,
                name: repoLink.name,
                url: repoLink.url,
                owner: repoLink.owner,
                repo: repoLink.repo,
                description: repoLink.description || null,
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding repo link:', error);
            return null;
        }
        return data;
    }

    async deleteRepoLink(id: string): Promise<boolean> {
        const { error } = await getSupabase()
            .from('repo_links')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting repo link:', error);
            return false;
        }
        return true;
    }

    // Form Links
    async getFormLinks(projectId: string): Promise<DbFormLink[]> {
        const { data, error } = await getSupabase()
            .from('form_links')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching form links:', error);
            return [];
        }
        return data || [];
    }

    async addFormLink(formLink: { id: string; project_id: string; title: string; description?: string; form_url: string; created_by?: string }): Promise<DbFormLink | null> {
        const { data, error } = await getSupabase()
            .from('form_links')
            .insert({
                id: formLink.id,
                project_id: formLink.project_id,
                title: formLink.title,
                description: formLink.description || null,
                form_url: formLink.form_url,
                created_by: formLink.created_by || null,
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding form link:', error);
            return null;
        }
        return data;
    }

    async deleteFormLink(id: string): Promise<boolean> {
        const { error } = await getSupabase()
            .from('form_links')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting form link:', error);
            return false;
        }
        return true;
    }

    // Meeting URL
    async getMeetingUrl(projectId: string): Promise<string | null> {
        const { data, error } = await getSupabase()
            .from('projects')
            .select('meeting_url')
            .eq('id', projectId)
            .single();

        if (error || !data) return null;
        return data.meeting_url || null;
    }

    async setMeetingUrl(projectId: string, meetingUrl: string | null): Promise<boolean> {
        const { error } = await getSupabase()
            .from('projects')
            .update({ meeting_url: meetingUrl })
            .eq('id', projectId);

        if (error) {
            console.error('Error updating meeting URL:', error);
            return false;
        }
        return true;
    }

    // Notifications
    async getNotifications(userId: string): Promise<Notification[]> {
        const { data, error } = await getSupabase()
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
        return (data || []).map(toNotification);
    }

    async getUnreadNotificationCount(userId: string): Promise<number> {
        const { count, error } = await getSupabase()
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Error counting unread notifications:', error);
            return 0;
        }
        return count || 0;
    }

    async addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<void> {
        const { error } = await getSupabase()
            .from('notifications')
            .insert({
                user_id: notification.userId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                link: notification.link,
                entity_id: notification.entityId,
                project_id: notification.projectId,
            });

        if (error) {
            console.error('Error adding notification:', error);
        }
    }

    async markNotificationRead(id: string): Promise<boolean> {
        const { error } = await getSupabase()
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) {
            console.error('Error marking notification read:', error);
            return false;
        }
        return true;
    }

    async markAllNotificationsRead(userId: string): Promise<boolean> {
        const { error } = await getSupabase()
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Error marking all notifications read:', error);
            return false;
        }
        return true;
    }
}

export const db = new Database();

