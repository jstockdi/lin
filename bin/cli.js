#!/usr/bin/env node

import { Command } from 'commander';
import { loginCommand } from '../src/commands/login.js';
import { viewIssueCommand, editIssueCommand, createIssueCommand, searchIssueCommand } from '../src/commands/issue.js';
import { viewCommentsCommand, addCommentCommand, editCommentCommand } from '../src/commands/comments.js';
import { viewProjectsCommand, createProjectCommand, viewProjectCommand, editProjectCommand, listProjectUpdatesCommand, addProjectUpdateCommand, editProjectUpdateCommand, deleteProjectUpdateCommand } from '../src/commands/projects.js';
import { viewTeamsCommand } from '../src/commands/teams.js';
import { listUsersCommand } from '../src/commands/users.js';
import { listWorkspacesCommand, currentWorkspaceCommand, setWorkspaceCommand } from '../src/commands/workspace.js';
import { changelogCommand } from '../src/commands/changelog.js';
import { WorkspaceManager } from '../src/workspace.js';

const program = new Command();

program
  .name('lin')
  .description('Linear CLI - Interact with Linear issues from the command line')
  .version('0.1.9')
  .option('--workspace <name>', 'Specify workspace to use');

program
  .command('login')
  .description('Authenticate with Linear API')
  .argument('<api-token>', 'Linear API token')
  .option('--workspace <name>', 'Specify workspace for this token')
  .action(async (apiToken, options, command) => {
    const globalOptions = command.parent.opts();
    const workspace = options.workspace || globalOptions.workspace;
    await loginCommand(apiToken, { workspace });
  });

const issueCommand = program
  .command('issue')
  .description('Issue management commands');

issueCommand
  .command('view')
  .description('View an issue')
  .argument('<issue-id>', 'Issue identifier (e.g., APP-701)')
  .action(async (issueId, options, command) => {
    const globalOptions = command.parent.parent.opts();
    await viewIssueCommand(issueId, { workspace: globalOptions.workspace });
  });

issueCommand
  .command('edit')
  .description('Edit an issue')
  .argument('<issue-id>', 'Issue identifier (e.g., APP-701)')
  .option('--summary <summary>', 'Update issue title/summary')
  .option('--description <description>', 'Update issue description')
  .option('--project-id <projectId>', 'Update project assignment')
  .option('--priority <priority>', 'Update priority (1-4, where 1 is urgent)')
  .option('--assignee-id <assigneeId>', 'Update assignee')
  .option('--parent-id <parentId>', 'Parent issue ID (APP-123) to create this as a sub-issue. Not UUID')
  .option('--attachment <filePath>', 'Upload and attach a file to the issue')
  .action(async (issueId, options, command) => {
    const globalOptions = command.parent.parent.opts();
    const combinedOptions = { ...options, workspace: globalOptions.workspace };
    await editIssueCommand(issueId, combinedOptions);
  });

issueCommand
  .command('create')
  .description('Create a new issue')
  .option('--title <title>', 'Issue title (required)')
  .option('--team-id <teamId>', 'Team ID (required)')
  .option('--description <description>', 'Issue description (supports markdown)')
  .option('--project-id <projectId>', 'Project ID to assign issue to')
  .option('--assignee-id <assigneeId>', 'User ID to assign the issue to')
  .option('--priority <priority>', 'Issue priority (1-4, where 1 is urgent)')
  .option('--parent-id <parentId>', 'Parent issue ID (APP-123) to create this as a sub-issue. Not UUID')
  .action(async (options, command) => {
    const globalOptions = command.parent.parent.opts();
    const combinedOptions = { ...options, workspace: globalOptions.workspace };
    await createIssueCommand(options.title, combinedOptions);
  });

issueCommand
  .command('search')
  .description('Search issues by text and/or filters')
  .argument('[query]', 'Text to search for')
  .option('--project-id <projectId>', 'Filter by project ID')
  .option('--team-id <teamId>', 'Filter by team ID')
  .option('--assignee-id <assigneeId>', 'Filter by assignee ID')
  .option('--status <status>', 'Filter by status name (e.g., "In Progress")')
  .option('--limit <number>', 'Maximum number of results', '20')
  .action(async (query, options, command) => {
    const globalOptions = command.parent.parent.opts();
    const combinedOptions = {
      ...options,
      workspace: globalOptions.workspace,
      limit: parseInt(options.limit, 10)
    };
    await searchIssueCommand(query, combinedOptions);
  });

const commentCommand = program
  .command('comment')
  .description('Comment management commands');

commentCommand
  .command('view')
  .description('View comments for an issue')
  .argument('<issue-id>', 'Issue identifier (e.g., APP-701)')
  .option('--show-ids', 'Show comment IDs for editing')
  .action(async (issueId, options, command) => {
    const globalOptions = command.parent.parent.opts();
    const combinedOptions = { ...options, workspace: globalOptions.workspace };
    await viewCommentsCommand(issueId, combinedOptions);
  });

commentCommand
  .command('add')
  .description('Add a comment to an issue')
  .argument('<issue-id>', 'Issue identifier (e.g., APP-701)')
  .argument('<comment>', 'Comment text (supports markdown)')
  .action(async (issueId, comment, options, command) => {
    const globalOptions = command.parent.parent.opts();
    await addCommentCommand(issueId, comment, { workspace: globalOptions.workspace });
  });

