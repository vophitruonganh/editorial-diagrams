import { existsSync } from 'node:fs';
import { launch as pcLaunch } from 'puppeteer-core';
import { install, computeExecutablePath, resolveBuildId, detectBrowserPlatform, Browser as PBrowser } from '@puppeteer/browsers';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CANDIDATES = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
};

// Pure, testable: first candidate path that `exists` reports true for, else null.
export function detectSystemChrome(platform, exists = existsSync) {
  for (const p of (CANDIDATES[platform] || [])) if (exists(p)) return p;
  return null;
}

const cacheDir = join(homedir(), '.cache', 'editorial-diagrams-mcp', 'browsers');

async function downloadChromium() {
  const platform = detectBrowserPlatform();
  const buildId = await resolveBuildId(PBrowser.CHROME, platform, 'stable');
  await install({ browser: PBrowser.CHROME, buildId, cacheDir });
  return computeExecutablePath({ browser: PBrowser.CHROME, buildId, cacheDir });
}

export async function resolveExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const sys = detectSystemChrome(process.platform);
  if (sys) return sys;
  return downloadChromium();
}

let _browser = null;
export async function getBrowser() {
  if (_browser && _browser.connected) return _browser;
  const executablePath = await resolveExecutablePath();
  _browser = await pcLaunch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  return _browser;
}

export async function closeBrowser() {
  if (_browser) { await _browser.close(); _browser = null; }
}
