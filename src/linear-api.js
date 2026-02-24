import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

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
    if (updates.parentId) input.parentId = updates.parentId;

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
          team {
            id
            name
            key
          }
          project {
            id
            name
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

  async getProject(projectId) {
    const query = `
      query GetProject($projectId: String!) {
        project(id: $projectId) {
          id
          name
          description
          state
          lead {
            name
            email
          }
          teams {
            nodes {
              name
            }
          }
          startDate
          targetDate
          createdAt
          updatedAt
          url
        }
      }
    `;

    return await this.query(query, { projectId });
  }

  async createProject(input) {
    const mutation = `
      mutation CreateProject($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          success
          project {
            id
            name
            description
            url
          }
        }
      }
    `;

    return await this.query(mutation, { input });
  }

  async updateProject(projectId, input) {
    const mutation = `
      mutation UpdateProject($projectId: String!, $input: ProjectUpdateInput!) {
        projectUpdate(id: $projectId, input: $input) {
          success
          project {
            id
            name
            description
            url
          }
        }
      }
    `;

    return await this.query(mutation, { projectId, input });
  }

  async getProjectUpdates(projectId) {
    const query = `
      query GetProjectUpdates($projectId: String!) {
        project(id: $projectId) {
          id
          name
          projectUpdates {
            nodes {
              id
              body
              health
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

    return await this.query(query, { projectId });
  }

  async createProjectUpdate(input) {
    const mutation = `
      mutation CreateProjectUpdate($input: ProjectUpdateCreateInput!) {
        projectUpdateCreate(input: $input) {
          success
          projectUpdate {
            id
            body
            health
            createdAt
            user {
              name
              email
            }
          }
        }
      }
    `;

    return await this.query(mutation, { input });
  }

  async updateProjectUpdate(updateId, input) {
    const mutation = `
      mutation UpdateProjectUpdate($updateId: String!, $input: ProjectUpdateUpdateInput!) {
        projectUpdateUpdate(id: $updateId, input: $input) {
          success
          projectUpdate {
            id
            body
            health
            updatedAt
            user {
              name
              email
            }
          }
        }
      }
    `;

    return await this.query(mutation, { updateId, input });
  }

  async deleteProjectUpdate(updateId) {
    const mutation = `
      mutation DeleteProjectUpdate($updateId: String!) {
        projectUpdateDelete(id: $updateId) {
          success
        }
      }
    `;

    return await this.query(mutation, { updateId });
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

  async getUsers(options = {}) {
    const query = `
      query GetUsers($first: Int) {
        users(first: $first) {
          nodes {
            id
            name
            email
            active
          }
        }
      }
    `;

    const variables = {
      first: options.limit || 50
    };

    return await this.query(query, variables);
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

  async uploadFile(filePath) {
    try {
      const fileStats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      
      const mimeTypeMap = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel'
      };
      
      const fileExtension = path.extname(fileName).toLowerCase();
      const contentType = mimeTypeMap[fileExtension] || 'application/octet-stream';

      const mutation = `
        mutation FileUpload($contentType: String!, $filename: String!, $size: Int!) {
          fileUpload(contentType: $contentType, filename: $filename, size: $size) {
            uploadFile {
              uploadUrl
              assetUrl
              headers {
                key
                value
              }
            }
          }
        }
      `;

      const uploadData = await this.query(mutation, {
        contentType,
        filename: fileName,
        size: fileStats.size
      });

      const { uploadUrl, assetUrl, headers: uploadHeaders } = uploadData.fileUpload.uploadFile;
      
      const fileBuffer = await fs.readFile(filePath);

      // Build headers from Linear's response
      const headers = {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000'
      };
      
      // Add headers returned by Linear
      if (uploadHeaders && uploadHeaders.length > 0) {
        uploadHeaders.forEach(({ key, value }) => {
          headers[key] = value;
        });
      }

      await axios.put(uploadUrl, fileBuffer, {
        headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      return assetUrl;
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async createAttachment(issueId, url, title, options = {}) {
    const mutation = `
      mutation CreateAttachment($input: AttachmentCreateInput!) {
        attachmentCreate(input: $input) {
          success
          attachment {
            id
            title
            url
          }
        }
      }
    `;

    const input = {
      issueId,
      url,
      title
    };

    if (options.subtitle) input.subtitle = options.subtitle;
    if (options.iconUrl) input.iconUrl = options.iconUrl;
    if (options.metadata) input.metadata = options.metadata;

    return await this.query(mutation, { input });
  }
}