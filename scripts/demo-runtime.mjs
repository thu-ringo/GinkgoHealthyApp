import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { parseEnv } from 'node:util';
import mysql from 'mysql2/promise';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateDir = path.resolve(root, '..', 'demo-runtime');
const bin = process.env.MARIADB_BIN || 'D:\\MariaDB 13.0.2\\bin';
const tunnelExe = path.resolve(root, '..', 'tools', 'cloudflared.exe');
const dataDir = path.join(stateDir, 'mariadb');
const port = 33307;
const apiPort = Number(process.env.GINKGO_DEMO_API_PORT || 3000);
const children = [];
fs.mkdirSync(stateDir, { recursive: true });
fs.mkdirSync(path.join(stateDir, 'tmp'), { recursive: true });
process.env.TEMP = path.join(stateDir, 'tmp');
process.env.TMP = process.env.TEMP;
const secretPath = path.join(stateDir, 'secrets.json');
const secrets = fs.existsSync(secretPath)
  ? JSON.parse(fs.readFileSync(secretPath, 'utf8'))
  : Object.fromEntries(['rootPassword', 'dbPassword', 'jwt', 'otpPepper', 'demoPassword'].map(key => [key, randomBytes(32).toString('hex')]));
if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, JSON.stringify(secrets));
const aiFile = path.join(stateDir, 'ai.env');
const aiConfig = fs.existsSync(aiFile) ? parseEnv(fs.readFileSync(aiFile, 'utf8')) : {};
const env = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: String(apiPort),
  DATABASE_URL: `mysql://ginkgo_demo:${secrets.dbPassword}@127.0.0.1:${port}/ginkgo_demo`,
  DATABASE_SSL: 'false',
  JWT_SECRET: secrets.jwt,
  OTP_PEPPER: secrets.otpPepper,
  SMS_PROVIDER: 'dev',
  DEV_OTP_ENABLED: 'true',
  DEV_OTP_CODE: '123456',
  CORS_ORIGINS: 'https://ginkgo-healthy-app.vercel.app,http://localhost:8081',
  DEMO_SEED_ENABLED: 'true',
  DEMO_PHONE: '+84900000001',
  DEMO_PASSWORD: secrets.demoPassword,
  OPENAI_API_KEY: aiConfig.OPENAI_API_KEY?.trim() || '',
  OPENAI_MODEL: aiConfig.OPENAI_MODEL?.trim() || '',
};
function start(exe, args, logName, extra = {}) {
  const log = fs.openSync(path.join(stateDir, logName), 'a');
  const child = spawn(exe, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', log, log], ...extra });
  child.on('error', error => console.error(`${logName}: ${error.message}`));
  children.push(child);
  return child;
}
function runNode(script) {
  const result = spawnSync(process.execPath, [script], { cwd: root, env, windowsHide: true, encoding: 'utf8' });
  fs.appendFileSync(path.join(stateDir, 'setup.log'), (result.stdout || '') + (result.stderr || ''));
  if (result.status !== 0) throw new Error(`Failed: ${script}. See setup.log`);
}
function stop() {
  for (const child of children.toReversed()) child.kill();
}
function publish(apiUrl) {
  const cache = path.join(os.homedir(), 'AppData', 'Local', 'npm-cache', '_npx');
  const cli = fs.existsSync(cache) && fs.readdirSync(cache).map(dir => path.join(cache, dir, 'node_modules', 'vercel', 'dist', 'index.js')).find(file => fs.existsSync(file));
  if (!cli) {
    console.log('Vercel CLI not found. Run npx vercel@latest login, then restart the demo.');
    return;
  }
  console.log('Publishing the current tunnel URL to Vercel...');
  const deployment = start(process.execPath, [cli, '--prod', '--yes', '--build-env', `EXPO_PUBLIC_API_URL=${apiUrl}`, '--build-env', 'EXPO_PUBLIC_API_CONFIG_URL=https://ginkgo-healthy-app.vercel.app/demo-api.json', '--build-env', 'EXPO_PUBLIC_DEMO_MODE=true'], 'publish.log', { env: process.env });
  deployment.on('exit', code => console.log(code === 0 ? 'Web updated: https://ginkgo-healthy-app.vercel.app. Reopen the APK to load the current API URL.' : 'Vercel update failed. See publish.log.'));
}
process.on('SIGINT', () => { stop(); process.exit(0); });
process.on('SIGTERM', () => { stop(); process.exit(0); });
try {
  const previousStatusPath = path.join(stateDir, 'status.json');
  if (fs.existsSync(previousStatusPath)) {
    const previousStatus = JSON.parse(fs.readFileSync(previousStatusPath, 'utf8'));
    let running = false;
    try {
      process.kill(previousStatus.apiPid, 0);
      running = (await fetch(`http://127.0.0.1:${previousStatus.apiPort || 3000}/health`, { signal: AbortSignal.timeout(2000) })).ok;
    } catch {}
    if (running) throw new Error(`Demo already running: ${previousStatus.apiUrl}. Keep the existing demo process open.`);
  }
  if (!fs.existsSync(path.join(dataDir, 'mysql'))) {
    const init = spawnSync(path.join(bin, 'mysql_install_db.exe'), [`--datadir=${dataDir}`, `--port=${port}`, '--silent'], { cwd: stateDir, env, windowsHide: true, encoding: 'utf8' });
    fs.appendFileSync(path.join(stateDir, 'setup.log'), (init.stdout || '') + (init.stderr || ''));
    if (init.status !== 0) throw new Error('MariaDB initialization failed. See setup.log');
  }
  const iniPath = path.join(stateDir, 'my.ini');
  fs.writeFileSync(iniPath, `[mysqld]\nbasedir="${path.dirname(bin).replaceAll('\\', '/')}"\ndatadir="${dataDir.replaceAll('\\', '/')}"\nport=${port}\nbind-address=127.0.0.1\nskip-name-resolve\ncharacter-set-server=utf8mb4\ncollation-server=utf8mb4_unicode_ci\ninnodb-buffer-pool-size=64M\n`);
  const dbProcess = start(path.join(bin, 'mariadbd.exe'), [`--defaults-file=${iniPath}`, '--console'], 'mariadb.log');
  let connection;
  const initialized = fs.existsSync(path.join(stateDir, 'initialized'));
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      connection = await mysql.createConnection({ host: '127.0.0.1', port, user: 'root', password: secrets.rootPassword, connectTimeout: 1000 });
      break;
    } catch {
      if (!initialized) {
        try { connection = await mysql.createConnection({ host: '127.0.0.1', port, user: 'root', password: '', connectTimeout: 1000 }); break; } catch {}
      }
      if (dbProcess.exitCode !== null) throw new Error('Demo database stopped. See mariadb.log');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  if (!connection) throw new Error('Cannot connect to dedicated demo database');
  await connection.query('CREATE DATABASE IF NOT EXISTS ginkgo_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await connection.query('CREATE DATABASE IF NOT EXISTS ginkgo_demo_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await connection.query("CREATE USER IF NOT EXISTS 'ginkgo_demo'@'127.0.0.1' IDENTIFIED BY ?", [secrets.dbPassword]);
  await connection.query("GRANT ALL ON ginkgo_demo.* TO 'ginkgo_demo'@'127.0.0.1'");
  await connection.query("GRANT ALL ON ginkgo_demo_test.* TO 'ginkgo_demo'@'127.0.0.1'");
  await connection.query("ALTER USER 'root'@'localhost' IDENTIFIED BY ?", [secrets.rootPassword]);
  await connection.end();
  fs.writeFileSync(path.join(stateDir, 'initialized'), 'Dedicated demo database; no existing databases were modified.');
  const envFile = Object.entries(env).filter(([key]) => ['NODE_ENV','PORT','DATABASE_URL','DATABASE_SSL','JWT_SECRET','OTP_PEPPER','SMS_PROVIDER','DEV_OTP_ENABLED','DEV_OTP_CODE','CORS_ORIGINS','DEMO_SEED_ENABLED','DEMO_PHONE','DEMO_PASSWORD'].includes(key)).map(([key,value]) => `${key}=${value}`).join('\n');
  fs.writeFileSync(path.join(stateDir, '.env'), envFile + `\nTEST_DATABASE_URL=mysql://ginkgo_demo:${secrets.dbPassword}@127.0.0.1:${port}/ginkgo_demo_test\n`);
  runNode('apps/api/dist/migrate.js');
  runNode('apps/api/dist/seed.js');
  start(process.execPath, ['scripts/demo-api.mjs'], 'api.log');
  for (let attempt = 0; ; attempt++) {
    try { const health = await fetch(`http://127.0.0.1:${apiPort}/health`); if (health.ok) break; } catch {}
    if (attempt > 45) throw new Error('API healthcheck failed. See api.log');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('Dedicated MariaDB and API are ready. Starting Cloudflare Tunnel...');
  const tunnel = start(tunnelExe, ['tunnel', '--url', `http://127.0.0.1:${apiPort}`, '--protocol', 'http2', '--no-autoupdate'], 'tunnel.log', { stdio: ['ignore', 'pipe', 'pipe'] });
  let discovered = false;
  const receive = chunk => {
    const message = chunk.toString();
    fs.appendFileSync(path.join(stateDir, 'tunnel.log'), message);
    const apiUrl = message.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
    if (!apiUrl || discovered) return;
    discovered = true;
    fs.mkdirSync(path.join(root, 'apps/mobile/public'), { recursive: true });
    fs.writeFileSync(path.join(root, 'apps/mobile/public/demo-api.json'), JSON.stringify({ apiUrl, updatedAt: new Date().toISOString() }));
    fs.writeFileSync(path.join(root, 'apps/mobile/.env.local'), `EXPO_PUBLIC_API_URL=${apiUrl}\nEXPO_PUBLIC_API_CONFIG_URL=https://ginkgo-healthy-app.vercel.app/demo-api.json\nEXPO_PUBLIC_DEMO_MODE=true\n`);
    fs.writeFileSync(path.join(stateDir, 'status.json'), JSON.stringify({ apiUrl, apiPid: children[1]?.pid, apiPort, dbPid: dbProcess.pid, tunnelPid: tunnel.pid, databasePort: port, startedAt: new Date().toISOString() }));
    console.log(`DEMO_API_URL=${apiUrl}`);
    console.log('Keep this process and the computer running while testing.');
    if (process.argv.includes('--publish')) publish(apiUrl);
  };
  tunnel.stdout.on('data', receive);
  tunnel.stderr.on('data', receive);
  tunnel.on('exit', code => { console.error(`Tunnel stopped (${code})`); stop(); process.exit(code || 1); });
} catch (error) {
  console.error(error.message);
  stop();
  process.exit(1);
}
