import keytar from 'keytar';
import axios from 'axios';

const SERVICE_NAME = 'linear-cli';
const LINEAR_API_BASE = 'https://api.linear.app/graphql';

export class LinearAuth {
  constructor(workspace = 'default') {
    this.workspace = workspace;
    this.token = null;
  }

  getAccountName() {
    return `workspace-${this.workspace}`;
  }

  async login(apiToken) {
    try {
      const isValid = await this.validateToken(apiToken);
      if (!isValid) {
        throw new Error('Invalid API token');
      }

      await keytar.setPassword(SERVICE_NAME, this.getAccountName(), apiToken);
      this.token = apiToken;
      return true;
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async getToken() {
    if (this.token) {
      return this.token;
    }

    try {
      this.token = await keytar.getPassword(SERVICE_NAME, this.getAccountName());
      return this.token;
    } catch (error) {
      return null;
    }
  }

  async logout() {
    try {
      await keytar.deletePassword(SERVICE_NAME, this.getAccountName());
      this.token = null;
      return true;
    } catch (error) {
      return false;
    }
  }

  async validateToken(token) {
    try {
      const response = await axios.post(LINEAR_API_BASE, {
        query: `
          query {
            viewer {
              id
              name
            }
          }
        `
      }, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      return !response.data.errors && response.data.data?.viewer;
    } catch (error) {
      return false;
    }
  }

  async isAuthenticated() {
    const token = await this.getToken();
    if (!token) {
      return false;
    }
    return await this.validateToken(token);
  }
}