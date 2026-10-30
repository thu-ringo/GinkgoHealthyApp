import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateDir = path.resolve(root, '..', 'demo-runtime');
const status = JSON.parse(fs.readFileSync(path.join(stateDir, 'status.json'), 'utf8'));
const ai = parseEnv(fs.readFileSync(path.join(stateDir, 'ai.env'), 'utf8'));
if (!ai.OPENAI_API_KEY?.trim() || !ai.OPENAI_MODEL?.trim()) throw new Error('Fill OPENAI_API_KEY and OPENAI_MODEL in the private ai.env first.');
const base = parseEnv(fs.readFileSync(path.join(stateDir, '.env'), 'utf8'));
const pid = Number(status.apiPid);
if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('Invalid saved API PID');
const processInfo = spawnSync('tasklist.exe', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true });
if (!/^"node\.exe"\s*,/im.test(processInfo.stdout || '')) throw new Error('Saved API process is not visible as node.exe. No process was stopped.');
process.kill(pid, 'SIGTERM');
await new Promise(resolve => setTimeout(resolve, 1200));
const log = fs.openSync(path.join(stateDir, 'api.log'), 'a');
const child = spawn(process.execPath, ['scripts/demo-api.mjs'], {
  cwd: root,
  env: { ...process.env, ...base, PORT: String(status.apiPort || base.PORT || 3000) },
  detached: true,
  windowsHide: true,
  stdio: ['ignore', log, log],
});
child.on('error', error => console.error(error.message));
child.unref();
let ready = false;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const r = await fetch(`http://127.0.0.1:${status.apiPort || 3000}/health`, { signal: AbortSignal.timeout(1500) });
    if (r.ok) { ready = true; break; }
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 500));
}
if (!ready) throw new Error('API did not restart. See work/demo-runtime/api.log');
console.log('Ginkgo API restarted with private AI configuration. Database, tunnel, web and APK are unchanged.');
