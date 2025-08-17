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

export async function viewTeamsCommand(options = {}) {
  try {
    const { token, workspace } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);
    
    const result = await api.getTeams({
      limit: options.limit
    });
    
    const teams = result.teams.nodes;
    
    if (!teams.length) {
      console.log(`👥 No teams found in workspace "${workspace}"`);
      return;
    }
    
    console.log(`\n👥 Teams [${workspace}]`);
    console.log('');
    
    // Table headers
    const nameHeader = 'Name';
    const keyHeader = 'Key';
    const idHeader = 'Team ID';
    
    // Calculate column widths
    const nameWidth = Math.max(nameHeader.length, Math.max(...teams.map(t => t.name.length)));
    const keyWidth = Math.max(keyHeader.length, Math.max(...teams.map(t => t.key.length)));
    const idWidth = Math.max(idHeader.length, Math.max(...teams.map(t => t.id.length)));
    
    // Print headers
    console.log(
      nameHeader.padEnd(nameWidth) + '    ' +
      keyHeader.padEnd(keyWidth) + '    ' +
      idHeader.padEnd(idWidth)
    );
    
    // Print separator line
    console.log('─'.repeat(nameWidth + keyWidth + idWidth + 8));
    
    // Print team rows
    teams.forEach(team => {
      console.log(
        team.name.padEnd(nameWidth) + '    ' +
        team.key.padEnd(keyWidth) + '    ' +
        team.id.padEnd(idWidth)
      );
    });
    
    console.log('');
    console.log(`Found ${teams.length} team${teams.length === 1 ? '' : 's'}`);
    
  } catch (error) {
    console.error('❌ Error fetching teams:', error.message);
    process.exit(1);
  }
}