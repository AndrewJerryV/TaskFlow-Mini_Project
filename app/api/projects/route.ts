import { db } from '@/lib/db';
import { Project } from '@/types';
import { NextResponse } from 'next/server';

export async function GET() {
    const projects = db.getProjects();
    // Enrich with stats
    const projectsWithStats = projects.map(p => {
        const tasks = db.getTasks(p.id);
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
}

export async function POST(request: Request) {
    const body = await request.json();

    // Basic validation
    if (!body.name || !body.key) {
        return NextResponse.json({ error: 'Name and Key are required' }, { status: 400 });
    }

    const newProject: Project = {
        id: crypto.randomUUID(),
        name: body.name,
        description: body.description || '',
        key: body.key,
        ownerId: 'u1', // Default owner
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    db.addProject(newProject);
    return NextResponse.json(newProject);
}
