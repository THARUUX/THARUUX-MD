// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Prefix Configuration Plugin
//   Commands: .prefix, .setprefix, .prefixmode
//   Toggles strict prefix requirement (ON) vs optional (OFF),
//   and allows updating the prefix symbol dynamically.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { pnix } = require('../lib');
const { font } = require('../lib/font');
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

pnix(
  {
    command: 'prefix',
    alias: ['setprefix', 'prefixmode'],
    desc: 'Configure prefix requirement (ON = strict, OFF = optional) or change prefix symbol.',
    type: 'owner',
    fromMe: true, // STRICTLY OWNER ONLY
  },
  async (m, args, client) => {
    // Owner authorization guard
    const botPhone = (client.user?.id || '').split('@')[0].split(':')[0];
    const senderId = (m.sender || '').split('@')[0].split(':')[0];
    const isOwner = Boolean(
      m.fromMe ||
      m.isOwner ||
      (botPhone && senderId && botPhone === senderId)
    );

    if (!isOwner) {
      return m.reply('❌ *This command is restricted to the bot owner only.*');
    }

    const userId = resolveUserId(client);
    if (!userId) {
      return m.reply('❌ *Could not identify bot user. Please reconnect from the dashboard.*');
    }

    const chatState = multiBotManager.getBotChatState(userId);
    const effectivePrefix = (chatState && chatState.customPrefix !== undefined && chatState.customPrefix !== null)
      ? chatState.customPrefix
      : '.';
    const isPrefixRequired = chatState?.prefixRequired !== false;

    const input = (args || '').trim();
    const parts = input.split(/\s+/);
    const subCmd = parts[0]?.toLowerCase();

    // ── 1. Turn Prefix ON (Strictly Required) ──
    if (subCmd === 'on' || subCmd === 'enable' || subCmd === 'strict' || subCmd === 'require') {
      chatState.prefixRequired = true;
      multiBotManager.saveBotChatState(userId, chatState);

      return m.reply(
        `*${font('Prefix')}* • ${font('Strict (ON)')}\n\n` +
        `• *${font('Requirement')}* : ON (Strict)\n` +
        `• *${font('Active Prefix')}* : \`${effectivePrefix}\`\n\n` +
        `*${font('Mode')}*\n` +
        `Commands will now *ONLY* trigger when starting with the prefix!\n` +
        `• \`${effectivePrefix}ping\` → Works\n` +
        `• \`ping\` (no prefix) → Ignored\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
      );
    }

    // ── 2. Turn Prefix OFF (Optional / All-Mode) ──
    if (subCmd === 'off' || subCmd === 'disable' || subCmd === 'optional' || subCmd === 'all') {
      chatState.prefixRequired = false;
      multiBotManager.saveBotChatState(userId, chatState);

      return m.reply(
        `*${font('Prefix')}* • ${font('Optional (OFF)')}\n\n` +
        `• *${font('Requirement')}* : OFF (Optional)\n` +
        `• *${font('Active Prefix')}* : \`${effectivePrefix}\`\n\n` +
        `*${font('Mode')}*\n` +
        `Commands will trigger *BOTH WITH* and *WITHOUT* prefix!\n` +
        `• \`${effectivePrefix}ping\` → Works\n` +
        `• \`ping\` → Works\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
      );
    }

    // ── 3. Change Prefix Symbol ──
    if (subCmd === 'set' && parts[1]) {
      const newSymbol = parts[1].trim();
      chatState.customPrefix = newSymbol;
      multiBotManager.saveBotChatState(userId, chatState);

      return m.reply(
        `*${font('Prefix Updated')}*\n\n` +
        `• *${font('New Prefix')}* : \`${newSymbol}\`\n` +
        `• *${font('Prefix Required')}* : ${isPrefixRequired ? font('ON (Strict)') : font('OFF (Optional)')}\n\n` +
        `*${font('Example')}* : \`${newSymbol}menu\`, \`${newSymbol}alive\`\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
      );
    }

    // If user passed a single symbol directly, e.g. `.prefix !` or `.prefix #`
    if (input.length > 0 && input.length <= 3 && !['status', 'list', 'help', 'info'].includes(subCmd)) {
      chatState.customPrefix = input;
      multiBotManager.saveBotChatState(userId, chatState);

      return m.reply(
        `*${font('Prefix Updated')}*\n\n` +
        `• *${font('New Prefix')}* : \`${input}\`\n` +
        `• *${font('Prefix Required')}* : ${isPrefixRequired ? font('ON (Strict)') : font('OFF (Optional)')}\n\n` +
        `*${font('Example')}* : \`${input}menu\`, \`${input}alive\`\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
      );
    }

    // ── 4. Status & Help Menu ──
    const modeDesc = isPrefixRequired
      ? '🟢 *ON (Strict)* — Only commands WITH prefix will trigger.'
      : '🟡 *OFF (Optional)* — Commands trigger WITH or WITHOUT prefix.';

    return m.reply(
      `*${font('Prefix Configuration')}*\n\n` +
      `• *${font('Current Prefix')}* : \`${effectivePrefix}\`\n` +
      `• *${font('Status')}* : ${isPrefixRequired ? 'ON' : 'OFF'}\n\n` +
      `${modeDesc}\n\n` +
      `*${font('Commands')}*\n` +
      `• \`${effectivePrefix}prefix on\` — Strictly require prefix\n` +
      `• \`${effectivePrefix}prefix off\` — Trigger with OR without prefix\n` +
      `• \`${effectivePrefix}prefix set <char>\` — Set prefix (e.g. \`${effectivePrefix}prefix set !\`)\n` +
      `• \`${effectivePrefix}prefix <char>\` — Shortcut (e.g. \`${effectivePrefix}prefix #\`)\n` +
      `• \`${effectivePrefix}prefix status\` — Show this status\n\n` +
      `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
    );
  }
);
