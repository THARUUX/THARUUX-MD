// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Bot Activity Control Plugin
//   Commands: .bot, .enablebot, .disablebot, .disgroup, .engroup
//   Supports granular per-group, per-chat, all groups, all chats on/off
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { pnix } = require('../lib');
const rawManager = require('../lib/multiBotManager');
const multiBotManager = rawManager.multiBotManager || rawManager;

// Helper: resolve userId with fallback checks
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

// Helper: check if sender is group admin (LID and Phone JID aware)
async function isGroupAdmin(client, groupJid, senderJid, m = null) {
  if (m && (m.isOwner || m.fromMe)) return true;
  try {
    const botPhone = client.user?.id ? client.user.id.split('@')[0].split(':')[0] : '';
    const botLid = client.user?.lid ? client.user.lid.split('@')[0].split(':')[0] : '';
    const senderClean = (senderJid || '').split('@')[0].split(':')[0];

    if (botPhone && senderClean && botPhone === senderClean) return true;
    if (botLid && senderClean && botLid === senderClean) return true;

    const meta = await client.groupMetadata(groupJid);
    if (!meta || !meta.participants) return false;

    const targetIds = new Set();
    const addId = (id) => {
      if (id && typeof id === 'string') {
        targetIds.add(id.toLowerCase());
        const clean = id.split('@')[0].split(':')[0].toLowerCase();
        if (clean) targetIds.add(clean);
      }
    };

    addId(senderJid);
    if (m?.senderPn) addId(m.senderPn);

    if (senderJid && senderJid.includes('@lid')) {
      try {
        const pn = await client?.signalRepository?.lidMapping?.getPNForLID(senderJid);
        if (pn) addId(pn);
      } catch {}
    }
    if (senderJid && senderJid.includes('@s.whatsapp.net')) {
      try {
        const lid = await client?.signalRepository?.lidMapping?.getLIDForPN(senderJid);
        if (lid) addId(lid);
      } catch {}
    }

    return meta.participants.some((p) => {
      if (p.admin !== 'admin' && p.admin !== 'superadmin') return false;
      const candidates = [p.id, p.lid, p.jid, p.phoneNumber];
      return candidates.some((cand) => {
        if (!cand || typeof cand !== 'string') return false;
        const lower = cand.toLowerCase();
        const clean = cand.split('@')[0].split(':')[0].toLowerCase();
        return targetIds.has(lower) || targetIds.has(clean);
      });
    });
  } catch {
    return false;
  }
}

