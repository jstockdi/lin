import path from 'path';
import { LinearAuth } from '../auth.js';
import { LinearAPI } from '../linear-api.js';
import { WorkspaceManager } from '../workspace.js';

function buildMarkdownLink(fileName, url) {
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif'];
  const ext = path.extname(fileName).toLowerCase();
  if (imageExts.includes(ext)) {
    return `![${fileName}](${url})`;
  }
  return `[${fileName}](${url})`;
}

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
    
    const result = await api.getIssueByIdentifier(issueIdentifier);
    
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
    
    const searchResult = await api.getIssueByIdentifier(issueIdentifier);
    
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
      const parentResult = await api.getIssueByIdentifier(options.parentId);
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

export async function searchIssueCommand(query, options = {}) {
  try {
    const { token, workspace } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);

    const hasQuery = query && query.trim().length > 0;
    const hasFilter = options.projectId || options.teamId || options.assigneeId || options.status;

    if (!hasQuery && !hasFilter) {
      console.error('❌ Provide a search query or at least one filter (--project-id, --team-id, --assignee-id, --status).');
      process.exit(1);
    }

    const filter = {};
    if (options.projectId) filter.project = { id: { eq: options.projectId } };
    if (options.teamId) filter.team = { id: { eq: options.teamId } };
    if (options.assigneeId) filter.assignee = { id: { eq: options.assigneeId } };
    if (options.status) filter.state = { name: { eq: options.status } };

    const apiOptions = { limit: options.limit || 20 };
    if (Object.keys(filter).length > 0) apiOptions.filter = filter;

    const issues = hasQuery
      ? await api.issueSearch(query, apiOptions)
      : await api.issueList(apiOptions);

    if (!issues.length) {
      console.log(`No issues found in workspace "${workspace}".`);
      return;
    }

    const priorityNames = ['None', 'Urgent', 'High', 'Medium', 'Low'];

    console.log(`\n🔍 Issues [${workspace}]`);
    console.log('');

    const idHeader = 'ID';
    const titleHeader = 'Title';
    const statusHeader = 'Status';
    const assigneeHeader = 'Assignee';
    const priorityHeader = 'Priority';
    const teamHeader = 'Team';

    const truncate = (str, max) => str.length > max ? str.slice(0, max - 1) + '…' : str;

    const rows = issues.map(issue => ({
      id: issue.identifier,
      title: truncate(issue.title, 50),
      status: issue.state?.name || '—',
      assignee: issue.assignee?.name || 'Unassigned',
      priority: priorityNames[issue.priority] || 'None',
      team: issue.team?.key || '—'
    }));

    const idWidth = Math.max(idHeader.length, ...rows.map(r => r.id.length));
    const titleWidth = Math.max(titleHeader.length, ...rows.map(r => r.title.length));
    const statusWidth = Math.max(statusHeader.length, ...rows.map(r => r.status.length));
    const assigneeWidth = Math.max(assigneeHeader.length, ...rows.map(r => r.assignee.length));
    const priorityWidth = Math.max(priorityHeader.length, ...rows.map(r => r.priority.length));
    const teamWidth = Math.max(teamHeader.length, ...rows.map(r => r.team.length));

    const sep = '    ';
    console.log(
      idHeader.padEnd(idWidth) + sep +
      titleHeader.padEnd(titleWidth) + sep +
      statusHeader.padEnd(statusWidth) + sep +
      assigneeHeader.padEnd(assigneeWidth) + sep +
      priorityHeader.padEnd(priorityWidth) + sep +
      teamHeader.padEnd(teamWidth)
    );
    console.log('─'.repeat(idWidth + titleWidth + statusWidth + assigneeWidth + priorityWidth + teamWidth + sep.length * 5));

    rows.forEach(r => {
      console.log(
        r.id.padEnd(idWidth) + sep +
        r.title.padEnd(titleWidth) + sep +
        r.status.padEnd(statusWidth) + sep +
        r.assignee.padEnd(assigneeWidth) + sep +
        r.priority.padEnd(priorityWidth) + sep +
        r.team.padEnd(teamWidth)
      );
    });

    console.log('');
    console.log(`Found ${issues.length} issue${issues.length === 1 ? '' : 's'}`);

  } catch (error) {
    console.error('❌ Error searching issues:', error.message);
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
      const parentResult = await api.getIssueByIdentifier(options.parentId);
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

      // Handle file attachment after issue creation
      if (options.attachment) {
        try {
          console.log(`📎 Uploading attachment: ${options.attachment}`);
          const assetUrl = await api.uploadFile(options.attachment);
          const fileName = path.basename(options.attachment);
          console.log('✅ File uploaded successfully!');

          console.log(`📎 Creating attachment: ${fileName}`);
          const attachmentResult = await api.createAttachment(issue.id, assetUrl, fileName, {
            subtitle: 'Uploaded via Linear CLI'
          });

          if (attachmentResult.attachmentCreate.success) {
            console.log('✅ Attachment created successfully!');
          } else {
            console.error('❌ Failed to create attachment in Linear');
          }

          // Embed link inline in description
          const markdownLink = buildMarkdownLink(fileName, assetUrl);
          const updatedDescription = issue.description
            ? `${issue.description}\n\n${markdownLink}`
            : markdownLink;
          await api.updateIssue(issue.id, { description: updatedDescription });
        } catch (error) {
          console.error(`❌ Failed to upload attachment: ${error.message}`);
        }
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

export async function stateIssueCommand(issueIdentifier, stateName, options = {}) {
  try {
    const { token, workspace } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);

    const searchResult = await api.getIssueByIdentifier(issueIdentifier);

    if (!searchResult.issues.nodes.length) {
      console.error(`❌ Issue ${issueIdentifier} not found.`);
      process.exit(1);
    }

    const issue = searchResult.issues.nodes[0];
    const statesResult = await api.getWorkflowStates(issue.team.id);
    const states = statesResult.team.states.nodes
      .sort((a, b) => a.position - b.position);

    // --list: show available states and exit
    if (options.list) {
      console.log(`\n📋 Available states for team ${issue.team.name} (${issue.team.key}) [${workspace}]:\n`);

      const typeOrder = ['triage', 'backlog', 'unstarted', 'started', 'completed', 'cancelled'];
      const grouped = {};
      states.forEach(s => {
        const type = s.type || 'other';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(s);
      });

      typeOrder.forEach(type => {
        if (!grouped[type]) return;
        console.log(`  ${type.charAt(0).toUpperCase() + type.slice(1)}:`);
        grouped[type].forEach(s => {
          const current = issue.state?.name === s.name ? ' ← current' : '';
          console.log(`    • ${s.name}${current}`);
        });
      });

      // Any types not in typeOrder
      Object.keys(grouped).forEach(type => {
        if (typeOrder.includes(type)) return;
        console.log(`  ${type}:`);
        grouped[type].forEach(s => {
          const current = issue.state?.name === s.name ? ' ← current' : '';
          console.log(`    • ${s.name}${current}`);
        });
      });

      return;
    }

    if (!stateName) {
      console.error('❌ State name is required. Use --list to see available states.');
      process.exit(1);
    }

    // Case-insensitive match
    const match = states.find(s => s.name.toLowerCase() === stateName.toLowerCase());

    if (!match) {
      console.error(`❌ State "${stateName}" not found. Available states:`);
      states.forEach(s => console.error(`    • ${s.name}`));
      process.exit(1);
    }

    console.log(`Updating ${issue.identifier} state to "${match.name}" in workspace ${workspace}...`);
    const result = await api.updateIssue(issue.id, { stateId: match.id });

    if (result.issueUpdate.success) {
      console.log(`✅ ${issue.identifier} → ${match.name}`);
    } else {
      console.error('❌ Failed to update issue state.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error updating issue state:', error.message);
    process.exit(1);
  }
}