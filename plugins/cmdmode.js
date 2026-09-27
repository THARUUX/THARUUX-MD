// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Custom Command Accessibility Plugin
//   Commands: .cmdmode, .setcmd, .cmdaccess
//   Allows the owner to customize which commands are owner-only
//   and which are public for all users.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { pnix } = require('../lib');
const { font } = require('../lib/font');
const rawManager = require('../lib/multiBotManager');
const multiBotManager = rawManager.multiBotManager || rawManager;
const event = require('../lib/commands');

// Critical security commands that cannot be made public
const PROTECTED_OWNER_COMMANDS = ['bot', 'enablebot', 'disablebot', 'cmdmode', 'setcmd', 'addsudo', 'delsudo', 'getsudo', 'prefix', 'setprefix'];

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
    command: 'cmdmode',
    alias: ['setcmd', 'cmdaccess'],
    desc: 'Customize whether a command is owner-only or public. Usage: .cmdmode <command> owner/public/reset',
    type: 'owner',
    fromMe: true, // Owner/Sudo only
  },
  async (m, args, client) => {
    if (!m.isOwner) {
      return m.reply('❌ *This command is restricted to bot owner & sudo users only.*\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ');
    }

    const userId = resolveUserId(client);
    if (!userId) {
      return m.reply('❌ *Could not identify bot instance. Please reconnect from dashboard.*\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ');
    }

    const chatState = multiBotManager.getBotChatState(userId);
    if (!chatState.customCommandAccess || typeof chatState.customCommandAccess !== 'object') {
      chatState.customCommandAccess = {};
    }

    const input = (args || '').trim();
    const parts = input.split(/\s+/);
    const targetCmd = parts[0]?.toLowerCase().replace(/^[.!#/?]/, '');
    const mode = parts[1]?.toLowerCase();

    // ── LIST CUSTOMIZED COMMANDS ──
    if (targetCmd === 'list') {
      const overrides = Object.entries(chatState.customCommandAccess);
      if (overrides.length === 0) {
        return m.reply(
          `*${font('Command Permissions')}*\n\n` +
          `ℹ️ No custom command overrides set.\n` +
          `All commands are using their default settings.\n\n` +
          `*${font('How to customize')}*\n` +
          `• \`.cmdmode <command> owner\` — Lock to owner\n` +
          `• \`.cmdmode <command> public\` — Open to everyone\n\n` +
          `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
        );
      }

      let text = `*${font('Custom Command Permissions')}*\n\n`;
      overrides.forEach(([cmd, access], idx) => {
        const badge = access === 'owner' ? '🔒 OWNER-ONLY' : '🌐 PUBLIC';
        text += `• ${idx + 1}. *${cmd}* → ${badge}\n`;
      });
      text +=
        `\n*${font('To reset a command')}*\n` +
        `• \`.cmdmode <command> reset\`\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`;

      return m.reply(text);
    }

    // ── HELP MENU ──
    if (!targetCmd || !mode) {
      return m.reply(
        `*${font('Command Access Control')}*\n\n` +
        `Customize whether any command is owner-only or public for everyone.\n\n` +
        `*${font('Commands')}*\n` +
        `• \`.cmdmode <cmd> owner\` — Locks command to owner & sudo only.\n` +
        `• \`.cmdmode <cmd> public\` — Opens command to all members.\n` +
        `• \`.cmdmode <cmd> reset\` — Restores original default setting.\n` +
        `• \`.cmdmode list\` — Shows all customized commands.\n\n` +
        `*${font('Examples')}*\n` +
        `• \`.cmdmode getdp owner\`\n` +
        `• \`.cmdmode vv public\`\n` +
        `• \`.cmdmode getdp reset\`\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
      );
    }

    // Verify command exists in bot registry
    const allCommands = event.commands || [];
    const exists = allCommands.some(
      (c) => c.command === targetCmd || (c.alias && c.alias.includes(targetCmd))
    );

    if (!exists) {
      return m.reply(
        `❌ *Command \`${targetCmd}\` was not found in the bot registry.*\n` +
        `Please check spelling and try again.\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
      );
    }

    // ── RESET TO DEFAULT ──
    if (mode === 'reset' || mode === 'default') {
      if (chatState.customCommandAccess[targetCmd]) {
        delete chatState.customCommandAccess[targetCmd];
        multiBotManager.saveBotChatState(userId, chatState);
        return m.reply(
          `*${font('Command Reset')}*\n\n` +
          `• *${font('Command')}* : \`${targetCmd}\`\n` +
          `• *${font('Status')}* : Reverted to original default setting.\n\n` +
          `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
        );
      } else {
        return m.reply(`ℹ️ Command \`${targetCmd}\` is already using default settings.\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
      }
    }

    // ── SET TO OWNER-ONLY ──
    if (mode === 'owner' || mode === 'private') {
      chatState.customCommandAccess[targetCmd] = 'owner';
      multiBotManager.saveBotChatState(userId, chatState);

      return m.reply(
        `*${font('Command Access: Owner-Only')}*\n\n` +
        `• *${font('Command')}* : \`${targetCmd}\`\n` +
        `• *${font('Permission')}* : 🔒 Owner & Sudo users ONLY\n\n` +
        `ℹ️ Regular members will now be blocked from executing this command.\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
      );
    }

    // ── SET TO PUBLIC ──
    if (mode === 'public') {
      if (PROTECTED_OWNER_COMMANDS.includes(targetCmd)) {
        return m.reply(
          `*${font('Security Protection')}*\n\n` +
          `⛔ Core administrative commands like \`${targetCmd}\` cannot be made public!\n\n` +
          `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
        );
      }

      chatState.customCommandAccess[targetCmd] = 'public';
      multiBotManager.saveBotChatState(userId, chatState);

      return m.reply(
        `*${font('Command Access: Public')}*\n\n` +
        `• *${font('Command')}* : \`${targetCmd}\`\n` +
        `• *${font('Permission')}* : 🌐 Public for EVERYONE\n\n` +
        `ℹ️ All users can now use this command in enabled chats and groups.\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
      );
    }

    return m.reply(
      `❌ *Invalid mode \`${mode}\`!*\n` +
      `Use: *.cmdmode ${targetCmd} owner* or *.cmdmode ${targetCmd} public*\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
    );
  }
);
