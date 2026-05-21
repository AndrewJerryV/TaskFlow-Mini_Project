import { Project } from '@/types';
import { NextResponse } from 'next/server';
import { sendProjectMemberAdded } from '@/lib/email';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        const supabase = getSupabaseForRequest(request);
        let projects: any[] = [];
        if (userId) {
            const { data: owned } = await supabase.from('projects').select('*').eq('owner_id', userId);
            const { data: memberships } = await supabase.from('project_members').select('project_id').eq('user_id', userId);
            const memberProjectIds = (memberships || []).map((m: any) => m.project_id);
            const { data: memberProjects } = memberProjectIds.length ? await supabase.from('projects').select('*').in('id', memberProjectIds) : { data: [] };
            projects = [...(owned || []), ...(memberProjects || [])];
        } else {
            const { data: all } = await supabase.from('projects').select('*');
            projects = all || [];
        }

        // Get tasks for all projects returned, without filtering by assigneeId for stats calculation
        const { data: allTasks } = await supabase.from('tasks').select('*');

        // Enrich with stats
        const projectsWithStats = projects.map(p => {
            const tasks = (allTasks || []).filter(t => t.projectId === p.id);
            const doneCount = tasks.filter(t => t.status === 'Done').length;
            const totalCount = tasks.length;
            const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

            return {
                ...p,
                stats: {
                    totalTasks: totalCount,
                    doneTasks: doneCount,
                    progress
                }
            };
        });

        return NextResponse.json(projectsWithStats);
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Basic validation
        if (!body.name || !body.key || !body.ownerId) {
            return NextResponse.json({ error: 'Name, Key, and Owner ID are required' }, { status: 400 });
        }

        const supabase = getSupabaseForRequest(request);
        const { data: requestUser } = await supabase.from('users').select('id, role, name, email').eq('id', body.ownerId).maybeSingle();
        if (!requestUser || requestUser.role !== 'Admin') return NextResponse.json({ error: 'Forbidden. Only Admins can create projects.' }, { status: 403 });

        const newProject: Project = {
            id: crypto.randomUUID(),
            name: body.name,
            description: body.description || '',
            key: body.key,
            ownerId: body.managerId || body.ownerId, // Use managerId as owner if provided
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const { error: insertErr } = await supabase.from('projects').insert({
            id: newProject.id,
            name: newProject.name,
            description: newProject.description,
            key: newProject.key,
            owner_id: newProject.ownerId,
            created_at: newProject.createdAt,
            updated_at: newProject.updatedAt
        });
        if (insertErr) {
            console.error('Error creating project:', insertErr);
            return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
        }

        if (body.memberIds && Array.isArray(body.memberIds)) {
            for (const memberId of body.memberIds) {
                if (memberId !== body.ownerId) {
                    await supabase.from('project_members').insert({ project_id: newProject.id, user_id: memberId, role: 'Member' });
                    try {
                        const { data: user } = await supabase.from('users').select('*').eq('id', memberId).maybeSingle();
                        if (user && user.email) {
                            const addedByName = requestUser?.name || 'Someone';
                            const projectLink = `/projects/${newProject.id}`;
                            await sendProjectMemberAdded(user.email, newProject.name, addedByName, projectLink).catch(e => console.error('Email error (initial add):', e));
                        }
                    } catch (err) {
                        console.error('Error sending initial member email:', err);
                    }
                }
            }
        }

        return NextResponse.json(newProject);
    } catch (error) {
        console.error('Error creating project:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create project' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');

        if (!id) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase2 = getSupabaseForRequest(request);
        const { data: requestUser2 } = await supabase2.from('users').select('id, role').eq('id', userId).maybeSingle();
        if (!requestUser2 || requestUser2.role !== 'Admin') return NextResponse.json({ error: 'Forbidden. Only Admins can delete projects.' }, { status: 403 });

        const { error: deleteErr } = await supabase2.from('projects').delete().eq('id', id);
        if (deleteErr) return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting project:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete project' }, { status: 500 });
    }
}
