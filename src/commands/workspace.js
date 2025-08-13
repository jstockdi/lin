import { WorkspaceManager } from '../workspace.js';
import { LinearAuth } from '../auth.js';
import keytar from 'keytar';

export async function listWorkspacesCommand() {
  try {
    const workspaceManager = new WorkspaceManager();
    const workspaces = await workspaceManager.listWorkspaces();
    
    if (!workspaces.length) {
      console.log('No workspaces configured.');
      return;
    }
    
    console.log('\n📂 Configured workspaces:');
    
    // Get stored tokens to check which workspaces have credentials
    const SERVICE_NAME = 'linear-cli';
    const allAccounts = await keytar.findCredentials(SERVICE_NAME);
    const authenticatedWorkspaces = new Set(
      allAccounts
        .filter(account => account.account.startsWith('workspace-'))
        .map(account => account.account.replace('workspace-', ''))
    );
    
    for (const workspace of workspaces) {
      const isAuthenticated = authenticatedWorkspaces.has(workspace);
      const status = isAuthenticated ? '✅' : '❌';
      console.log(`  ${status} ${workspace}${isAuthenticated ? ' (authenticated)' : ' (not authenticated)'}`);
    }
    
  } catch (error) {
    console.error('❌ Error listing workspaces:', error.message);
    process.exit(1);
  }
}

export async function currentWorkspaceCommand(options = {}) {
  try {
    const workspaceManager = new WorkspaceManager();
    const workspace = await workspaceManager.getCurrentWorkspace(options.workspace);
    
    console.log(`\n🏷️  Current workspace: ${workspace}`);
    
    const auth = new LinearAuth(workspace);
    const isAuthenticated = await auth.isAuthenticated();
    
    if (isAuthenticated) {
      console.log('✅ Authenticated');
    } else {
      console.log('❌ Not authenticated');
      console.log(`Run: lin login <api-token> --workspace=${workspace}`);
    }
    
  } catch (error) {
    console.error('❌ Error getting current workspace:', error.message);
    process.exit(1);
  }
}

export async function setWorkspaceCommand(workspace, options = {}) {
  try {
    const workspaceManager = new WorkspaceManager();
    
    if (options.global) {
      await workspaceManager.setDefaultWorkspace(workspace);
      console.log(`✅ Set default workspace to: ${workspace}`);
    } else {
      await workspaceManager.setDirectoryWorkspace(workspace);
      console.log(`✅ Set workspace for current directory to: ${workspace}`);
      console.log(`Created .linear-workspace file`);
    }
    
  } catch (error) {
    console.error('❌ Error setting workspace:', error.message);
    process.exit(1);
  }
}