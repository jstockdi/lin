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
    
    if (Object.keys(updates).length === 0) {
      console.error('❌ No updates provided. Use --summary or --description options.');
      process.exit(1);
    }
    
    console.log(`Updating issue ${issueIdentifier} in workspace ${workspace}...`);
    const result = await api.updateIssue(issue.id, updates);
    
    if (result.issueUpdate.success) {
      console.log('✅ Issue updated successfully!');
      const updatedIssue = result.issueUpdate.issue;
      console.log(`Title: ${updatedIssue.title}`);
      if (updatedIssue.description) {
        console.log(`Description: ${updatedIssue.description}`);
      }
    } else {
      console.error('❌ Failed to update issue.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error updating issue:', error.message);
    process.exit(1);
  }
}