pnix(
  {
    command: 'bot',
    alias: ['botctrl', 'botstatus'],
    desc: 'Turn bot on/off for specific chats, groups, or globally. Usage: .bot on/off/groups/chats/all',
    type: 'owner',
    fromMe: false, // will check authorization manually so group admins can control their own group
  },
  async (m, args, client) => {
    const botPhone = (client.user?.id || '').split('@')[0].split(':')[0];
    const senderId = (m.sender || '').split('@')[0].split(':')[0];
    const isOwner = Boolean(
      m.fromMe ||
      m.isOwner ||
      (botPhone && senderId && botPhone === senderId)
    );

    const isGroup = m.chat.endsWith('@g.us');
    const isAdmin = isGroup ? await isGroupAdmin(client, m.chat, m.sender, m) : false;

    // Must be either bot owner OR a group admin (if inside a group)
    if (!isOwner && !isAdmin) {
      return m.reply('❌ *Permission denied.* Only the bot owner or group admins can configure bot activity.');
    }

    const userId = resolveUserId(client);
    if (!userId) {
      return m.reply('❌ *Could not identify bot session. Please reconnect from dashboard.*');
    }

    const state = multiBotManager.getBotChatState(userId);
    if (!state.disabled) state.disabled = [];
    if (!state.enabled) state.enabled = [];

    const action = (args || '').trim().toLowerCase();

    // ── 1. GLOBAL COMMANDS (OWNER ONLY) ─────────────────────────

    // .bot on all (Global reset to all active)
    if (action === 'on all' || action === 'all on' || action === 'all') {
      if (!isOwner) return m.reply('❌ Only the bot owner can configure global settings.');
      state.groups = true;
      state.chats = true;
      state.disabled = [];
      state.enabled = [];
      multiBotManager.saveBotChatState(userId, state);
      return m.reply('🌟 *Bot is now ENABLED EVERYWHERE* (All groups & all private chats are active).');
    }

    // .bot off all (Global mute)
    if (action === 'off all' || action === 'all off') {
      if (!isOwner) return m.reply('❌ Only the bot owner can configure global settings.');
      state.groups = false;
      state.chats = false;
      state.enabled = [];
      multiBotManager.saveBotChatState(userId, state);
      return m.reply('⛔ *Bot is now DISABLED EVERYWHERE* (Muted in all groups & chats except owner commands).');
    }

    // .bot on groups / .bot on all groups
    if (
      action === 'on groups' ||
      action === 'on all groups' ||
      action === 'groups on' ||
      action === 'all groups on' ||
      action === 'on gc' ||
      action === 'on all gc'
    ) {
      if (!isOwner) return m.reply('❌ Only the bot owner can configure global group settings.');
      state.groups = true;
      multiBotManager.saveBotChatState(userId, state);
      return m.reply(
        `🔊 *Bot is now ENABLED for ALL groups.*\n\n` +
        `_Note: Any specific groups disabled with *.bot off* will remain disabled._`
      );
    }

    // .bot off groups / .bot off all groups
    if (
      action === 'off groups' ||
      action === 'off all groups' ||
      action === 'groups off' ||
      action === 'all groups off' ||
      action === 'off gc' ||
      action === 'off all gc'
    ) {
      if (!isOwner) return m.reply('❌ Only the bot owner can configure global group settings.');
      state.groups = false;
      multiBotManager.saveBotChatState(userId, state);
      return m.reply(
        `🔇 *Bot is now DISABLED for ALL groups.*\n\n` +
        `_Note: Any specific groups explicitly enabled with *.bot on* will continue working._`
      );
    }

    // .bot on chats / .bot on all chats / .bot on dms
    if (
      action === 'on chats' ||
      action === 'on all chats' ||
      action === 'chats on' ||
      action === 'all chats on' ||
      action === 'on dms' ||
      action === 'on pms'
    ) {
      if (!isOwner) return m.reply('❌ Only the bot owner can configure global private chat settings.');
      state.chats = true;
      multiBotManager.saveBotChatState(userId, state);
      return m.reply(
        `🔊 *Bot is now ENABLED for ALL private chats.*\n\n` +
        `_Note: Any specific chats disabled with *.bot off* will remain disabled._`
      );
    }

    // .bot off chats / .bot off all chats / .bot off dms
    if (
      action === 'off chats' ||
      action === 'off all chats' ||
      action === 'chats off' ||
      action === 'all chats off' ||
      action === 'off dms' ||
      action === 'off pms'
    ) {
      if (!isOwner) return m.reply('❌ Only the bot owner can configure global private chat settings.');
      state.chats = false;
      multiBotManager.saveBotChatState(userId, state);
      return m.reply(
        `🔇 *Bot is now DISABLED for ALL private chats.*\n\n` +
        `_Note: Any specific chats explicitly enabled with *.bot on* will continue working._`
      );
    }

    // .bot list
    if (action === 'list') {
      if (!isOwner) return m.reply('❌ Only the bot owner can view the full activity list.');
      let listMsg = `📋 *THARUUX-MD Bot Activity Exceptions*\n\n`;
      listMsg += `• *All Groups Default:* ${state.groups ? '✅ ON' : '❌ OFF'}\n`;
      listMsg += `• *All Private Chats Default:* ${state.chats ? '✅ ON' : '❌ OFF'}\n\n`;

      listMsg += `*🚫 Specifically Disabled (${state.disabled.length}):*\n`;
      if (state.disabled.length === 0) listMsg += `_None_\n`;
      else state.disabled.forEach((jid, i) => { listMsg += `${i + 1}. ${jid}\n`; });

      listMsg += `\n*✨ Specifically Enabled (${state.enabled.length}):*\n`;
      if (state.enabled.length === 0) listMsg += `_None_\n`;
      else state.enabled.forEach((jid, i) => { listMsg += `${i + 1}. ${jid}\n`; });

      return m.reply(listMsg);
    }

    // .bot reset
    if (action === 'reset') {
      if (!isOwner) return m.reply('❌ Only the bot owner can reset settings.');
      state.groups = true;
      state.chats = true;
      state.disabled = [];
      state.enabled = [];
      multiBotManager.saveBotChatState(userId, state);
      return m.reply('🔄 *Bot activity settings have been reset to default (All ON).*');
    }

    // ── 2. LOCAL / CURRENT CHAT TOGGLES ──────────────────────────

    // .bot on (Current chat or group)
    if (action === 'on') {
      // Remove from disabled list
      state.disabled = state.disabled.filter((j) => j !== m.chat);

      // If category is off, add to enabled list so this chat works as an exception
      const categoryIsOff = isGroup ? state.groups === false : state.chats === false;
      if (categoryIsOff && !state.enabled.includes(m.chat)) {
        state.enabled.push(m.chat);
      }

      multiBotManager.saveBotChatState(userId, state);
      return m.reply(
        `🔊 *Bot is now ENABLED for this ${isGroup ? 'Group' : 'Chat'}.*\n\n` +
        `The bot will respond to all commands normally here.`
      );
    }

    // .bot off (Current chat or group)
    if (action === 'off') {
      // Remove from enabled list
      state.enabled = state.enabled.filter((j) => j !== m.chat);

      // Add to disabled list
      if (!state.disabled.includes(m.chat)) {
        state.disabled.push(m.chat);
      }

      multiBotManager.saveBotChatState(userId, state);
      return m.reply(
        `🔇 *Bot is now DISABLED for this ${isGroup ? 'Group' : 'Chat'}.*\n\n` +
        `The bot will silently ignore commands in this ${isGroup ? 'group' : 'chat'}.\n` +
        `_Type *.bot on* anytime to re-enable._`
      );
    }

    // ── 3. STATUS REPORT ─────────────────────────────────────────
    const isThisActive = multiBotManager.isBotActiveForChat(state, m.chat);
    return m.reply(
      `🤖 *THARUUX-MD Bot Activity Status*\n\n` +
      `• *This ${isGroup ? 'Group' : 'Chat'}:* ${isThisActive ? '✅ ACTIVE' : '❌ DISABLED'}\n` +
      `• *All Groups Setting:* ${state.groups ? '✅ ON' : '❌ OFF'}\n` +
      `• *All Private Chats Setting:* ${state.chats ? '✅ ON' : '❌ OFF'}\n` +
      `• *Specific Excluded Chats:* ${state.disabled.length}\n` +
      `• *Specific Included Chats:* ${state.enabled.length}\n\n` +
      `*Usage:*\n` +
      `• *.bot on* — Enable bot for THIS ${isGroup ? 'group' : 'chat'}\n` +
      `• *.bot off* — Disable bot for THIS ${isGroup ? 'group' : 'chat'}\n` +
      `• *.bot on groups* — Enable for ALL groups\n` +
      `• *.bot off groups* — Disable for ALL groups\n` +
      `• *.bot on chats* — Enable for ALL private chats\n` +
      `• *.bot off chats* — Disable for ALL private chats\n` +
      `• *.bot on all* — Enable everywhere\n` +
      `• *.bot off all* — Disable everywhere\n` +
      `• *.bot list* — View list of exceptions\n` +
      `• *.bot reset* — Reset to default`
    );
  }
);

// ── CONVENIENCE ALIAS COMMANDS ─────────────────────────
pnix(
  {
    command: 'enablebot',
    alias: ['engroup'],
    desc: 'Enable bot for this group/chat',
    type: 'owner',
    fromMe: false,
  },
  async (m, args, client) => {
    const event = require('../lib/commands');
    const botCmd = event.commands.find((c) => c.command === 'bot');
    if (botCmd) return botCmd.function(m, 'on', client);
  }
);

pnix(
  {
    command: 'disablebot',
    alias: ['disgroup'],
    desc: 'Disable bot for this group/chat',
    type: 'owner',
    fromMe: false,
  },
  async (m, args, client) => {
    const event = require('../lib/commands');
    const botCmd = event.commands.find((c) => c.command === 'bot');
    if (botCmd) return botCmd.function(m, 'off', client);
  }
);
