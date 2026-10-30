import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateDir = path.resolve(root, '..', 'demo-runtime');
const configPath = path.join(stateDir, 'ai.env');
const config = fs.existsSync(configPath) ? parseEnv(fs.readFileSync(configPath, 'utf8')) : {};
process.env.OPENAI_API_KEY = config.OPENAI_API_KEY?.trim() || '';
process.env.OPENAI_MODEL = config.OPENAI_MODEL?.trim() || '';
const { bootstrap } = await import('../apps/api/dist/main.js');
await bootstrap();
const statusPath = path.join(stateDir, 'status.json');
if (fs.existsSync(statusPath)) {
  const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  status.apiPid = process.pid;
  status.apiPort = Number(process.env.PORT || 3000);
  fs.writeFileSync(statusPath, JSON.stringify(status));
}
console.log('Ginkgo demo API ready; AI configuration loaded from private local file.');
