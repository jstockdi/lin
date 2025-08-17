#!/usr/bin/env node

import { Command } from 'commander';
import { loginCommand } from '../src/commands/login.js';
import { viewIssueCommand, editIssueCommand, createIssueCommand } from '../src/commands/issue.js';
import { viewCommentsCommand, addCommentCommand, editCommentCommand } from '../src/commands/comments.js';
import { viewProjectsCommand } from '../src/commands/projects.js';
import { viewTeamsCommand } from '../src/commands/teams.js';
import { listWorkspacesCommand, currentWorkspaceCommand, setWorkspaceCommand } from '../src/commands/workspace.js';
import { WorkspaceManager } from '../src/workspace.js';

const program = new Command();

program
  .name('lin')
  .description('Linear CLI - Interact with Linear issues from the command line')
  .version('1.0.0')
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
  .action(async (issueId, options, command) => {
    const globalOptions = command.parent.parent.opts();
    const combinedOptions = { ...options, workspace: globalOptions.workspace };
    await editIssueCommand(issueId, combinedOptions);
  });

issueCommand
  .command('create')
  .description('Create a new issue')
  .argument('<title>', 'Issue title')
  .option('--team-id <teamId>', 'Team ID (required)')
  .option('--description <description>', 'Issue description (supports markdown)')
  .option('--project-id <projectId>', 'Project ID to assign issue to')
  .option('--assignee-id <assigneeId>', 'User ID to assign the issue to')
  .option('--priority <priority>', 'Issue priority (1-4, where 1 is urgent)')
  .action(async (title, options, command) => {
    const globalOptions = command.parent.parent.opts();
    const combinedOptions = { ...options, workspace: globalOptions.workspace };
    await createIssueCommand(title, combinedOptions);
  });

const commentsCommand = program
  .command('comments')
  .description('Comments management commands');

commentsCommand
  .command('view')
  .description('View comments for an issue')
  .argument('<issue-id>', 'Issue identifier (e.g., APP-701)')
  .option('--show-ids', 'Show comment IDs for editing')
  .action(async (issueId, options, command) => {
    const globalOptions = command.parent.parent.opts();
    const combinedOptions = { ...options, workspace: globalOptions.workspace };
    await viewCommentsCommand(issueId, combinedOptions);
  });

commentsCommand
  .command('add')
  .description('Add a comment to an issue')
  .argument('<issue-id>', 'Issue identifier (e.g., APP-701)')
  .argument('<comment>', 'Comment text (supports markdown)')
  .action(async (issueId, comment, options, command) => {
    const globalOptions = command.parent.parent.opts();
    await addCommentCommand(issueId, comment, { workspace: globalOptions.workspace });
  });

commentsCommand
  .command('edit')
  .description('Edit an existing comment')
  .argument('<comment-id>', 'Comment ID (use "comments view --show-ids" to find IDs)')
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

const projectsCommand = program
  .command('projects')
  .description('Projects management commands');

projectsCommand
  .command('view')
  .description('View all projects')
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

const teamsCommand = program
  .command('teams')
  .description('Teams management commands');

teamsCommand
  .command('view')
  .description('View all teams')
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

program.parse();