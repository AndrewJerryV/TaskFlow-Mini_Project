import { resolveClientEnvValues } from './device-env-vault';

type RepoGitHubData = {
  issues: {
    total: number;
    list: Array<{
      number: number;
      title: string;
      url: string;
      assignees: {
        nodes: Array<{ login: string }>;
      };
    }>;
  };
  pullRequests: {
    total: number;
    list: Array<{
      number: number;
      title: string;
      url: string;
      author: {
        login: string;
      } | null;
    }>;
  };
  actions: number;
};

export function getClientGithubToken() {
  return resolveClientEnvValues().GITHUB_ACCESS_TOKEN;
}

export async function fetchGithubRepoDetailsFromClient(owner: string, repo: string) {
  const token = getClientGithubToken();

  if (!token) {
    throw new Error('GitHub access token not available in this browser vault.');
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

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables: { owner, repo },
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.message || 'GitHub request failed.');
  }

  if (result.errors?.length) {
    throw new Error(result.errors[0].message || 'GitHub GraphQL request failed.');
  }

  const repository = result.data?.repository;
  if (!repository) {
    throw new Error('GitHub repository not found.');
  }

  const commitsCount =
    repository.ref?.target?.history?.totalCount ||
    repository.defaultBranchRef?.target?.history?.totalCount ||
    0;

  return {
    issues: {
      total: repository.issues.totalCount,
      list: repository.issues.nodes,
    },
    pullRequests: {
      total: repository.pullRequests.totalCount,
      list: repository.pullRequests.nodes,
    },
    actions: commitsCount,
  } satisfies RepoGitHubData;
}