commentCommand
  .command('edit')
  .description('Edit an existing comment')
  .argument('<comment-id>', 'Comment ID (use "comment view --show-ids" to find IDs)')
  .argument('<comment>', 'Updated comment text (supports markdown)')
  .action(async (commentId, comment, options, command) => {
    const globalOptions = command.parent.parent.opts();
    await editCommentCommand(commentId, comment, { workspace: globalOptions.workspace });
  });

const workspaceCommand = program
  .command('workspace')
  .description('Workspace management commands');

workspaceCommand
  .command('list')
  .description('List all configured workspaces')
  .action(listWorkspacesCommand);

workspaceCommand
  .command('current')
  .description('Show current workspace')
  .action(async (options, command) => {
    const globalOptions = command.parent.parent.opts();
    await currentWorkspaceCommand({ workspace: globalOptions.workspace });
  });

workspaceCommand
  .command('set')
  .description('Set workspace for current directory or globally')
  .argument('<workspace>', 'Workspace name')
  .option('--global', 'Set as default workspace globally')
  .action(setWorkspaceCommand);

const projectCommand = program
  .command('project')
  .description('Project management commands');

projectCommand
  .command('list')
  .description('List all projects')
  .option('--include-archived', 'Include archived projects')
  .option('--limit <number>', 'Limit number of projects shown', '50')
  .action(async (options, command) => {
    const globalOptions = command.parent.parent.opts();
    const combinedOptions = {
      ...options,
      workspace: globalOptions.workspace,
      limit: parseInt(options.limit, 10)
    };
    await viewProjectsCommand(combinedOptions);
  });

projectCommand
  .command('create')
  .description('Create a new project')
  .option('--name <name>', 'Project name (required)')
  .option('--description <description>', 'Project description')
  .option('--team-id <teamId>', 'Team ID to associate with the project')
  .action(async (options, command) => {
    const globalOptions = command.parent.parent.opts();
    const combinedOptions = { ...options, workspace: globalOptions.workspace };
    await createProjectCommand(combinedOptions);
  });

projectCommand
  .command('view')
  .description('View project details')
  .argument('<project-id>', 'Project ID')
  .action(async (projectId, options, command) => {
    const globalOptions = command.parent.parent.opts();
    await viewProjectCommand(projectId, { workspace: globalOptions.workspace });
  });

projectCommand
  .command('edit')
  .description('Edit a project')
  .argument('<project-id>', 'Project ID')
  .option('--name <name>', 'Update project name')
  .option('--description <description>', 'Update project description')
  .action(async (projectId, options, command) => {
    const globalOptions = command.parent.parent.opts();
    const combinedOptions = { ...options, workspace: globalOptions.workspace };
    await editProjectCommand(projectId, combinedOptions);
  });

const projectUpdateCommand = projectCommand
  .command('update')
  .description('Project update management commands');

projectUpdateCommand
  .command('list')
  .description('List updates for a project')
  .argument('<project-id>', 'Project ID')
  .action(async (projectId, options, command) => {
    const globalOptions = command.parent.parent.parent.opts();
    await listProjectUpdatesCommand(projectId, { workspace: globalOptions.workspace });
  });

projectUpdateCommand
  .command('add')
  .description('Add an update to a project')
  .argument('<project-id>', 'Project ID')
  .option('--body <body>', 'Update body text (required)')
  .option('--health <health>', 'Project health: onTrack, atRisk, or offTrack')
  .action(async (projectId, options, command) => {
    const globalOptions = command.parent.parent.parent.opts();
    const combinedOptions = { ...options, workspace: globalOptions.workspace };
    await addProjectUpdateCommand(projectId, combinedOptions);
  });

projectUpdateCommand
  .command('edit')
  .description('Edit a project update')
  .argument('<update-id>', 'Project update ID')
  .option('--body <body>', 'Updated body text')
  .option('--health <health>', 'Updated health: onTrack, atRisk, or offTrack')
  .action(async (updateId, options, command) => {
    const globalOptions = command.parent.parent.parent.opts();
    const combinedOptions = { ...options, workspace: globalOptions.workspace };
    await editProjectUpdateCommand(updateId, combinedOptions);
  });

projectUpdateCommand
  .command('delete')
  .description('Delete a project update')
  .argument('<update-id>', 'Project update ID')
  .action(async (updateId, options, command) => {
    const globalOptions = command.parent.parent.parent.opts();
    await deleteProjectUpdateCommand(updateId, { workspace: globalOptions.workspace });
  });

const teamsCommand = program
  .command('team')
  .description('Team management commands');

teamsCommand
  .command('list')
  .description('List all teams')
  .option('--limit <number>', 'Limit number of teams shown', '50')
  .action(async (options, command) => {
    const globalOptions = command.parent.parent.opts();
    const combinedOptions = { 
      ...options, 
      workspace: globalOptions.workspace,
      limit: parseInt(options.limit, 10)
    };
    await viewTeamsCommand(combinedOptions);
  });

const userCommand = program
  .command('user')
  .description('User management commands');

userCommand
  .command('list')
  .description('List all users in the workspace')
  .option('--limit <number>', 'Limit number of users shown', '50')
  .action(async (options, command) => {
    const globalOptions = command.parent.parent.opts();
    const combinedOptions = {
      ...options,
      workspace: globalOptions.workspace,
      limit: parseInt(options.limit, 10)
    };
    await listUsersCommand(combinedOptions);
  });

program
  .command('changelog')
  .description('Show version history and release notes')
  .action(changelogCommand);

program.parse();