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

export async function createProjectCommand(options = {}) {
  try {
    if (!options.name) {
      console.error('❌ --name is required');
      process.exit(1);
    }

    const { token } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);

    const input = { name: options.name };
    if (options.description) input.description = options.description;
    if (options.teamId) input.teamIds = [options.teamId];

    const result = await api.createProject(input);
    const project = result.projectCreate.project;

    console.log(`\n✅ Project created successfully`);
    console.log(`  Name:  ${project.name}`);
    console.log(`  ID:    ${project.id}`);
    if (project.description) console.log(`  Desc:  ${project.description}`);
    console.log(`  URL:   ${project.url}`);
    console.log('');
  } catch (error) {
    console.error('❌ Error creating project:', error.message);
    process.exit(1);
  }
}

export async function viewProjectCommand(projectId, options = {}) {
  try {
    const { token } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);

    const result = await api.getProject(projectId);
    const project = result.project;

    if (!project) {
      console.error(`❌ Project not found: ${projectId}`);
      process.exit(1);
    }

    console.log(`\n📁 Project: ${project.name}`);
    console.log('');
    console.log(`  ID:          ${project.id}`);
    console.log(`  State:       ${project.state || 'N/A'}`);
    console.log(`  Lead:        ${project.lead ? `${project.lead.name} (${project.lead.email})` : 'None'}`);
    console.log(`  Teams:       ${project.teams.nodes.length > 0 ? project.teams.nodes.map(t => t.name).join(', ') : 'None'}`);
    console.log(`  Start date:  ${project.startDate || 'Not set'}`);
    console.log(`  Target date: ${project.targetDate || 'Not set'}`);
    console.log(`  Created:     ${new Date(project.createdAt).toLocaleDateString()}`);
    console.log(`  Updated:     ${new Date(project.updatedAt).toLocaleDateString()}`);
    console.log(`  URL:         ${project.url}`);
    const descriptionText = project.content || project.description;
    if (descriptionText) {
      console.log('');
      console.log(`  Description:`);
      const indented = descriptionText.split('\n').map(line => `  ${line}`).join('\n');
      console.log(indented);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error viewing project:', error.message);
    process.exit(1);
  }
}

export async function editProjectCommand(projectId, options = {}) {
  try {
    const input = {};
    if (options.name) input.name = options.name;
    if (options.description) input.description = options.description;

    if (Object.keys(input).length === 0) {
      console.error('❌ No updates provided. Use --name or --description to update the project.');
      process.exit(1);
    }

    const { token } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);

    const result = await api.updateProject(projectId, input);
    const project = result.projectUpdate.project;

    console.log(`\n✅ Project updated successfully`);
    console.log(`  Name:  ${project.name}`);
    console.log(`  ID:    ${project.id}`);
    if (project.description) console.log(`  Desc:  ${project.description}`);
    console.log(`  URL:   ${project.url}`);
    console.log('');
  } catch (error) {
    console.error('❌ Error updating project:', error.message);
    process.exit(1);
  }
}

export async function listProjectUpdatesCommand(projectId, options = {}) {
  try {
    const { token } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);

    const result = await api.getProjectUpdates(projectId);
    const project = result.project;

    if (!project) {
      console.error(`❌ Project not found: ${projectId}`);
      process.exit(1);
    }

    const updates = project.projectUpdates.nodes;

    if (!updates.length) {
      console.log(`\n📋 No updates found for project "${project.name}"`);
      return;
    }

    console.log(`\n📋 Updates for project "${project.name}"`);
    console.log('');

    updates.forEach((update, index) => {
      console.log(`--- Update ${index + 1} ---`);
      console.log(`  ID:      ${update.id}`);
      console.log(`  Health:  ${update.health || 'N/A'}`);
      console.log(`  Author:  ${update.user ? update.user.name : 'Unknown'}`);
      console.log(`  Created: ${new Date(update.createdAt).toLocaleDateString()}`);
      if (update.updatedAt !== update.createdAt) {
        console.log(`  Updated: ${new Date(update.updatedAt).toLocaleDateString()}`);
      }
      console.log(`  Body:    ${update.body}`);
      console.log('');
    });

    console.log(`Found ${updates.length} update${updates.length === 1 ? '' : 's'}`);
  } catch (error) {
    console.error('❌ Error fetching project updates:', error.message);
    process.exit(1);
  }
}

const VALID_HEALTH_VALUES = ['onTrack', 'atRisk', 'offTrack'];

export async function addProjectUpdateCommand(projectId, options = {}) {
  try {
    if (!options.body) {
      console.error('❌ --body is required');
      process.exit(1);
    }

    if (options.health && !VALID_HEALTH_VALUES.includes(options.health)) {
      console.error(`❌ Invalid health value: "${options.health}". Must be one of: ${VALID_HEALTH_VALUES.join(', ')}`);
      process.exit(1);
    }

    const { token } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);

    const input = { projectId, body: options.body };
    if (options.health) input.health = options.health;

    const result = await api.createProjectUpdate(input);
    const update = result.projectUpdateCreate.projectUpdate;

    console.log(`\n✅ Project update created successfully`);
    console.log(`  ID:      ${update.id}`);
    console.log(`  Health:  ${update.health || 'N/A'}`);
    console.log(`  Body:    ${update.body}`);
    console.log('');
  } catch (error) {
    console.error('❌ Error creating project update:', error.message);
    process.exit(1);
  }
}

export async function editProjectUpdateCommand(updateId, options = {}) {
  try {
    const input = {};
    if (options.body) input.body = options.body;
    if (options.health) input.health = options.health;

    if (Object.keys(input).length === 0) {
      console.error('❌ No updates provided. Use --body or --health to update.');
      process.exit(1);
    }

    if (options.health && !VALID_HEALTH_VALUES.includes(options.health)) {
      console.error(`❌ Invalid health value: "${options.health}". Must be one of: ${VALID_HEALTH_VALUES.join(', ')}`);
      process.exit(1);
    }

    const { token } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);

    const result = await api.updateProjectUpdate(updateId, input);
    const update = result.projectUpdateUpdate.projectUpdate;

    console.log(`\n✅ Project update edited successfully`);
    console.log(`  ID:      ${update.id}`);
    console.log(`  Health:  ${update.health || 'N/A'}`);
    console.log(`  Body:    ${update.body}`);
    console.log('');
  } catch (error) {
    console.error('❌ Error editing project update:', error.message);
    process.exit(1);
  }
}

export async function deleteProjectUpdateCommand(updateId, options = {}) {
  try {
    const { token } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);

    const result = await api.deleteProjectUpdate(updateId);

    if (result.projectUpdateDelete.success) {
      console.log(`\n✅ Project update deleted successfully (${updateId})`);
    } else {
      console.error('❌ Failed to delete project update');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error deleting project update:', error.message);
    process.exit(1);
  }
}