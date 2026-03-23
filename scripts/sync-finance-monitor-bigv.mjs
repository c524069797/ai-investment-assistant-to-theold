#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { spawnSync } from 'child_process';

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch {}
  try {
    process.loadEnvFile('.env');
  } catch {}
}

const repoRoot = process.cwd();
const stateFile = path.join(repoRoot, 'data', 'bigv-sync-state.json');
const tmpDir = path.join(repoRoot, '.tmp', 'finance-bigv-sync');
const remoteHost = process.env.FINANCE_MONITOR_SSH_HOST || 'root81';
const remoteExportDir = process.env.FINANCE_MONITOR_EXPORT_DIR || '/root/apps/finance-news-monitor/exports/ai-investment-assistant';
const endpoint = process.env.BIGV_IMPORT_ENDPOINT || 'http://127.0.0.1:3000/api/bigv';
const token = process.env.BIGV_IMPORT_TOKEN || '';
const mode = process.argv.includes('--all') ? 'all' : 'incremental';

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} failed`);
  }
  return (result.stdout || '').trim();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function loadState() {
  try {
    return JSON.parse(await fs.readFile(stateFile, 'utf8'));
  } catch {
    return { synced: {} };
  }
}

async function saveState(state) {
  await ensureDir(path.dirname(stateFile));
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
}

function normalizeRemoteList(output) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.endsWith('.json'))
    .filter((line) => !line.endsWith('/latest.json'))
    .sort();
}

function listRemoteFiles() {
  const output = runCommand('ssh', [remoteHost, `find ${remoteExportDir} -type f -name '*.json' | sort`]);
  return normalizeRemoteList(output);
}

function scpFromRemote(remotePath, localPath) {
  runCommand('scp', [`${remoteHost}:${remotePath}`, localPath]);
}

function buildSyntheticSourceUrl(payload) {
  const urls = (payload.source_items || []).map((item) => item.source_url).filter(Boolean);
  if (urls.length === 1) {
    return urls[0];
  }
  if (urls.length > 1) {
    return `finance-monitor:multi-source:${payload.author}:${payload.generated_at}`;
  }
  return `finance-monitor:${payload.author}:${payload.generated_at}`;
}

function transformExportToArticle(payload) {
  return {
    authorName: payload.author,
    title: payload.draft_title,
    content: payload.wechat_markdown || payload.overall_summary || payload.lead || '',
    images: [],
    sourceUrl: buildSyntheticSourceUrl(payload),
    publishedAt: payload.generated_at,
  };
}

async function uploadArticles(articles) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-import-token': token } : {}),
    },
    body: JSON.stringify({ articles }),
  });
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || response.statusText || 'upload failed');
  }
  return json.data;
}

async function main() {
  await ensureDir(tmpDir);
  const state = await loadState();
  const remoteFiles = listRemoteFiles();
  const targetFiles = mode === 'all' ? remoteFiles : remoteFiles.filter((file) => !state.synced[file]);

  if (!targetFiles.length) {
    console.log('NO_NEW_FINANCE_EXPORTS');
    return;
  }

  const uploaded = [];

  for (const remoteFile of targetFiles) {
    const localFile = path.join(tmpDir, path.basename(remoteFile));
    scpFromRemote(remoteFile, localFile);
    const payload = JSON.parse(await fs.readFile(localFile, 'utf8'));
    const article = transformExportToArticle(payload);
    const result = await uploadArticles([article]);
    state.synced[remoteFile] = {
      syncedAt: new Date().toISOString(),
      author: article.authorName,
      title: article.title,
      publishedAt: article.publishedAt,
      importedIds: result.map((item) => item.id),
    };
    uploaded.push({
      remoteFile,
      author: article.authorName,
      title: article.title,
      importedIds: result.map((item) => item.id),
    });
  }

  await saveState(state);
  console.log(JSON.stringify({ uploaded }, null, 2));
}

main().catch((error) => {
  console.error('SYNC_FAILED:', error.message);
  process.exit(1);
});
