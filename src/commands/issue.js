import { LinearAuth } from '../auth.js';
import { LinearAPI } from '../linear-api.js';
import { WorkspaceManager } from '../workspace.js';

async function ensureAuthenticated(workspace) {
  const workspaceManager = new WorkspaceManager();
  const resolvedWorkspace = await workspaceManager.resolveWorkspace(workspace);
  const auth = new LinearAuth(resolvedWorkspace);
  const token = await auth.getToken();
  
  if (!token) {
    console.error(`❌ Not authenticated for workspace "${resolvedWorkspace}". Please run "lin login <api-token> --workspace=${resolvedWorkspace}" first.`);
    process.exit(1);
  }
  
  const isValid = await auth.validateToken(token);
  if (!isValid) {
    console.error(`❌ Invalid or expired token for workspace "${resolvedWorkspace}". Please run "lin login <api-token> --workspace=${resolvedWorkspace}" again.`);
    process.exit(1);
  }
  
  return { token, workspace: resolvedWorkspace };
}

export async function viewIssueCommand(issueIdentifier, options = {}) {
  try {
    const { token, workspace } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);
    
    const result = await api.searchIssues(issueIdentifier);
    
    if (!result.issues.nodes.length) {
      console.error(`❌ Issue ${issueIdentifier} not found.`);
      process.exit(1);
    }
    
    const issue = result.issues.nodes[0];
    
    console.log(`\n📋 Issue: ${issue.identifier} [${workspace}]`);
    console.log(`Title: ${issue.title}`);
    console.log(`State: ${issue.state.name} (${issue.state.type})`);
    console.log(`Assignee: ${issue.assignee ? `${issue.assignee.name} (${issue.assignee.email})` : 'Unassigned'}`);
    console.log(`Team: ${issue.team.name} (${issue.team.key}) - ID: ${issue.team.id}`);
    if (issue.project) {
      console.log(`Project: ${issue.project.name} - ID: ${issue.project.id}`);
    }
    console.log(`Created: ${new Date(issue.createdAt).toLocaleString()}`);
    console.log(`URL: ${issue.url}`);
    
    if (issue.description) {
      console.log(`\nDescription:\n${issue.description}`);
    }
    
  } catch (error) {
    console.error('❌ Error fetching issue:', error.message);
    process.exit(1);
  }
}

export async function editIssueCommand(issueIdentifier, options = {}) {
  try {
    const { token, workspace } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);
    
    const searchResult = await api.searchIssues(issueIdentifier);
    
    if (!searchResult.issues.nodes.length) {
      console.error(`❌ Issue ${issueIdentifier} not found.`);
      process.exit(1);
    }
    
    const issue = searchResult.issues.nodes[0];
    const updates = {};
    
    if (options.summary) {
      updates.title = options.summary;
    }
    
    if (options.description) {
      updates.description = options.description;
    }
    
    if (options.projectId) {
      updates.projectId = options.projectId;
    }
    
    if (options.priority) {
      updates.priority = parseInt(options.priority, 10);
    }
    
    if (options.assigneeId) {
      updates.assigneeId = options.assigneeId;
    }
    
    if (options.parentId) {
      // Resolve parent issue identifier to UUID
      const parentResult = await api.searchIssues(options.parentId);
      if (!parentResult.issues.nodes.length) {
        console.error(`❌ Parent issue ${options.parentId} not found.`);
        process.exit(1);
      }
      updates.parentId = parentResult.issues.nodes[0].id;
    }
    
    // Handle file attachment
    if (options.attachment) {
      try {
        console.log(`📎 Uploading attachment: ${options.attachment}`);
        const attachmentUrl = await api.uploadFile(options.attachment);
        
        const fileName = options.attachment.split('/').pop();
        console.log('✅ File uploaded successfully!');
        
        console.log(`📎 Creating attachment: ${fileName}`);
        const attachmentResult = await api.createAttachment(issue.id, attachmentUrl, fileName, {
          subtitle: 'Uploaded via Linear CLI'
        });
        
        if (attachmentResult.attachmentCreate.success) {
          console.log('✅ Attachment created successfully!');
        } else {
          console.error('❌ Failed to create attachment in Linear');
          process.exit(1);
        }
      } catch (error) {
        console.error(`❌ Failed to upload attachment: ${error.message}`);
        process.exit(1);
      }
    }
    
    if (Object.keys(updates).length === 0 && !options.attachment) {
      console.error('❌ No updates provided. Use --summary, --description, --project-id, --priority, --assignee-id, --parent-id, or --attachment options.');
      process.exit(1);
    }
    
    // Only update issue if there are actual field updates
    if (Object.keys(updates).length > 0) {
      console.log(`Updating issue ${issueIdentifier} in workspace ${workspace}...`);
      const result = await api.updateIssue(issue.id, updates);
      
      if (result.issueUpdate.success) {
        console.log('✅ Issue updated successfully!');
        const updatedIssue = result.issueUpdate.issue;
        console.log(`Title: ${updatedIssue.title}`);
        if (updatedIssue.description) {
          console.log(`Description: ${updatedIssue.description}`);
        }
        if (updatedIssue.priority !== undefined) {
          console.log(`Priority: ${updatedIssue.priority}`);
        }
        if (updatedIssue.project) {
          console.log(`Project: ${updatedIssue.project.name} (${updatedIssue.project.id})`);
        }
      } else {
        console.error('❌ Failed to update issue.');
        process.exit(1);
      }
    } else if (options.attachment) {
      console.log('✅ Attachment operation completed!');
    }
    
  } catch (error) {
    console.error('❌ Error updating issue:', error.message);
    process.exit(1);
  }
}

export async function createIssueCommand(title, options = {}) {
  try {
    const { token, workspace } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);
    
    if (!options.teamId) {
      console.error('❌ Team ID is required to create an issue. Use --team-id option.');
      process.exit(1);
    }
    
    const input = {
      title,
      teamId: options.teamId
    };
    
    if (options.description) {
      input.description = options.description;
    }
    
    if (options.projectId) {
      input.projectId = options.projectId;
    }
    
    if (options.assigneeId) {
      input.assigneeId = options.assigneeId;
    }
    
    if (options.priority) {
      input.priority = parseInt(options.priority, 10);
    }
    
    if (options.parentId) {
      // Resolve parent issue identifier to UUID
      const parentResult = await api.searchIssues(options.parentId);
      if (!parentResult.issues.nodes.length) {
        console.error(`❌ Parent issue ${options.parentId} not found.`);
        process.exit(1);
      }
      input.parentId = parentResult.issues.nodes[0].id;
    }
    
    console.log(`Creating issue "${title}" in workspace ${workspace}...`);
    const result = await api.createIssue(input);
    
    if (result.issueCreate.success) {
      const issue = result.issueCreate.issue;
      console.log('✅ Issue created successfully!');
      console.log(`Issue: ${issue.identifier}`);
      console.log(`Title: ${issue.title}`);
      console.log(`URL: ${issue.url}`);
      if (issue.description) {
        console.log(`Description: ${issue.description}`);
      }
    } else {
      console.error('❌ Failed to create issue.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error creating issue:', error.message);
    process.exit(1);
  }
}