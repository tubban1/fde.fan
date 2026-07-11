import { execFile } from 'node:child_process';
import http from 'node:http';
import { promisify } from 'node:util';
import { loadLocalEnv } from '../gaokao/lib/env.mjs';

loadLocalEnv();

const execFileAsync = promisify(execFile);

const intervalMinutes = Number(process.env.WORLDCUP_SYNC_INTERVAL_MINUTES || 30);
const stopAt = new Date(process.env.WORLDCUP_SYNC_UNTIL || '2026-07-20T00:00:00Z');
const intervalMs = Math.max(5, intervalMinutes) * 60 * 1000;
const port = Number(process.env.PORT || 7860);
const runTimeoutMs = Number(process.env.WORLDCUP_SYNC_RUN_TIMEOUT_MS || 10 * 60 * 1000);
let timer = null;
let runPromise = null;

const health = {
  status: 'starting',
  started_at: new Date().toISOString(),
  last_run_started_at: null,
  last_run_finished_at: null,
  last_run_status: null,
  last_error: null,
  next_run_at: null,
  stop_at: stopAt.toISOString(),
};

function isStopped() {
  return new Date() >= stopAt;
}

function isDue() {
  if (health.status !== 'waiting' || !health.next_run_at) return false;
  return new Date(health.next_run_at).getTime() <= Date.now();
}

function scheduleNextRun(from = new Date()) {
  if (timer) clearTimeout(timer);
  timer = null;

  if (isStopped()) {
    health.status = 'stopped';
    health.next_run_at = null;
    console.log('[worldcup-sync-daemon] stop date reached; no more runs scheduled.');
    return;
  }

  const nextAtMs = Math.min(from.getTime() + intervalMs, stopAt.getTime());
  const waitMs = Math.max(0, nextAtMs - Date.now());
  health.next_run_at = new Date(nextAtMs).toISOString();
  console.log(`[worldcup-sync-daemon] next run in ${Math.round(waitMs / 60000)} minutes`);

  timer = setTimeout(() => {
    triggerRun('timer').catch((error) => {
      console.error('[worldcup-sync-daemon] timer trigger failed:', error.message || error);
    });
  }, waitMs);
}

async function triggerRun(reason) {
  if (runPromise) return runPromise;

  if (isStopped()) {
    health.status = 'stopped';
    health.next_run_at = null;
    return null;
  }

  console.log(`[worldcup-sync-daemon] run triggered by ${reason}`);
  runPromise = (async () => {
    await runOnce();
    scheduleNextRun(new Date());
  })().finally(() => {
    runPromise = null;
  });

  return runPromise;
}

function startHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/healthz') {
      const dueTriggered = isDue();
      if (dueTriggered) {
        triggerRun('health-request-overdue').catch((error) => {
          console.error('[worldcup-sync-daemon] overdue health trigger failed:', error.message || error);
        });
      }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ...health, due_triggered: dueTriggered }, null, 2));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'not_found' }));
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[worldcup-sync-daemon] health server listening on 0.0.0.0:${port}`);
  });
}

async function runOnce() {
  const startedAt = new Date();
  health.status = 'running';
  health.last_run_started_at = startedAt.toISOString();
  health.last_run_finished_at = null;
  health.last_run_status = 'running';
  health.last_error = null;
  health.next_run_at = null;
  console.log(`[worldcup-sync-daemon] sync started at ${startedAt.toISOString()}`);
  try {
    const result = await execFileAsync(process.execPath, ['scripts/worldcup/sync-worldcup-data.mjs'], {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 20,
      timeout: runTimeoutMs,
      killSignal: 'SIGTERM',
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    health.status = 'waiting';
    health.last_run_status = 'success';
    health.last_run_finished_at = new Date().toISOString();
    console.log(`[worldcup-sync-daemon] sync finished in ${Math.round((Date.now() - startedAt.getTime()) / 1000)}s`);
  } catch (error) {
    if (error.stdout) process.stdout.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    health.status = 'waiting';
    health.last_run_status = 'failed';
    health.last_run_finished_at = new Date().toISOString();
    health.last_error = error.message || String(error);
    console.error('[worldcup-sync-daemon] sync failed:', error.message || error);
  }
}

console.log(`[worldcup-sync-daemon] interval=${intervalMinutes} minutes stop_at=${stopAt.toISOString()}`);
startHealthServer();
triggerRun('startup').catch((error) => {
  console.error('[worldcup-sync-daemon] startup trigger failed:', error.message || error);
});
