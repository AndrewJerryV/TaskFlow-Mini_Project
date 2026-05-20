import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: userId } = await params;

    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const user = await db.getUser(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Get all repos across all projects the user has access to
    const projects = await db.getProjects(userId);
    const projectIds = projects.map(p => p.id);

    if (projectIds.length === 0) {
        return NextResponse.json({ issues: 0, prs: 0, actions: 0, reposAnalyzed: 0 });
    }

    const { data: repos, error } = await getSupabaseAdmin()
        .from('repo_links')
        .select('*')
        .in('project_id', projectIds);

    if (error || !repos || repos.length === 0) {
        return NextResponse.json({ issues: 0, prs: 0, actions: 0, reposAnalyzed: 0 });
    }

    const token = process.env.GITHUB_ACCESS_TOKEN;
    if (!token) {
        return NextResponse.json({ error: 'GITHUB_ACCESS_TOKEN not configured' }, { status: 500 });
    }
    
    // Deduplicate repos by owner/repo string
    const uniqueRepos = Array.from(new Map(repos.map(r => [`${r.owner}/${r.repo}`, r])).values());

    let totalIssues = 0;
    let totalPrs = 0;

    const emailPrefix = user.email ? user.email.split('@')[0].toLowerCase() : '';
    const firstName = user.name.toLowerCase().split(' ')[0];

    const fetchPromises = uniqueRepos.map(async (repo) => {
        try {
            const query = `
                query {
                    repository(owner: "${repo.owner}", name: "${repo.repo}") {
                        issues(states: OPEN, first: 100) {
                            nodes {
                                assignees(first: 5) {
                                    nodes { login }
                                }
                            }
                        }
                        pullRequests(states: OPEN, first: 100) {
                            nodes {
                                author { login }
                            }
                        }
                    }
                }
            `;

            const res = await fetch('https://api.github.com/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query }),
                next: { revalidate: 60 } // Cache for 60 seconds
            });

            if (!res.ok) return;

            const json = await res.json();
            if (json.errors || !json.data || !json.data.repository) return;

            const issues = json.data.repository.issues.nodes || [];
            const prs = json.data.repository.pullRequests.nodes || [];

            // Count issues assigned to this user
            const userIssues = issues.filter((issue: any) => {
                const assignees = issue.assignees?.nodes || [];
                return assignees.some((a: any) => {
                    if (!a || !a.login) return false;
                    const login = a.login.toLowerCase();
                    return user.name.toLowerCase().includes(login) || 
                           login.includes(firstName) ||
                           (emailPrefix && login.includes(emailPrefix));
                });
            });

            // Count PRs created by this user
            const userPrs = prs.filter((pr: any) => {
                if (!pr.author || !pr.author.login) return false;
                const login = pr.author.login.toLowerCase();
                return user.name.toLowerCase().includes(login) || 
                       login.includes(firstName) ||
                       (emailPrefix && login.includes(emailPrefix));
            });

            totalIssues += userIssues.length;
            totalPrs += userPrs.length;
        } catch (e) {
            console.error(`Error fetching stats for ${repo.owner}/${repo.repo}`, e);
        }
    });

    await Promise.all(fetchPromises);

    return NextResponse.json({
        issues: totalIssues,
        prs: totalPrs,
        actions: totalIssues + totalPrs,
        reposAnalyzed: uniqueRepos.length
    });
}
