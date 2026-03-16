import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');
  
  if (!owner || !repo) {
    return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
  }

  const token = process.env.GITHUB_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
  }

  const query = `
    query getRepoDetails($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        issues(first: 50, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
          totalCount
          nodes {
            number
            title
            url
            assignees(first: 5) {
              nodes {
                login
              }
            }
          }
        }
        pullRequests(first: 50, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
          totalCount
          nodes {
            number
            title
            url
            author {
              login
            }
          }
        }
        ref(qualifiedName: "refs/heads/main") {
          target {
            ... on Commit {
              history(first: 10) {
                totalCount
              }
            }
          }
        }
        defaultBranchRef {
          target {
            ... on Commit {
              history {
                totalCount
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query,
        variables: { owner, repo }
      })
    });

    const result = await response.json();
    if (result.errors) {
      return NextResponse.json({ error: result.errors[0].message }, { status: 400 });
    }

    const data = result.data.repository;
    
    // Some repos might not have a main branch, try defaultBranchRef
    const commitsCount = data.ref?.target?.history?.totalCount || data.defaultBranchRef?.target?.history?.totalCount || 0;

    return NextResponse.json({
      issues: {
        total: data.issues.totalCount,
        list: data.issues.nodes
      },
      pullRequests: {
        total: data.pullRequests.totalCount,
        list: data.pullRequests.nodes
      },
      actions: commitsCount // Rough proxy for recent actions/commits
    });

  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    return NextResponse.json({ error: 'Failed to fetch GitHub data' }, { status: 500 });
  }
}
