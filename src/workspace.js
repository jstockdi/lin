import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.linear-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const WORKSPACE_FILE = '.linear-workspace';

export class WorkspaceManager {
  constructor() {
    this.config = null;
  }

  async ensureConfigDir() {
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  async loadConfig() {
    if (this.config) return this.config;

    try {
      const configData = await fs.readFile(CONFIG_FILE, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      this.config = {
        defaultWorkspace: null,
        directoryWorkspaces: {}
      };
    }
    return this.config;
  }

  async saveConfig() {
    await this.ensureConfigDir();
    await fs.writeFile(CONFIG_FILE, JSON.stringify(this.config, null, 2));
  }

  async resolveWorkspace(flagWorkspace = null) {
    await this.loadConfig();

    // 1. Command flag takes highest priority
    if (flagWorkspace) {
      return flagWorkspace;
    }

    // 2. Check for directory-based workspace file
    const directoryWorkspace = await this.getDirectoryWorkspace();
    if (directoryWorkspace) {
      return directoryWorkspace;
    }

    // 3. Check directory-specific config
    const cwd = process.cwd();
    if (this.config.directoryWorkspaces[cwd]) {
      return this.config.directoryWorkspaces[cwd];
    }

    // 4. Fall back to default workspace
    return this.config.defaultWorkspace || 'default';
  }

  async getDirectoryWorkspace(dir = process.cwd()) {
    try {
      const workspaceFile = path.join(dir, WORKSPACE_FILE);
      const workspace = await fs.readFile(workspaceFile, 'utf8');
      return workspace.trim();
    } catch (error) {
      // Check parent directory
      const parentDir = path.dirname(dir);
      if (parentDir !== dir && parentDir !== '/') {
        return await this.getDirectoryWorkspace(parentDir);
      }
      return null;
    }
  }

  async setDirectoryWorkspace(workspace, dir = process.cwd()) {
    const workspaceFile = path.join(dir, WORKSPACE_FILE);
    await fs.writeFile(workspaceFile, workspace);
  }

  async setDefaultWorkspace(workspace) {
    await this.loadConfig();
    this.config.defaultWorkspace = workspace;
    await this.saveConfig();
  }

  async setDirectoryConfig(workspace, dir = process.cwd()) {
    await this.loadConfig();
    this.config.directoryWorkspaces[dir] = workspace;
    await this.saveConfig();
  }

  async removeDirectoryConfig(dir = process.cwd()) {
    await this.loadConfig();
    delete this.config.directoryWorkspaces[dir];
    await this.saveConfig();
  }

  async getCurrentWorkspace(flagWorkspace = null) {
    return await this.resolveWorkspace(flagWorkspace);
  }

  async listWorkspaces() {
    const config = await this.loadConfig();
    const workspaces = new Set();
    
    // Add default workspace
    if (config.defaultWorkspace) {
      workspaces.add(config.defaultWorkspace);
    }
    
    // Add directory-specific workspaces
    Object.values(config.directoryWorkspaces).forEach(ws => workspaces.add(ws));
    
    // Add current directory workspace if exists
    const currentDirWorkspace = await this.getDirectoryWorkspace();
    if (currentDirWorkspace) {
      workspaces.add(currentDirWorkspace);
    }
    
    return Array.from(workspaces).sort();
  }
}