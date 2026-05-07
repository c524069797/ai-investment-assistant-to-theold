#!/usr/bin/env node
/**
 * Telegram 频道大V文章同步脚本
 *
 * 使用 Telegram Bot API 拉取频道消息，解析成大V文章格式，
 * 通过 /api/bigv POST 接口导入数据库。
 *
 * 前置条件:
 * 1. 在 @BotFather 创建 bot，获取 token
 * 2. 将 bot 加入目标频道（需要读取消息权限）
 * 3. 配置环境变量 TELEGRAM_BOT_TOKEN
 *
 * 用法:
 *   node scripts/sync-telegram-bigv.mjs              # 增量同步
 *   node scripts/sync-telegram-bigv.mjs --all        # 全量同步（忽略 offset）
 *   node scripts/sync-telegram-bigv.mjs --dry-run    # 只打印，不导入
 */

import fs from "fs/promises";
import path from "path";

if (typeof process.loadEnvFile === "function") {
  try { process.loadEnvFile(".env.local"); } catch {}
  try { process.loadEnvFile(".env"); } catch {}
}

const repoRoot = process.cwd();
const stateFile = path.join(repoRoot, "data", "telegram-bigv-sync-state.json");
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHANNEL_USERNAME = process.env.TELEGRAM_CHANNEL || "shenduhaowen";
const IMPORT_ENDPOINT = process.env.BIGV_IMPORT_ENDPOINT || "http://127.0.0.1:3000/api/bigv";
const IMPORT_TOKEN = process.env.BIGV_IMPORT_TOKEN || "";

const isDryRun = process.argv.includes("--dry-run");
const isFullSync = process.argv.includes("--all");

if (!BOT_TOKEN) {
  console.error("[telegram-bigv] 错误: 未设置 TELEGRAM_BOT_TOKEN 环境变量");
  console.error("  请前往 @BotFather 创建 bot 并获取 token，然后写入 .env.local");
  process.exit(1);
}

const TG_API = (method) => `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

async function tgApi(method, params = {}) {
  const url = new URL(TG_API(method));
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString());
  const json = await res.json();
  if (!json.ok) {
    throw new Error(`Telegram API ${method} failed: ${json.description || JSON.stringify(json)}`);
  }
  return json.result;
}

async function loadState() {
  try {
    return JSON.parse(await fs.readFile(stateFile, "utf8"));
  } catch {
    return { lastUpdateId: 0, syncedMessages: {} };
  }
}

async function saveState(state) {
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
}

function resolveChannelId(channel) {
  // 如果是 @username 格式，去掉 @
  return channel.startsWith("@") ? channel.slice(1) : channel;
}

function extractText(msg) {
  // 优先取正文，fallback 到 caption
  return msg.text || msg.caption || "";
}

function extractImages(msg) {
  const photos = [];
  if (msg.photo?.length) {
    // 取最大尺寸
    const best = msg.photo.reduce((a, b) => (a.file_size > b.file_size ? a : b));
    photos.push(best.file_id);
  }
  if (msg.document?.mime_type?.startsWith("image/")) {
    photos.push(msg.document.file_id);
  }
  return photos;
}

function buildTitle(text, maxLen = 60) {
  // 取第一行或前 N 个字符作为标题
  const firstLine = text.split(/\n/)[0].trim();
  if (firstLine.length <= maxLen) return firstLine;
  return firstLine.slice(0, maxLen) + "...";
}

function buildContent(text) {
  return text.trim();
}

function parseTelegramDate(unixTs) {
  return new Date(unixTs * 1000).toISOString();
}

function messageToArticle(msg, channelName) {
  const text = extractText(msg);
  if (!text.trim()) return null;

  return {
    authorName: channelName,
    title: buildTitle(text),
    content: buildContent(text),
    images: extractImages(msg),
    sourceUrl: `https://t.me/${resolveChannelId(CHANNEL_USERNAME)}/${msg.message_id}`,
    publishedAt: parseTelegramDate(msg.date),
  };
}

async function uploadArticles(articles) {
  if (isDryRun) {
    console.log(`[dry-run] 将导入 ${articles.length} 篇文章`);
    return articles.map((a, i) => ({ id: `dry-run-${i}`, title: a.title, author: { name: a.authorName } }));
  }

  const response = await fetch(IMPORT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(IMPORT_TOKEN ? { "x-import-token": IMPORT_TOKEN } : {}),
    },
    body: JSON.stringify({ articles }),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || response.statusText || "upload failed");
  }
  return json.data;
}

