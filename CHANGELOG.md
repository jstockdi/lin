# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2025-08-18

### Added
- Enhanced `lin issue view` to display team and project IDs for easier CLI usage
- Team information now shows: name, key, and ID
- Project information now shows: name and ID (when assigned)

### Changed
- Updated `lin projects view` to `lin projects list` for naming consistency

## [0.1.2] - 2025-08-18

### Added
- Added `lin changelog` command to display version history and release notes

## [0.1.1] - 2025-08-18

### Fixed
- Fixed sub-issue creation by resolving parent issue identifiers to UUIDs
- The `--parent-id` flag now accepts issue identifiers (e.g., `APP-832`) and automatically resolves them to the required UUID format for the Linear GraphQL API

## [0.1.0] - 2025-08-18

### Added
- Sub-issue support with `--parent-id` flag for `lin issue create` command
- Automatic property inheritance from parent issues (project, cycle)

### Changed
- Updated `lin teams view` to `lin teams list` to follow proper naming conventions

### Initial Features
- Issue management: create, view, edit
- Comment management: view, add, edit
- Project and team listing
- Multi-workspace support
- Authentication with Linear API tokens