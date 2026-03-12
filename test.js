/**
 * Fetches open issues from a GitHub repository URL using GraphQL.
 * * @param {string} repoUrl - The full GitHub URL (e.g., "https://github.com/facebook/react")
 * @param {string} token - Your GitHub Personal Access Token
 */
async function fetchRepoIssues(repoUrl, token) {
  try {
    // 1. Extract the owner and repo name from the URL
    const urlParts = new URL(repoUrl).pathname.split('/').filter(Boolean);
    if (urlParts.length < 2) throw new Error("Invalid GitHub repository URL.");
    
    const owner = urlParts[0];
    const repo = urlParts[1];

    // 2. Define the GraphQL query
    const query = `
      query getRepoDetails($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          issues(first: 10, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
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
          pullRequests(first: 10, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
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
        }
      }
    `;

    // 3. Make the POST request to the GitHub GraphQL endpoint
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        query: query,
        variables: { owner: owner, repo: repo }
      })
    });

    const result = await response.json();

    // 4. Handle errors or print the details
    if (result.errors) {
      console.error("GraphQL Error:", result.errors[0].message);
      return;
    }

    const { issues, pullRequests } = result.data.repository;
    
    console.log(`\n--- Repository Summary: ${owner}/${repo} ---`);
    console.log(`Total Open Issues: ${issues.totalCount}`);
    console.log(`Total Open Pull Requests: ${pullRequests.totalCount}`);

    console.log(`\n--- Latest Open Issues ---`);
    if (issues.nodes.length === 0) {
      console.log("No open issues found!");
    } else {
      issues.nodes.forEach(issue => {
        const assignees = issue.assignees.nodes.map(a => a.login).join(', ') || 'No one assigned';
        console.log(`#${issue.number} - ${issue.title}`);
        console.log(`👤 Assigned to: ${assignees}`);
        console.log(`🔗 ${issue.url}\n`);
      });
    }

    console.log(`\n--- Latest Open Pull Requests ---`);
    if (pullRequests.nodes.length === 0) {
      console.log("No open pull requests found!");
    } else {
      pullRequests.nodes.forEach(pr => {
        console.log(`#${pr.number} - ${pr.title}`);
        console.log(`👤 Author: ${pr.author?.login || 'Unknown'}`);
        console.log(`🔗 ${pr.url}\n`);
      });
    }

  } catch (error) {
    console.error("Error fetching issues:", error.message);
  }
}

// --- Usage Example ---
const targetUrl = 'https://github.com/AndrewJerryV/TaskFlow-Mini_Project'; // Replace with any repo URL
const myGitHubToken = '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';          // Replace with your actual token

fetchRepoIssues(targetUrl, myGitHubToken);