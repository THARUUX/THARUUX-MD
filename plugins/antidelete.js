// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Anti-Delete Plugin
//   Core detection is in multiBotManager.js
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

// ── ANTIDELETE CONFIGURATION COMMAND ─────────
pnix(
  {
    command: 'antidelete',
    alias: ['antidel', 'ad'],
    desc: 'Configure anti-delete protection. Usage: .antidelete on/off/chat/dm/both',
    type: 'privacy',
    fromMe: true, // STRICTLY OWNER ONLY (ignored for non-owners)
  },
  async (m, args, client) => {
    // Owner authorization check
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

    const settings = multiBotManager.getAntideleteSettings(userId);
    const action = (args || '').trim().toLowerCase();

    // Enable anti-delete
    if (action === 'on') {
      settings.enabled = true;
      settings.disabledChats.delete(m.chat);
      return m.reply(
        `*🔒 Anti-Delete: ACTIVE ✅*\n\n` +
        `• *Protection:* Enabled for all chats\n` +
        `• *Destination:* ${settings.dest.toUpperCase()} ${settings.dest === 'chat' ? '(resends in active chat)' : '(private DM)'}\n\n` +
        `_Deleted messages and media will be automatically recovered!_\n` +
        `_Type *.antidelete dm* to route reports privately to your DM._\n` +
        `_Type *.antidelete off* to disable._`
      );
    }

    // Disable anti-delete globally
    if (action === 'off') {
      settings.enabled = false;
      return m.reply(`*🔓 Anti-Delete: DISABLED globally*`);
    }

    // Route to chat where deleted
    if (action === 'chat') {
      settings.enabled = true;
      settings.dest = 'chat';
      return m.reply(
        `*🔒 Anti-Delete Destination: CHAT*\n\n` +
        `Recovered messages will be resent directly in the chat where they were deleted.`
      );
    }

    // Route to private DM
    if (action === 'dm') {
      settings.enabled = true;
      settings.dest = 'dm';
      return m.reply(
        `*🔒 Anti-Delete Destination: PRIVATE DM*\n\n` +
        `Recovered messages will be sent privately to your DM (Message Yourself).`
      );
    }

    // Route to both
    if (action === 'both') {
      settings.enabled = true;
      settings.dest = 'both';
      return m.reply(
        `*🔒 Anti-Delete Destination: CHAT & DM*\n\n` +
        `Recovered messages will be sent to both the chat and your private DM.`
      );
    }

    // Status report
    const cacheSize = multiBotManager._antideleteCache?.[userId]?.size || 0;
    return m.reply(
      `*🛡️ THARUUX-MD Anti-Delete*\n\n` +
      `• *Status:* ${settings.enabled ? '✅ ACTIVE (Auto-protects all chats)' : '❌ DISABLED'}\n` +
      `• *Destination:* ${settings.dest.toUpperCase()} ${settings.dest === 'chat' ? '(Resends in chat)' : '(Private DM)'}\n` +
      `• *Messages in Memory Cache:* ${cacheSize}\n\n` +
      `*Commands:*\n` +
      `• *.antidelete on* — Enable anti-delete\n` +
      `• *.antidelete off* — Disable anti-delete\n` +
      `• *.antidelete chat* — Resend deleted messages in the chat\n` +
      `• *.antidelete dm* — Send deleted messages privately to your DM\n` +
      `• *.antidelete both* — Send to both chat and private DM`
    );
  }
);
