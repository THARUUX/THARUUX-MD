// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Alive & System Status Plugin
//   Commands: .alive, .botstatus, .sysinfo, .ping
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const { pnix } = require('../lib');
const { font } = require('../lib/font');
const event = require('../lib/commands');
const rawManager = require('../lib/multiBotManager');
const multiBotManager = rawManager.multiBotManager || rawManager;


function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function resolveUserId(client) {
  if (client?._userId) return client._userId;
  if (client?.userId) return client.userId;
  if (multiBotManager?.bots) {
    for (const [uid, b] of multiBotManager.bots.entries()) {
      if (b?.sock === client) return uid;
      if (client?.user?.id && (b?.sock?.user?.id === client.user.id || b?.userInfo?.id === client.user.id)) return uid;
    }
    if (multiBotManager.bots.size === 1) {
      return multiBotManager.bots.keys().next().value;
    }
  }
  return null;
}

pnix(
  {
    command: 'alive',
    alias: ['botstatus', 'sysinfo', 'uptime'],
    desc: 'Displays active bot status and system information.',
    type: 'main',
    fromMe: false, // Public command
  },
  async (m, args, client) => {
    try {
      const isOwner = Boolean(m.isOwner || m.fromMe);
      const userId = resolveUserId(client);
      const chatState = userId ? multiBotManager.getBotChatState(userId) : null;
      const userCfg = userId ? await multiBotManager.getBotConfig(userId) : {};

      const effectivePrefix = (chatState && chatState.customPrefix !== undefined && chatState.customPrefix !== null)
        ? chatState.customPrefix
        : (userCfg.prefix || '.');

      const botName = userCfg.bot_name || 'THARUUX-MD';
      const roleBadge = isOwner ? 'Owner / Sudo' : 'Public User';
      const prefixMode = chatState?.prefixRequired === false ? 'Optional' : 'Strict';
      const totalCmds = event.commands?.length || 145;
      const uptimeStr = formatUptime(process.uptime());

      const bodyText =
        `*${font(botName)}* • ${font('System Status')}\n\n` +
        `• *${font('Status')}* : Online & Operational ⚡\n` +
        `• *${font('Engine')}* : ${botName} v2.5\n` +
        `• *${font('Role')}* : ${isOwner ? '👑 ' : '👤 '}${font(roleBadge)}\n` +
        `• *${font('Uptime')}* : ${uptimeStr}\n` +
        `• *${font('Prefix')}* : \`${effectivePrefix}\` (${font(prefixMode)})\n` +
        `• *${font('Commands')}* : ${totalCmds} Loaded\n` +
        `• *${font('Platform')}* : Multi-Tenant Cloud\n` +
        `• *${font('Master Owner')}* : +94789731507\n\n` +
        `• *${font('Menu')}* : \`${effectivePrefix}menu\`\n` +
        `• *${font('Ping')}* : \`${effectivePrefix}ping\`\n` +
        `• *${font('Channel')}* : https://whatsapp.com/channel/0029VbCPwW09xVJYInYQwS2D\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`;

      const bannerPath = path.resolve(__dirname, '../Images/banner.png');
      const logoPath = path.resolve(__dirname, '../Images/logo.png');
      let imgBuffer = null;
      if (fs.existsSync(bannerPath)) {
        imgBuffer = fs.readFileSync(bannerPath);
      } else if (fs.existsSync(logoPath)) {
        imgBuffer = fs.readFileSync(logoPath);
      }

      if (imgBuffer && typeof client?.sendMessage === 'function') {
        await client.sendMessage(
          m.chat,
          {
            image: imgBuffer,
            caption: bodyText,
          },
          { quoted: m.data || m }
        );
      } else {
        await m.reply(bodyText);
      }
    } catch (err) {
      console.error('Alive command error:', err);
      await m.reply(`*THARUUX-MD is Online and Active!*\nUptime: ${formatUptime(process.uptime())}\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
    }
  }
);

pnix(
  {
    command: 'ping',
    alias: ['speed', 'latency', 'p'],
    desc: 'Displays response latency and server uptime.',
    type: 'main',
    fromMe: false, // Public command
  },
  async (m, args, client) => {
    try {
      const start = Date.now();
      const uptimeSec = Math.floor(process.uptime());
      const latency = Math.max(0, start - (m.timestamp ? (m.timestamp > 1e12 ? m.timestamp : m.timestamp * 1000) : start));

      const pingText =
        `*${font('THARUUX-MD')}* • ${font('Speed Test')} ⚡\n\n` +
        `• *${font('Latency')}* : ${latency}ms\n` +
        `• *${font('Uptime')}* : ${formatUptime(uptimeSec)}\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`;

      await m.reply(pingText);
    } catch (err) {
      console.error('Ping command error:', err);
      await m.reply(`⚡ Latency: 0ms\n⏰ Uptime: ${formatUptime(Math.floor(process.uptime()))}\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
    }
  }
);
