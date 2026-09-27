// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Sudo Users Management Plugin
//   Commands: .addsudo, .delsudo, .getsudo, .sudolist
//   Enables designated users to execute all owner commands.
//   Protected: 94789731507 is the permanent Master Owner.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { pnix } = require('../lib');
const { font } = require('../lib/font');
const rawManager = require('../lib/multiBotManager');
const multiBotManager = rawManager.multiBotManager || rawManager;

const PERMANENT_MASTER = '94789731507';

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

// Helper: parse phone number from args, mention, or quoted message
function extractTargetNumber(m, args) {
  if (m.quoted?.sender) {
    return m.quoted.sender.split('@')[0].split(':')[0];
  }
  const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (Array.isArray(mentioned) && mentioned.length > 0) {
    return mentioned[0].split('@')[0].split(':')[0];
  }
  if (args) {
    const cleaned = args.replace(/[^0-9]/g, '');
    if (cleaned.length >= 7 && cleaned.length <= 16) {
      return cleaned;
    }
  }
  return null;
}

// ── ADD SUDO ───────────────────────────────────
pnix(
  {
    command: 'addsudo',
    alias: ['setsudo'],
    desc: 'Add a sudo user who can use owner commands. Usage: .addsudo @user or .addsudo <number>',
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

    const targetNum = extractTargetNumber(m, args);
    if (!targetNum) {
      return m.reply(
        `*${font('Add Sudo User')}*\n\n` +
        `❌ *No target specified!*\n\n` +
        `*${font('Usage')}*\n` +
        `• Reply to a user: \`.addsudo\`\n` +
        `• Tag a user: \`.addsudo @user\`\n` +
        `• Type number: \`.addsudo 94712345678\`\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
      );
    }

    if (targetNum === PERMANENT_MASTER) {
      return m.reply(`ℹ️ *+${PERMANENT_MASTER} is already the permanent Master Owner!*\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
    }

    const chatState = multiBotManager.getBotChatState(userId);
    if (!Array.isArray(chatState.sudoNumbers)) {
      chatState.sudoNumbers = [];
    }

    if (chatState.sudoNumbers.includes(targetNum)) {
      return m.reply(`ℹ️ *+${targetNum} is already in the sudo list!*\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
    }

    chatState.sudoNumbers.push(targetNum);
    multiBotManager.saveBotChatState(userId, chatState);

    return m.reply(
      `*${font('Sudo User Added')}*\n\n` +
      `• *${font('User')}* : +${targetNum}\n` +
      `• *${font('Privilege')}* : 👑 Sudo / Co-Owner\n\n` +
      `ℹ️ This user can now use all owner commands!\n\n` +
      `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`,
      { mentions: [`${targetNum}@s.whatsapp.net`] }
    );
  }
);

// ── DELETE SUDO ────────────────────────────────
pnix(
  {
    command: 'delsudo',
    alias: ['removesudo', 'rmsudo'],
    desc: 'Remove a sudo user. Usage: .delsudo @user or .delsudo <number>',
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

    const targetNum = extractTargetNumber(m, args);
    if (!targetNum) {
      return m.reply(
        `*${font('Remove Sudo User')}*\n\n` +
        `❌ *No target specified!*\n\n` +
        `*${font('Usage')}*\n` +
        `• Reply to a user: \`.delsudo\`\n` +
        `• Tag a user: \`.delsudo @user\`\n` +
        `• Type number: \`.delsudo 94712345678\`\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
      );
    }

    // STRICT GUARANTEE: Permanent Master Owner can NEVER be deleted
    if (targetNum === PERMANENT_MASTER) {
      return m.reply(
        `*${font('Access Denied')}*\n\n` +
        `⛔ *Protected Master Owner*\n\n` +
        `*+${PERMANENT_MASTER}* is the permanent Master Owner and can NEVER be removed from sudo!\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
      );
    }

    const chatState = multiBotManager.getBotChatState(userId);
    if (!Array.isArray(chatState.sudoNumbers) || !chatState.sudoNumbers.includes(targetNum)) {
      return m.reply(`❌ *+${targetNum} is not currently a sudo user.*\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
    }

    chatState.sudoNumbers = chatState.sudoNumbers.filter((n) => n !== targetNum);
    multiBotManager.saveBotChatState(userId, chatState);

    return m.reply(
      `*${font('Sudo User Removed')}*\n\n` +
      `• *${font('User')}* : +${targetNum}\n` +
      `• *${font('Status')}* : Sudo privileges revoked\n\n` +
      `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
    );
  }
);

// ── LIST SUDO USERS ────────────────────────────
pnix(
  {
    command: 'getsudo',
    alias: ['sudolist', 'sudos'],
    desc: 'List all active sudo users and master owners.',
    type: 'owner',
    fromMe: true,
  },
  async (m, args, client) => {
    if (!m.isOwner) {
      return m.reply('❌ *This command is restricted to bot owner & sudo users only.*\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ');
    }

    const userId = resolveUserId(client);
    if (!userId) {
      return m.reply('❌ *Could not identify bot instance.*\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ');
    }

    const chatState = multiBotManager.getBotChatState(userId);
    const dynamicSudos = Array.isArray(chatState.sudoNumbers) ? chatState.sudoNumbers : [];

    let text =
      `*${font('Sudo Authorization List')}*\n\n` +
      `• *${font('Master (Permanent)')}* : +${PERMANENT_MASTER}\n\n`;

    if (dynamicSudos.length === 0) {
      text += `• *${font('Additional Sudo Users')}* : None\n\n`;
    } else {
      text += `*${font(`Additional Sudo Users (${dynamicSudos.length})`)}*\n`;
      dynamicSudos.forEach((num, idx) => {
        text += `• ${idx + 1}. +${num}\n`;
      });
      text += `\n`;
    }

    text +=
      `*${font('Management Commands')}*\n` +
      `• \`.addsudo <number/@user>\` — Add user\n` +
      `• \`.delsudo <number/@user>\` — Remove user\n\n` +
      `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`;

    return m.reply(text);
  }
);
