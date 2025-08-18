import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function changelogCommand() {
  try {
    const changelogPath = join(__dirname, '../../CHANGELOG.md');
    const changelog = readFileSync(changelogPath, 'utf8');
    console.log(changelog);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('❌ CHANGELOG.md not found.');
      process.exit(1);
    }
    console.error('❌ Error reading changelog:', error.message);
    process.exit(1);
  }
}