import axios from 'axios';

const LINEAR_API_BASE = 'https://api.linear.app/graphql';

export class LinearAPI {
  constructor(token) {
    this.token = token;
    this.client = axios.create({
      baseURL: LINEAR_API_BASE,
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });
  }

  async query(query, variables = {}) {
    try {
      const response = await this.client.post('', {
        query,
        variables
      });

      if (response.data.errors) {
        throw new Error(`GraphQL Error: ${response.data.errors.map(e => e.message).join(', ')}`);
      }

      return response.data.data;
    } catch (error) {
      if (error.response) {
        console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
        throw new Error(`API Error: ${error.response.status} - ${error.response.statusText}`);
      }
      throw error;
    }
  }

  async getIssue(issueId) {
    const query = `
      query GetIssue($issueId: String!) {
        issue(id: $issueId) {
          id
          identifier
          title
          description
          priority
          state {
            name
            type
          }
          assignee {
            name
            email
          }
          creator {
            name
            email
          }
          createdAt
          updatedAt
          url
        }
      }
    `;

    return await this.query(query, { issueId });
  }

  async getIssueComments(issueId) {
    const query = `
      query GetIssueComments($issueId: String!) {
        issue(id: $issueId) {
          id
          identifier
          comments {
            nodes {
              id
              body
              createdAt
              updatedAt
              user {
                name
                email
              }
            }
          }
        }
      }
    `;

    return await this.query(query, { issueId });
  }

  async updateIssue(issueId, updates) {
    const mutation = `
      mutation UpdateIssue($issueId: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $issueId, input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            priority
            project {
              id
              name
            }
          }
        }
      }
    `;

    const input = {};
    if (updates.title) input.title = updates.title;
    if (updates.description) input.description = updates.description;
    if (updates.projectId) input.projectId = updates.projectId;
    if (updates.priority !== undefined) input.priority = updates.priority;
    if (updates.assigneeId) input.assigneeId = updates.assigneeId;

    return await this.query(mutation, { issueId, input });
  }

  async searchIssues(identifier) {
    const query = `
      query SearchIssues($identifier: String!) {
        issue(id: $identifier) {
          id
          identifier
          title
          description
          state {
            name
            type
          }
          assignee {
            name
            email
          }
          createdAt
          url
        }
      }
    `;

    const result = await this.query(query, { identifier });
    
    // Wrap single issue result to match the expected format
    return {
      issues: {
        nodes: result.issue ? [result.issue] : []
      }
    };
  }

  async createComment(issueId, body) {
    const mutation = `
      mutation CreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            id
            body
            createdAt
            user {
              name
              email
            }
          }
        }
      }
    `;

    const input = {
      issueId,
      body
    };

    return await this.query(mutation, { input });
  }

  async updateComment(commentId, body) {
    const mutation = `
      mutation UpdateComment($commentId: String!, $input: CommentUpdateInput!) {
        commentUpdate(id: $commentId, input: $input) {
          success
          comment {
            id
            body
            updatedAt
            user {
              name
              email
            }
          }
        }
      }
    `;

    const input = {
      body
    };

    return await this.query(mutation, { commentId, input });
  }

  async getProjects(options = {}) {
    const query = `
      query GetProjects($first: Int, $includeArchived: Boolean) {
        projects(first: $first, includeArchived: $includeArchived) {
          nodes {
            id
            name
            description
            createdAt
            updatedAt
            archivedAt
            url
            lead {
              name
              email
            }
            teams {
              nodes {
                name
              }
            }
          }
        }
      }
    `;

    const variables = {
      first: options.limit || 50,
      includeArchived: options.includeArchived || false
    };

    return await this.query(query, variables);
  }

  async createIssue(input) {
    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            url
          }
        }
      }
    `;

    return await this.query(mutation, { input });
  }

  async getTeams(options = {}) {
    const query = `
      query GetTeams($first: Int) {
        teams(first: $first) {
          nodes {
            id
            name
            key
            description
          }
        }
      }
    `;

    const variables = {
      first: options.limit || 50
    };

    return await this.query(query, variables);
  }
}