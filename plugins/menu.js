// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Dynamic Adaptive Menu & Detailed Guide Plugin
//   Commands: .menu, .help, .guide, .manual, .howtouse
//   • Owner/Sudo: Displays all commands (Public + Owner)
//   • Public Users: Displays ONLY public commands
//   • .guide: In-depth usage guide with examples for any command
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const fs = require('fs');
const path = require('path');
const { pnix } = require('../lib');
const { font } = require('../lib/font');
const event = require('../lib/commands');
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

// Format uptime string
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

// Category metadata
const CATEGORY_META = {
  downloader: { title: 'DOWNLOADERS', emoji: '📥' },
  download: { title: 'DOWNLOADERS', emoji: '📥' },
  media: { title: 'MEDIA & VIEWONCE', emoji: '🎬' },
  tools: { title: 'TOOLS & SEARCH', emoji: '🛠️' },
  utilities: { title: 'UTILITIES', emoji: '⚙️' },
  group: { title: 'GROUP MANAGEMENT', emoji: '👥' },
  anime: { title: 'ANIME & MANGA', emoji: '⛩️' },
  fun: { title: 'FUN & GAMES', emoji: '🎭' },
  game: { title: 'FUN & GAMES', emoji: '🎮' },
  audio: { title: 'AUDIO & VOICE', emoji: '🎵' },
  converter: { title: 'CONVERTERS', emoji: '🔄' },
  logo: { title: 'LOGO MAKER', emoji: '🎨' },
  privacy: { title: 'PRIVACY & SECURITY', emoji: '🛡️' },
  owner: { title: 'OWNER & SYSTEM', emoji: '👑' },
  main: { title: 'GENERAL & INFO', emoji: 'ℹ️' },
};

