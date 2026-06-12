const mineflayer = require('mineflayer');
const express = require('express');

// ── Express keep-alive server ─────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Minecraft Bot Status</title></head>
      <body style="font-family:sans-serif;padding:2rem;">
        <h1>🤖 Minecraft Bot</h1>
        <p><strong>Status:</strong> ${bot && bot.entity ? '🟢 Connected' : '🔴 Disconnected'}</p>
        <p><strong>Server:</strong> ${BOT_HOST}:${BOT_PORT}</p>
        <p><strong>Username:</strong> ${BOT_USERNAME}</p>
        <p><strong>Math problems solved:</strong> ${solvedCount}</p>
        <p><strong>Uptime:</strong> ${Math.floor(process.uptime())}s</p>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    botConnected: !!(bot && bot.entity),
    server: `${BOT_HOST}:${BOT_PORT}`,
    username: BOT_USERNAME,
    solvedCount,
    uptime: Math.floor(process.uptime()),
  });
});

app.listen(PORT, () => {
  console.log(`[Express] Keep-alive server running on port ${PORT}`);
});

// ── Bot configuration ─────────────────────────────────────────────────────────
const BOT_HOST     = '185.250.240.22';
const BOT_PORT     = 25565;
const BOT_USERNAME = 'y_s_y';
const BOT_VERSION  = '1.20.1';

// ── State ─────────────────────────────────────────────────────────────────────
let bot = null;
let solvedCount = 0;

// ── Math solver ───────────────────────────────────────────────────────────────
/**
 * Detects a 'Soru: X + Y' style addition question and returns the answer.
 * Strips colour codes, then matches the pattern case-insensitively.
 * Returns the numeric result, or null if the message doesn't match.
 */
function solveSoru(text) {
  // Strip colour codes (§x) that some servers embed in chat
  const clean = text.replace(/§[0-9a-fk-or]/gi, '').trim();

  // Match "Soru: <number> + <number>" (allows spaces around the operator)
  const match = clean.match(/soru\s*:\s*([\d]+)\s*\+\s*([\d]+)/i);
  if (!match) return null;

  const a = parseInt(match[1], 10);
  const b = parseInt(match[2], 10);
  if (isNaN(a) || isNaN(b)) return null;

  return a + b;
}

// ── Bot factory ───────────────────────────────────────────────────────────────
function createBot() {
  console.log(`[Bot] Connecting to ${BOT_HOST}:${BOT_PORT} as ${BOT_USERNAME} …`);

  bot = mineflayer.createBot({
    host: BOT_HOST,
    port: BOT_PORT,
    username: BOT_USERNAME,
    version: BOT_VERSION,
    auth: 'offline',
  });

  // ── Events ────────────────────────────────────────────────────────────────

  bot.once('spawn', () => {
    console.log('[Bot] Spawned in world. Logging in after 2 s …');
    setTimeout(() => {
      bot.chat('/login Bke010710');
      console.log('[Bot] /login command sent.');
    }, 2000);
  });

  // Listen to system/server messages (Soru questions come as server messages)
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    if (!text) return;

    console.log(`[Message] ${text}`);

    const answer = solveSoru(text);
    if (answer !== null) {
      console.log(`[Math] "${text}" → ${answer}`);
      setTimeout(() => {
        bot.chat(String(answer));
        solvedCount++;
        console.log(`[Math] Answer sent: ${answer} (total solved: ${solvedCount})`);
      }, 1500);
    }
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    console.log(`[Chat] <${username}> ${message}`);

    const answer = solveSoru(message);
    if (answer !== null) {
      console.log(`[Math] "${message}" → ${answer}`);
      setTimeout(() => {
        bot.chat(String(answer));
        solvedCount++;
        console.log(`[Math] Answer sent: ${answer} (total solved: ${solvedCount})`);
      }, 1500);
    }
  });

  bot.on('kicked', (reason) => {
    console.warn(`[Bot] Kicked: ${reason}`);
  });

  bot.on('error', (err) => {
    console.error('[Bot] Error:', err.message);
  });

  bot.on('end', (reason) => {
    console.warn(`[Bot] Disconnected (${reason}). Reconnecting in 5 s …`);
    bot = null;
    setTimeout(createBot, 5000);
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
createBot();
