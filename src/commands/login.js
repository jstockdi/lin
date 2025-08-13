import { LinearAuth } from '../auth.js';
import { WorkspaceManager } from '../workspace.js';

export async function loginCommand(apiToken, options = {}) {
  const workspaceManager = new WorkspaceManager();
  const workspace = await workspaceManager.resolveWorkspace(options.workspace);
  const auth = new LinearAuth(workspace);
  
  try {
    console.log(`Authenticating with Linear for workspace: ${workspace}...`);
    await auth.login(apiToken);
    console.log(`✅ Successfully authenticated with Linear for workspace: ${workspace}!`);
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    process.exit(1);
  }
}