// Curated detailed guides for flagship commands
const DETAILED_GUIDES = {
  vv: {
    title: 'Anti-ViewOnce Media Revealer (.vv)',
    desc: 'Reveals and downloads View-Once photos, videos, and voice notes so they can be viewed repeatedly.',
    usage: 'Reply to any View-Once photo, video, or voice note with *.vv*',
    aliases: ['viewonce', 'antivo', 'vo'],
    examples: ['(Reply to View-Once) .vv'],
    permission: 'Public (or Owner if customized via .cmdmode)',
    notes: 'Preserves the original caption and voice note audio pitch.',
  },
  getdp: {
    title: 'Profile Picture Downloader (.getdp)',
    desc: 'Downloads high-definition WhatsApp profile pictures of contacts, phone numbers, groups, or yourself.',
    usage: '• Reply to a user: *.getdp*\n• Tag a user: *.getdp @user*\n• Number: *.getdp 94712345678*\n• Group icon: *.getdp group* (or *.gcdp*)\n• Yourself: *.getdp me* (or *.mypfp*)',
    aliases: ['pfp', 'dp', 'profilepic', 'gcdp', 'mypfp'],
    examples: ['.getdp @friend', '.getdp 94789731507', '.getdp group', '.getdp me'],
    permission: 'Public (or Owner if customized via .cmdmode)',
    notes: 'Fetches HD full-resolution images with automatic preview fallback if restricted by privacy settings.',
  },
  antidelete: {
    title: 'Anti-Delete Message Recovery (.antidelete)',
    desc: 'Automatically catches revoked / deleted messages (text, photos, videos, stickers) and restores them.',
    usage: '• *.antidelete on* — Enable globally\n• *.antidelete off* — Disable globally\n• *.antidelete chat* — Send deleted messages to current chat\n• *.antidelete dm* — Send deleted messages to your private DM\n• *.antidelete both* — Send to both chat & DM\n• *.antidelete status* — View current settings',
    aliases: ['antidel', 'ad'],
    examples: ['.antidelete on', '.antidelete dm', '.antidelete status'],
    permission: 'Owner / Sudo Only',
    notes: 'Default is enabled to current chat. Media is re-uploaded with sender mentions.',
  },
  bot: {
    title: 'Bot Activity Control (.bot)',
    desc: 'Selectively enables or disables the bot in specific groups, private chats, or globally.',
    usage: '• *.bot on / off* — Toggle bot in this current chat\n• *.bot on groups / off groups* — Toggle all groups\n• *.bot on chats / off chats* — Toggle all private DMs\n• *.bot on all / off all* — Global master killswitch\n• *.bot list* — View all active exceptions\n• *.bot reset* — Reset all exceptions to default',
    aliases: ['enablebot', 'disablebot', 'disgroup', 'engroup'],
    examples: ['.bot off', '.bot on', '.bot off groups', '.bot list'],
    permission: 'Group Admins (for current group) & Bot Owner (for all chats/global)',
    notes: 'Exceptions are persisted across server restarts on disk.',
  },
  prefix: {
    title: 'Prefix Mode & Configuration (.prefix)',
    desc: 'Controls whether bot commands strictly require a prefix symbol, or trigger with/without prefix.',
    usage: '• *.prefix on* — STRICT mode (commands MUST start with prefix, e.g. .ping)\n• *.prefix off* — OPTIONAL mode (commands trigger with OR without prefix, e.g. ping & .ping)\n• *.prefix set <symbol>* — Change prefix character (e.g. .prefix set !)\n• *.prefix status* — Check active prefix and mode',
    aliases: ['setprefix', 'prefixmode'],
    examples: ['.prefix on', '.prefix off', '.prefix set !', '.prefix status'],
    permission: 'Owner / Sudo Only',
    notes: 'Changing prefix is instantly applied to all active user bots.',
  },
  addsudo: {
    title: 'Add Sudo User (.addsudo)',
    desc: 'Authorizes a phone number as a Sudo co-owner, allowing them to use all owner commands.',
    usage: '• Reply to a user: *.addsudo*\n• Tag a user: *.addsudo @user*\n• Number: *.addsudo 94712345678*',
    aliases: ['setsudo'],
    examples: ['.addsudo 94712345678', '.addsudo @user'],
    permission: 'Owner / Sudo Only',
    notes: '+94789731507 is permanent Master Owner and can never be modified.',
  },
  delsudo: {
    title: 'Remove Sudo User (.delsudo)',
    desc: 'Revokes sudo privileges from a previously authorized user.',
    usage: '• Reply to a user: *.delsudo*\n• Tag a user: *.delsudo @user*\n• Number: *.delsudo 94712345678*',
    aliases: ['removesudo', 'rmsudo'],
    examples: ['.delsudo 94712345678'],
    permission: 'Owner / Sudo Only',
    notes: 'Master Owner (+94789731507) is protected and cannot be deleted.',
  },
  cmdmode: {
    title: 'Customize Command Accessibility (.cmdmode)',
    desc: 'Allows the bot owner to customize whether any command is owner-only or public for everyone.',
    usage: '• *.cmdmode <cmd> owner* — Lock command to Owner & Sudo only\n• *.cmdmode <cmd> public* — Open command to all members\n• *.cmdmode <cmd> reset* — Revert to original code default\n• *.cmdmode list* — List all custom overrides',
    aliases: ['setcmd', 'cmdaccess'],
    examples: ['.cmdmode getdp owner', '.cmdmode vv public', '.cmdmode list'],
    permission: 'Owner / Sudo Only',
    notes: 'Core security commands (.bot, .sudo, .prefix) cannot be set to public.',
  },
  fb: {
    title: 'Facebook Video Downloader (.fb)',
    desc: 'Downloads Facebook reels, public videos, and watch clips in HD/SD.',
    usage: '*.fb <facebook_video_url>*',
    aliases: ['fbdl', 'facebook'],
    examples: ['.fb https://www.facebook.com/watch/?v=123456'],
    permission: 'Public',
    notes: 'Sends high-resolution video directly to the chat.',
  },
  insta: {
    title: 'Instagram Downloader (.insta)',
    desc: 'Downloads Instagram reels, posts, and carousel videos.',
    usage: '*.insta <instagram_url>*',
    aliases: ['ig', 'reels'],
    examples: ['.insta https://www.instagram.com/reel/C...'],
    permission: 'Public',
    notes: 'Requires a public Instagram post link.',
  },
  tiktok: {
    title: 'TikTok Downloader (.tiktok)',
    desc: 'Downloads TikTok videos without watermark in HD.',
    usage: '*.tiktok <tiktok_url>*',
    aliases: ['tt', 'ttdl'],
    examples: ['.tiktok https://vm.tiktok.com/...'],
    permission: 'Public',
    notes: 'Extracts clean, watermark-free video buffer.',
  },
  tagall: {
    title: 'Tag All Group Members (.tagall)',
    desc: 'Mentions every participant in the group with an optional announcement message.',
    usage: '*.tagall <optional announcement message>*',
    aliases: ['everyone'],
    examples: ['.tagall Meeting starting in 5 minutes!'],
    permission: 'Group Admins / Owner',
    notes: 'Works only inside WhatsApp groups.',
  },
  warn: {
    title: 'Warn Group Member (.warn)',
    desc: 'Issues a warning strike to a group member. Automatically removes member upon reaching max strikes.',
    usage: '*.warn @user <reason>* or reply to message with *.warn*',
    aliases: [],
    examples: ['.warn @member No spamming!'],
    permission: 'Group Admins / Owner',
    notes: 'Tracks strike counts per member inside the group.',
  },
  sticker: {
    title: 'Sticker Maker (.sticker)',
    desc: 'Converts any quoted or sent image or video clip into a WhatsApp sticker.',
    usage: 'Reply to an image or short video with *.sticker*',
    aliases: ['s'],
    examples: ['(Reply to photo) .sticker'],
    permission: 'Public',
    notes: 'Uses configured pack name and author branding.',
  },
};

