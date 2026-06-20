#!/usr/bin/env node
// Plugin entrypoint. On a fresh install the plugin's node_modules aren't present
// (gitignored; sharp/puppeteer-core have per-OS native binaries that can't be
// committed). This launcher installs them once, then starts the MCP server.
// IMPORTANT: stdout is the JSON-RPC channel — all install output must go to stderr.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url))); // <plugin>/src/launch.mjs → <plugin>
const marker = join(root, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json');

if (!existsSync(marker)) {
  process.stderr.write('[editorial-diagrams] first run — installing dependencies (one time)…\n');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  // stdio: stdin ignored, stdout→fd2 and stderr→fd2 so npm never writes to the protocol stdout
  const r = spawnSync(npm, ['install', '--omit=dev', '--no-audit', '--no-fund'], { cwd: root, stdio: ['ignore', 2, 2] });
  if (r.status !== 0) {
    process.stderr.write(`[editorial-diagrams] dependency install failed. Run \`npm install\` in:\n  ${root}\n`);
    process.exit(1);
  }
  process.stderr.write('[editorial-diagrams] dependencies ready.\n');
}

// dynamic import so module resolution happens AFTER deps are installed
const { start } = await import('./server.mjs');
await start();
