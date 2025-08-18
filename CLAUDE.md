# Linear CLI Development Guide

## Local Development & Testing

### Installing Globally for Testing

When making changes to the CLI, install it globally to test the changes:

```bash
npm install -g .
```

This will install the `lin` command globally and make it available from any directory.

### Version Management

Update version numbers in both files when releasing:

1. **package.json** - Update the `version` field
2. **bin/cli.js** - Update the `.version()` call in the CLI definition

### Release Process

1. **Make your changes** to the codebase
2. **Update version numbers** in `package.json` and `bin/cli.js`
3. **Update CHANGELOG.md** with the new version and changes
4. **Install globally** to test: `npm install -g .`
5. **Test the CLI** thoroughly with `lin --version` and commands
6. **Commit changes** with a descriptive message
7. **Create a git tag** for the release: `git tag v0.1.1`

### Common Development Commands

```bash
# Test CLI locally without installing
./bin/cli.js --help

# Install globally for testing
npm install -g .

# Check installed version
lin --version

# Test specific commands
lin issue create --help
lin teams list
```

### Testing Sub-Issues

When testing sub-issue functionality:

```bash
# Create a regular issue first
lin issue create "Parent Task" --team-id <TEAM_UUID>

# Create a sub-issue using the parent's identifier
lin issue create "Sub Task" --team-id <TEAM_UUID> --parent-id APP-123
```

Note: The CLI automatically resolves issue identifiers (like `APP-123`) to UUIDs for the Linear GraphQL API.

## Project Structure

- `bin/cli.js` - Main CLI entry point and command definitions
- `src/commands/` - Individual command implementations
- `src/linear-api.js` - Linear GraphQL API client
- `src/auth.js` - Authentication handling
- `src/workspace.js` - Multi-workspace support
- `package.json` - Project configuration and dependencies
- `CHANGELOG.md` - Version history and release notes