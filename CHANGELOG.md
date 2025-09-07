# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.8] - 2025-09-07

### Added
- Added `--attachment <filePath>` option to `lin issue edit` command
- File upload support for various file types (images, PDFs, documents, spreadsheets)
- Automatic file upload to Linear's private cloud storage
- Proper attachment creation in Linear's attachment system
- Support for Excel files (.xlsx, .xls) and other common file formats

## [0.1.7] - 2025-09-05

### Added
- Added `--parent-id` option to `lin issue edit` command to convert existing issues into sub-issues
- Parent issue resolution now works for both create and edit operations

## [0.1.6] - 2025-08-27

### Changed
- Changed `lin teams list` to `lin team list` for better consistency (singular form)

## [0.1.5] - 2025-08-22

### Changed
- Changed `lin issue create` command to use `--title` flag instead of positional argument for consistency with other CLI tools

## [0.1.4] - 2025-08-21

### Changed
- Improved help text clarity for `--parent-id` option to specify it expects issue identifiers (APP-123) rather than UUIDs

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