async function main() {
  const state = await loadState();
  const channel = resolveChannelId(CHANNEL_USERNAME);

  console.log(`[telegram-bigv] 频道: @${channel}`);
  console.log(`[telegram-bigv] 模式: ${isFullSync ? "全量" : "增量"}${isDryRun ? " (dry-run)" : ""}`);

  // 1. 获取频道信息，确认 bot 在频道中
  let chatInfo;
  try {
    chatInfo = await tgApi("getChat", { chat_id: `@${channel}` });
    console.log(`[telegram-bigv] 频道标题: ${chatInfo.title}`);
  } catch (error) {
    console.error(`[telegram-bigv] 无法访问频道 @${channel}: ${error.message}`);
    console.error("  请确认:");
    console.error("  1. bot 已加入该频道");
    console.error("  2. 频道是公开的，或 bot 已被添加为成员");
    console.error("  3. CHANNEL_USERNAME 配置正确");
    process.exit(1);
  }

  // 2. 拉取更新
  const updates = await tgApi("getUpdates", {
    offset: isFullSync ? undefined : state.lastUpdateId ? state.lastUpdateId + 1 : undefined,
    limit: 100,
  });

  if (!updates.length) {
    console.log("[telegram-bigv] 没有新消息");
    return;
  }

  console.log(`[telegram-bigv] 收到 ${updates.length} 条更新`);

  // 3. 过滤出目标频道的频道帖子（channel_post）
  const channelPosts = updates
    .map((u) => u.channel_post)
    .filter(Boolean)
    .filter((post) => {
      const postChannel = post.chat?.username || String(post.chat?.id);
      return postChannel === channel || postChannel === `@${channel}`;
    });

  if (!channelPosts.length) {
    console.log("[telegram-bigv] 没有目标频道的频道帖子消息");
    // 仍然更新 offset，避免重复拉取
    const maxUpdateId = Math.max(...updates.map((u) => u.update_id));
    state.lastUpdateId = maxUpdateId;
    await saveState(state);
    return;
  }

  console.log(`[telegram-bigv] 目标频道消息: ${channelPosts.length} 条`);

  // 4. 去重并转换为文章格式
  const articles = [];
  const seen = new Set();

  for (const post of channelPosts) {
    const msgId = post.message_id;
    if (state.syncedMessages[msgId] && !isFullSync) continue;
    if (seen.has(msgId)) continue;
    seen.add(msgId);

    const article = messageToArticle(post, chatInfo.title || channel);
    if (!article) {
      console.log(`  [skip] msg#${msgId}: 无文本内容`);
      continue;
    }

    articles.push(article);
    console.log(`  [new] msg#${msgId}: ${article.title.slice(0, 50)}${article.title.length > 50 ? "..." : ""}`);
  }

  if (!articles.length) {
    console.log("[telegram-bigv] 没有需要导入的新文章");
    const maxUpdateId = Math.max(...updates.map((u) => u.update_id));
    state.lastUpdateId = maxUpdateId;
    await saveState(state);
    return;
  }

  // 5. 分批导入（每批 10 篇，避免请求过大）
  const BATCH_SIZE = 10;
  const totalImported = [];

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    console.log(`[telegram-bigv] 导入批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(articles.length / BATCH_SIZE)} (${batch.length} 篇)`);

    try {
      const result = await uploadArticles(batch);
      totalImported.push(...result);

      for (const item of result) {
        const original = batch.find((a) => a.title === item.title);
        if (original) {
          const msgIdMatch = original.sourceUrl.match(/\/(\d+)$/);
          if (msgIdMatch) {
            state.syncedMessages[msgIdMatch[1]] = {
              importedAt: new Date().toISOString(),
              articleId: item.id,
            };
          }
        }
      }
    } catch (error) {
      console.error(`[telegram-bigv] 批次导入失败: ${error.message}`);
      // 继续下一批
    }
  }

  // 6. 更新状态
  const maxUpdateId = Math.max(...updates.map((u) => u.update_id));
  state.lastUpdateId = maxUpdateId;
  await saveState(state);

  console.log(`[telegram-bigv] 完成，本次导入 ${totalImported.length} 篇文章`);
  for (const item of totalImported.slice(0, 5)) {
    console.log(`  ✓ ${item.author?.name || "?"} / ${item.title}`);
  }
  if (totalImported.length > 5) {
    console.log(`  ... 还有 ${totalImported.length - 5} 篇`);
  }
}

main().catch((error) => {
  console.error("[telegram-bigv] 同步失败:", error.message);
  process.exit(1);
});
