# Linear CLI

A Node.js CLI tool for interacting with the Linear API with multi-workspace support.

## Installation

### Local Development
```bash
npm install
```

### Global Installation
To install `lin` globally and use it from anywhere on your system:

```bash
# Clone the repository
git clone git@github.com:jstockdi/lin.git
cd lin

# Install dependencies and link globally
npm install
npm link

# Now you can use 'lin' from anywhere
lin --help
```

### Alternative: Install from npm (when published)
```bash
npm install -g lin-cli
```

## Authentication

Authenticate with your Linear API token for a specific workspace:

```bash
# If installed globally
lin login <your-linear-api-token> --workspace=client1

# If running locally
./bin/cli.js login <your-linear-api-token> --workspace=client1
```

Get your API token from Linear Settings → API → Personal API tokens.

## Workspace Management

The CLI supports multiple workspaces for different clients/projects:

### Workspace Resolution (Priority Order)
1. **Command flag**: `--workspace=client1` (highest priority)
2. **Directory file**: `.linear-workspace` file in current or parent directory
3. **Default workspace**: Set via `lin workspace set --global`
4. **Fallback**: `default` workspace

### Workspace Commands
```bash
# Set workspace for current directory
lin workspace set client1

# Set global default workspace
lin workspace set client1 --global

# Show current workspace
lin workspace current

# List all configured workspaces
lin workspace list
```

## Usage

### Basic Commands
```bash
# View an issue (uses workspace resolution)
lin issue view APP-701

# View with specific workspace (overrides directory/default)
lin --workspace=client2 issue view APP-701

# View comments
lin comments view APP-701

# View comments with IDs (for editing)
lin comments view APP-701 --show-ids

# Add a comment
lin comments add APP-701 "This looks good to me!"

# Edit a comment (use --show-ids to get comment ID)
lin comments edit comment-id "Updated comment text"

# Edit an issue
lin issue edit APP-701 --summary="New title" --description="New description"
```

### Multi-Client Workflow Example
```bash
# Setup client workspaces
cd ~/projects/client1
lin workspace set client1
lin login <client1-token> --workspace=client1

cd ~/projects/client2  
lin workspace set client2
lin login <client2-token> --workspace=client2

# Work with issues (auto-detects workspace from directory)
cd ~/projects/client1
lin issue view CLI-123    # Uses client1 workspace

cd ~/projects/client2
lin issue view API-456    # Uses client2 workspace

# Override workspace anywhere
lin --workspace=client1 issue view CLI-123
```

## Commands

### Authentication
- `lin login <api-token> [--workspace=name]` - Authenticate with Linear API

### Issue Management  
- `lin issue view <issue-id>` - View issue details
- `lin issue edit <issue-id> [options]` - Edit issue (summary, description, project, priority, assignee)
- `lin issue create "<title>" --team-id=<id> [options]` - Create a new issue

### Comments
- `lin comments view <issue-id> [--show-ids]` - View comments for an issue
- `lin comments add <issue-id> "<comment>"` - Add a comment to an issue
- `lin comments edit <comment-id> "<comment>"` - Edit an existing comment

### Projects
- `lin projects view [--include-archived] [--limit=<number>]` - View all projects

### Teams
- `lin teams view [--limit=<number>]` - View all teams

### Workspace Management
- `lin workspace current` - Show current workspace
- `lin workspace list` - List all configured workspaces
- `lin workspace set <name> [--global]` - Set workspace for directory or globally

### Global Options
- `--workspace <name>` - Override workspace for any command

## Requirements

- Node.js 20+ (package.json specifies 22+ but works with 20)
- Linear API token with appropriate permissions for each workspace

## Security

API tokens are securely stored per workspace using the system keychain via the `keytar` library:
- Service: `linear-cli`
- Account: `workspace-{name}` (e.g., `workspace-client1`)

## License

MIT License - see [LICENSE](LICENSE) file for details.