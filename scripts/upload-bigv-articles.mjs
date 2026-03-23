#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch {}
  try {
    process.loadEnvFile('.env');
  } catch {}
}

const [, , fileArg] = process.argv;

if (!fileArg) {
  console.error('用法: node scripts/upload-bigv-articles.mjs <json-file>');
  process.exit(1);
}

const endpoint = process.env.BIGV_IMPORT_ENDPOINT || 'http://127.0.0.1:3000/api/bigv';
const token = process.env.BIGV_IMPORT_TOKEN || '';

const absolutePath = path.resolve(process.cwd(), fileArg);
const payload = JSON.parse(await fs.readFile(absolutePath, 'utf8'));
const articles = Array.isArray(payload) ? payload : payload.articles;

if (!Array.isArray(articles) || !articles.length) {
  console.error('JSON 内容必须是 articles 数组');
  process.exit(1);
}

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
  console.error('导入失败:', json.error || response.statusText);
  process.exit(1);
}

console.log(`导入成功，共 ${json.data.length} 篇文章`);
for (const item of json.data) {
  console.log(`- ${item.author.name} / ${item.title} / ${item.primaryCategory}`);
}
