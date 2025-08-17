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

export async function viewProjectsCommand(options = {}) {
  try {
    const { token, workspace } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);
    
    const result = await api.getProjects({
      limit: options.limit,
      includeArchived: options.includeArchived
    });
    
    const projects = result.projects.nodes;
    
    if (!projects.length) {
      console.log(`📁 No projects found in workspace "${workspace}"`);
      return;
    }
    
    console.log(`\n📁 Projects [${workspace}]`);
    console.log('');
    
    // Table headers
    const nameHeader = 'Name';
    const idHeader = 'Project ID';
    const createdHeader = 'Created';
    const updatedHeader = 'Updated';
    const statusHeader = 'Status';
    
    // Calculate column widths
    const nameWidth = Math.max(nameHeader.length, Math.max(...projects.map(p => p.name.length)));
    const idWidth = Math.max(idHeader.length, Math.max(...projects.map(p => p.id.length)));
    const createdWidth = Math.max(createdHeader.length, 10); // Date format: MM/DD/YYYY
    const updatedWidth = Math.max(updatedHeader.length, 10);
    const statusWidth = Math.max(statusHeader.length, 8);
    
    // Print headers
    console.log(
      nameHeader.padEnd(nameWidth) + '    ' +
      idHeader.padEnd(idWidth) + '    ' +
      createdHeader.padEnd(createdWidth) + '    ' +
      updatedHeader.padEnd(updatedWidth) + '    ' +
      statusHeader.padEnd(statusWidth)
    );
    
    // Print separator line
    console.log('─'.repeat(nameWidth + idWidth + createdWidth + updatedWidth + statusWidth + 16));
    
    // Print project rows
    projects.forEach(project => {
      const created = new Date(project.createdAt).toLocaleDateString();
      const updated = new Date(project.updatedAt).toLocaleDateString();
      const status = project.archivedAt ? 'Archived' : 'Active';
      
      console.log(
        project.name.padEnd(nameWidth) + '    ' +
        project.id.padEnd(idWidth) + '    ' +
        created.padEnd(createdWidth) + '    ' +
        updated.padEnd(updatedWidth) + '    ' +
        status.padEnd(statusWidth)
      );
    });
    
    console.log('');
    console.log(`Found ${projects.length} project${projects.length === 1 ? '' : 's'}`);
    
  } catch (error) {
    console.error('❌ Error fetching projects:', error.message);
    process.exit(1);
  }
}