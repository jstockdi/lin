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

export async function listUsersCommand(options = {}) {
  try {
    const { token, workspace } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);

    const result = await api.getUsers({
      limit: options.limit
    });

    const users = result.users.nodes.filter(u => u.active);

    if (!users.length) {
      console.log(`👤 No users found in workspace "${workspace}"`);
      return;
    }

    console.log(`\n👤 Users [${workspace}]`);
    console.log('');

    // Table headers
    const nameHeader = 'Name';
    const emailHeader = 'Email';
    const idHeader = 'User ID';

    // Calculate column widths
    const nameWidth = Math.max(nameHeader.length, Math.max(...users.map(u => u.name.length)));
    const emailWidth = Math.max(emailHeader.length, Math.max(...users.map(u => (u.email || '').length)));
    const idWidth = Math.max(idHeader.length, Math.max(...users.map(u => u.id.length)));

    // Print headers
    console.log(
      nameHeader.padEnd(nameWidth) + '    ' +
      emailHeader.padEnd(emailWidth) + '    ' +
      idHeader.padEnd(idWidth)
    );

    // Print separator line
    console.log('─'.repeat(nameWidth + emailWidth + idWidth + 8));

    // Print user rows
    users.forEach(user => {
      console.log(
        user.name.padEnd(nameWidth) + '    ' +
        (user.email || '').padEnd(emailWidth) + '    ' +
        user.id.padEnd(idWidth)
      );
    });

    console.log('');
    console.log(`Found ${users.length} user${users.length === 1 ? '' : 's'}`);

  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    process.exit(1);
  }
}
