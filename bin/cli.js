#!/usr/bin/env node

import { Command } from 'commander';
import { loginCommand } from '../src/commands/login.js';
import { viewIssueCommand, editIssueCommand } from '../src/commands/issue.js';
import { viewCommentsCommand } from '../src/commands/comments.js';
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
  .action(async (issueId, options, command) => {
    const globalOptions = command.parent.parent.opts();
    const combinedOptions = { ...options, workspace: globalOptions.workspace };
    await editIssueCommand(issueId, combinedOptions);
  });

const commentsCommand = program
  .command('comments')
  .description('Comments management commands');

commentsCommand
  .command('view')
  .description('View comments for an issue')
  .argument('<issue-id>', 'Issue identifier (e.g., APP-701)')
  .action(async (issueId, options, command) => {
    const globalOptions = command.parent.parent.opts();
    await viewCommentsCommand(issueId, { workspace: globalOptions.workspace });
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

program.parse();