// ── ADAPTIVE MENU COMMAND ──────────────────────
pnix(
  {
    command: 'menu',
    alias: ['help', 'allmenu', 'commands', 'list'],
    desc: "Show the bot's command menu (Owner sees all; Public sees public commands).",
    type: 'main',
    fromMe: false, // Accessible by everyone (content adapts dynamically)
  },
  async (m, args, client) => {
    try {
      const isOwner = Boolean(m.isOwner || m.fromMe);
      const userId = resolveUserId(client);
      const chatState = userId ? multiBotManager.getBotChatState(userId) : null;
      const customOverrides = chatState?.customCommandAccess || {};

      const effectivePrefix = (chatState && chatState.customPrefix !== undefined && chatState.customPrefix !== null)
        ? chatState.customPrefix
        : '.';

      // Filter visible commands based on caller's role and custom access overrides
      const allCommands = event.commands || [];
      const visibleCommands = allCommands.filter((cmd) => {
        if (!cmd.command) return false;
        if (cmd.dontAddCommandList) return false;

        // If caller is owner/sudo: show EVERYTHING
        if (isOwner) return true;

        // For public users:
        const access = customOverrides[cmd.command.toLowerCase()];
        if (access === 'owner') return false; // overridden to owner-only
        if (access === 'public') return true;  // overridden to public
        return !cmd.fromMe; // default: only public commands
      });

      // Group by category
      const categories = {};
      visibleCommands.forEach((cmd) => {
        const rawType = (cmd.type || 'general').toLowerCase();
        if (!categories[rawType]) categories[rawType] = [];
        categories[rawType].push(cmd);
      });

      // Stats
      const uptimeStr = formatUptime(process.uptime());
      const botName = 'THARUUX-MD';
      const roleBadge = isOwner ? 'Owner / Sudo' : 'Public User';
      const modeText = chatState?.prefixRequired === false ? 'Optional' : 'Strict';

      let menu =
        `*${font(botName)}* • ${font('Command Menu')}\n\n` +
        `• *${font('User')}* : ${m.pushName || 'User'}\n` +
        `• *${font('Role')}* : ${isOwner ? '👑 ' : '👤 '}${font(roleBadge)}\n` +
        `• *${font('Prefix')}* : \`${effectivePrefix}\` (${font(modeText)})\n` +
        `• *${font('Uptime')}* : ${uptimeStr}\n` +
        `• *${font('Commands')}* : ${visibleCommands.length}\n\n`;

      // Order categories nicely
      const categoryOrder = [
        'downloader', 'download', 'media', 'group', 'tools',
        'utilities', 'anime', 'fun', 'game', 'audio',
        'converter', 'logo', 'privacy', 'owner', 'main'
      ];

      const processedCats = new Set();

      for (const catKey of [...categoryOrder, ...Object.keys(categories)]) {
        if (processedCats.has(catKey)) continue;
        processedCats.add(catKey);

        const list = categories[catKey];
        if (!list || list.length === 0) continue;

        // Don't show owner category to public users
        if (!isOwner && catKey === 'owner') continue;

        const meta = CATEGORY_META[catKey] || { title: catKey.toUpperCase(), emoji: '✨' };
        menu += `*${meta.emoji} ${font(meta.title)}*\n`;

        // Sort commands alphabetically
        const sorted = list.sort((a, b) => a.command.localeCompare(b.command));
        sorted.forEach((c) => {
          const ownerTag = c.fromMe ? ' 🔒' : '';
          menu += `• \`${effectivePrefix}${c.command}\`${ownerTag}\n`;
        });

        menu += `\n`;
      }

      menu +=
        `• *${font('Guide')}* : \`${effectivePrefix}guide <command>\`\n` +
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
            caption: menu,
          },
          { quoted: m.data || m }
        );
      } else {
        await m.reply(menu);
      }
    } catch (err) {
      console.error('Menu error:', err);
      m.reply(`❌ *Failed to generate menu:*\n\`\`\`${err.message}\`\`\`\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
    }
  }
);

// ── COMPREHENSIVE GUIDE COMMAND ────────────────
pnix(
  {
    command: 'guide',
    alias: ['manual', 'howtouse', 'cmdhelp'],
    desc: 'Display detailed command instructions, syntax, examples, and permissions.',
    type: 'main',
    fromMe: false, // Accessible by everyone
  },
  async (m, args, client) => {
    try {
      const isOwner = Boolean(m.isOwner || m.fromMe);
      const userId = resolveUserId(client);
      const chatState = userId ? multiBotManager.getBotChatState(userId) : null;
      const effectivePrefix = (chatState && chatState.customPrefix !== undefined && chatState.customPrefix !== null)
        ? chatState.customPrefix
        : '.';

      const query = (args || '').trim().toLowerCase().replace(/^[.!#/?]/, '');

      // ── Overview Guide if no argument provided ──
      if (!query) {
        const guideText =
          `*${font('Command Usage Guide')}*\n\n` +
          `• *${font('Lookup')}* : \`${effectivePrefix}guide <command>\`\n` +
          `• *${font('Example')}* : \`${effectivePrefix}guide vv\`\n` +
          `• *${font('Example')}* : \`${effectivePrefix}guide getdp\`\n` +
          `• *${font('Example')}* : \`${effectivePrefix}guide bot\`\n\n` +
          `*${font('Popular Guides')}*\n` +
          `• \`${effectivePrefix}guide vv\` — Anti-ViewOnce revealer\n` +
          `• \`${effectivePrefix}guide getdp\` — HD Profile Picture downloader\n` +
          `• \`${effectivePrefix}guide bot\` — Granular chat on/off control\n` +
          `• \`${effectivePrefix}guide prefix\` — Strict vs optional prefix\n` +
          `• \`${effectivePrefix}guide addsudo\` — Authorize co-owners\n` +
          `• \`${effectivePrefix}guide cmdmode\` — Custom command permissions\n` +
          `• \`${effectivePrefix}guide antidelete\` — Revoked message catcher\n` +
          `• \`${effectivePrefix}guide fb\` — Facebook video downloader\n` +
          `• \`${effectivePrefix}guide insta\` — Instagram reels downloader\n` +
          `• \`${effectivePrefix}guide tiktok\` — TikTok watermark-free\n` +
          `• \`${effectivePrefix}guide sticker\` — Convert photo/video to sticker\n` +
          `• \`${effectivePrefix}guide tagall\` — Mention everyone in group\n\n` +
          `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`;

        return await m.reply(guideText);
      }

      // Check if we have a curated rich guide
      const richGuide = DETAILED_GUIDES[query];
      if (richGuide) {
        let text =
          `*${font('Guide')}* • *${font(richGuide.title)}*\n\n` +
          `• *${font('Description')}* : ${richGuide.desc}\n` +
          `• *${font('Permission')}* : ${richGuide.permission}\n` +
          `• *${font('Usage')}* : ${richGuide.usage}\n`;

        if (richGuide.aliases && richGuide.aliases.length > 0) {
          text += `• *${font('Aliases')}* : ${richGuide.aliases.map((a) => `\`${effectivePrefix}${a}\``).join(', ')}\n`;
        }

        if (richGuide.examples && richGuide.examples.length > 0) {
          text += `\n*${font('Examples')}*\n`;
          richGuide.examples.forEach((ex) => {
            text += `• \`${ex}\`\n`;
          });
        }

        if (richGuide.notes) {
          text += `\n• *${font('Note')}* : ${richGuide.notes}\n`;
        }

        text += `\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`;
        return m.reply(text);
      }

      // Dynamic lookup in all registered commands
      const allCommands = event.commands || [];
      const found = allCommands.find(
        (c) => c.command === query || (Array.isArray(c.alias) && c.alias.includes(query))
      );

      if (!found) {
        return m.reply(
          `❌ *Command \`${query}\` not found.*\n\n` +
          `Type *${effectivePrefix}menu* to view all available commands,\n` +
          `or *${effectivePrefix}guide* for popular feature guides.\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
        );
      }

      // Format dynamic command guide
      const customOverrides = chatState?.customCommandAccess || {};
      const customAccess = customOverrides[found.command?.toLowerCase()];
      const isOwnerCmd = customAccess === 'owner' ? true : (customAccess === 'public' ? false : Boolean(found.fromMe));
      const permBadge = isOwnerCmd ? '🔒 Owner / Sudo Only' : '🌐 Public (Everyone)';
      const meta = CATEGORY_META[found.type] || { title: (found.type || 'GENERAL').toUpperCase(), emoji: '⚡' };
      const aliasesStr = (found.alias && found.alias.length > 0)
        ? found.alias.map((a) => `\`${effectivePrefix}${a}\``).join(', ')
        : 'None';

      const guideText =
        `*${font('Command')}* • \`${effectivePrefix}${found.command}\`\n\n` +
        `• *${font('Category')}* : ${meta.emoji} ${font(meta.title)}\n` +
        `• *${font('Permission')}* : ${permBadge}\n` +
        `• *${font('Aliases')}* : ${aliasesStr}\n` +
        `• *${font('Description')}* : ${found.desc || 'No description provided.'}\n\n` +
        `*${font('Usage')}*\n` +
        `• Type \`${effectivePrefix}${found.command}\` in chat\n` +
        (found.onlyGroup ? `• ⚠️ *${font('Restriction')}*: Works only in WhatsApp groups.\n` : '') +
        `\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`;

      return m.reply(guideText);
    } catch (err) {
      console.error('Guide error:', err);
      return m.reply(`❌ *Failed to fetch command guide:*\n\`\`\`${err.message}\`\`\`\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
    }
  }
);
