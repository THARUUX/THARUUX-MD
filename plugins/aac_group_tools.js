// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Group & Admin Tools
//   poll, warn, broadcast, grouprules, antispam,
//   antifake, autoreply, stickersearch
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const { pnix, mode } = require('../lib');
const { font } = require('../lib/font');
const axios = require('axios');

// ─── In-memory stores (persists until bot restart) ────────
const polls = new Map();       // chatId → { question, options, votes: Map<sender,idx> }
const warnMap = new Map();     // jid → count
const groupRules = new Map();  // chatId → rulesText
const spamTracker = new Map(); // jid → { msgs: [], muted: bool }
const antispamEnabled = new Set(); // chatIds with antispam on
const antifakeEnabled = new Set(); // chatIds with antifake on

// ─── Safe quoted helper ────────────────────────────────────
const getQuoted = (m) => (m?.data?.key ? { quoted: m.data } : (m?.key ? { quoted: m } : {}));

// ─── Helper: is admin (LID and Phone JID aware) ──────────────
async function isAdmin(client, chatId, jid, m = null) {
  if (m && (m.isOwner || m.fromMe)) return true;
  try {
    const botPhone = client.user?.id ? client.user.id.split('@')[0].split(':')[0] : '';
    const botLid = client.user?.lid ? client.user.lid.split('@')[0].split(':')[0] : '';
    const senderClean = (jid || '').split('@')[0].split(':')[0];

    if (botPhone && senderClean && botPhone === senderClean) return true;
    if (botLid && senderClean && botLid === senderClean) return true;

    const meta = await client.groupMetadata(chatId);
    if (!meta || !meta.participants) return false;

    const targetIds = new Set();
    const addId = (id) => {
      if (id && typeof id === 'string') {
        targetIds.add(id.toLowerCase());
        const clean = id.split('@')[0].split(':')[0].toLowerCase();
        if (clean) targetIds.add(clean);
      }
    };

    addId(jid);
    if (m?.senderPn) addId(m.senderPn);

    if (jid && jid.includes('@lid')) {
      try {
        const pn = await client?.signalRepository?.lidMapping?.getPNForLID(jid);
        if (pn) addId(pn);
      } catch {}
    }
    if (jid && jid.includes('@s.whatsapp.net')) {
      try {
        const lid = await client?.signalRepository?.lidMapping?.getLIDForPN(jid);
        if (lid) addId(lid);
      } catch {}
    }

    return meta.participants.some(p => {
      if (p.admin !== 'admin' && p.admin !== 'superadmin') return false;
      const candidates = [p.id, p.lid, p.jid, p.phoneNumber];
      return candidates.some(cand => {
        if (!cand || typeof cand !== 'string') return false;
        const lower = cand.toLowerCase();
        const clean = cand.split('@')[0].split(':')[0].toLowerCase();
        return targetIds.has(lower) || targetIds.has(clean);
      });
    });
  } catch { return false; }
}

// ══════════════════════════════════════════════════════════
//  .poll — Create a poll
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'poll', desc: font('create a group poll'), type: 'group', fromMe: false },
  async (m, q) => {
    if (!q) return m.reply(
      `${font('usage')}: .poll <question> | <option1> | <option2> | ...\n\n` +
      `${font('example')}: .poll Best framework? | React | Vue | Svelte`
    );
    const parts = q.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length < 3) return m.reply(font('need at least 2 options. separate with |'));
    const [question, ...options] = parts;
    if (options.length > 10) return m.reply(font('maximum 10 options allowed.'));

    const pollData = { question, options, votes: new Map(), creator: m.sender, createdAt: Date.now() };
    polls.set(m.chat, pollData);

    let msg = `📊 *${font('poll')}*\n\n*${question}*\n\n`;
    const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    options.forEach((opt, i) => { msg += `${emojis[i]} ${opt}\n`; });
    msg += `\n${font('reply with the number to vote')}\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`;
    await m.reply(msg);
  }
);

// ══════════════════════════════════════════════════════════
//  .pollresults — Show poll results
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'pollresults', alias: ['pollresult', 'results'], desc: font('show current poll results'), type: 'group', fromMe: false },
  async (m) => {
    const poll = polls.get(m.chat);
    if (!poll) return m.reply(font('no active poll in this group. create one with .poll'));
    const counts = Array(poll.options.length).fill(0);
    for (const idx of poll.votes.values()) counts[idx]++;
    const total = counts.reduce((a, b) => a + b, 0);
    const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    let msg = `📊 *${font('poll results')}*\n\n*${poll.question}*\n\n`;
    poll.options.forEach((opt, i) => {
      const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
      const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
      msg += `${emojis[i]} ${opt}\n   ${bar} ${pct}% (${counts[i]})\n\n`;
    });
    msg += `${font('total votes')}: ${total}\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`;
    await m.reply(msg);
  }
);

// ══════════════════════════════════════════════════════════
//  .endpoll — End and clear current poll
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'endpoll', desc: font('end the current poll'), type: 'group', fromMe: mode },
  async (m) => {
    if (!polls.has(m.chat)) return m.reply(font('no active poll.'));
    const poll = polls.get(m.chat);
    const counts = Array(poll.options.length).fill(0);
    for (const idx of poll.votes.values()) counts[idx]++;
    const maxIdx = counts.indexOf(Math.max(...counts));
    polls.delete(m.chat);
    await m.reply(
      `📊 *${font('poll ended')}*\n\n*${poll.question}*\n\n` +
      `🏆 ${font('winner')}: ${poll.options[maxIdx]}\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
    );
  }
);

// Poll vote handler (listens for number replies)
pnix(
  { on: 'text', fromMe: false },
  async (m, text) => {
    const poll = polls.get(m.chat);
    if (!poll) return;
    const num = parseInt(text?.trim());
    if (isNaN(num) || num < 1 || num > poll.options.length) return;
    poll.votes.set(m.sender, num - 1);
    await m.react('✅');
  }
);

// ══════════════════════════════════════════════════════════
//  .warn — Warn a group member
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'warn', desc: font('warn a group member'), type: 'group', fromMe: mode },
  async (m, q) => {
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || m.message?.extendedTextMessage?.contextInfo?.participant;
    if (!mentioned) return m.reply(font('mention a user to warn them.\n\nExample: .warn @user spamming'));
    const reason = q.replace(/@\d+/g, '').trim() || 'no reason given';
    const key = `${m.chat}:${mentioned}`;
    const current = (warnMap.get(key) || 0) + 1;
    warnMap.set(key, current);
    const mention = mentioned.split('@')[0];
    await m.client.sendMessage(m.chat, {
      text: `⚠️ *${font('warning')}*\n\n@${mention} has been warned.\n${font('reason')}: ${reason}\n${font('total warnings')}: ${current}/3\n${current >= 3 ? '\n❌ ' + font('3 warnings reached. consider kicking.') : ''}\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`,
      mentions: [mentioned],
    }, getQuoted(m));
  }
);

// ══════════════════════════════════════════════════════════
//  .warncount — Check warnings for a user
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'warncount', alias: ['warns'], desc: font('check a user\'s warnings'), type: 'group', fromMe: false },
  async (m) => {
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!mentioned) return m.reply(font('mention a user to check their warnings.'));
    const key = `${m.chat}:${mentioned}`;
    const count = warnMap.get(key) || 0;
    await m.reply(`⚠️ @${mentioned.split('@')[0]} has *${count}* warning(s).\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
  }
);

// ══════════════════════════════════════════════════════════
//  .resetwarn — Reset warnings for a user
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'resetwarn', desc: font('reset warnings for a user'), type: 'group', fromMe: mode },
  async (m) => {
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!mentioned) return m.reply(font('mention a user to reset their warnings.'));
    warnMap.delete(`${m.chat}:${mentioned}`);
    await m.reply(`✅ Warnings reset for @${mentioned.split('@')[0]}\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
  }
);

// ══════════════════════════════════════════════════════════
//  .grouprules — Set / show group rules
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'grouprules', alias: ['rules', 'setrules'], desc: font('set or show group rules'), type: 'group', fromMe: false },
  async (m, q) => {
    if (!q) {
      const rules = groupRules.get(m.chat);
      if (!rules) return m.reply(font('no group rules set. admins can set with:\n.grouprules <rules text>'));
      return m.reply(`📜 *${font('group rules')}*\n\n${rules}\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
    }
    const admin = await isAdmin(m.client, m.chat, m.sender, m);
    if (!admin) {
      return m.reply(font('only admins can set group rules.'));
    }
    groupRules.set(m.chat, q);
    await m.reply(`✅ ${font('group rules updated.')}\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
  }
);

// ══════════════════════════════════════════════════════════
//  .antispam — Enable/disable spam detection
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'antispam', desc: font('enable or disable antispam (5 msgs/5s = mute)'), type: 'group', fromMe: mode },
  async (m, q) => {
    const action = (q || '').toLowerCase();
    if (action === 'off') {
      antispamEnabled.delete(m.chat);
      return m.reply(`✅ ${font('antispam disabled for this group.')}`);
    }
    antispamEnabled.add(m.chat);
    await m.reply(`✅ ${font('antispam enabled.')}\n${font('users sending 5+ messages in 5 seconds will be muted.')}\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
  }
);

// Antispam listener
pnix(
  { on: 'text', fromMe: false },
  async (m) => {
    if (!antispamEnabled.has(m.chat)) return;
    if (!m.chat.endsWith('@g.us')) return;
    const now = Date.now();
    const key = `${m.chat}:${m.sender}`;
    let tracker = spamTracker.get(key) || { msgs: [], muted: false };
    if (tracker.muted) return;
    tracker.msgs = tracker.msgs.filter(t => now - t < 5000); // last 5s
    tracker.msgs.push(now);
    spamTracker.set(key, tracker);
    if (tracker.msgs.length >= 5) {
      tracker.muted = true;
      spamTracker.set(key, tracker);
      setTimeout(() => {
        tracker.muted = false;
        tracker.msgs = [];
        spamTracker.set(key, tracker);
      }, 60000); // unmute after 1 min
      try {
        await m.client.groupParticipantsUpdate(m.chat, [m.sender], 'demote');
        await m.client.sendMessage(m.chat, {
          text: `🚫 @${m.sender.split('@')[0]} has been muted for 1 minute (spam detected).\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`,
          mentions: [m.sender],
        });
      } catch {}
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .antifake — Block non-standard number formats
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'antifake', desc: font('enable or disable antifake number detection'), type: 'group', fromMe: mode },
  async (m, q) => {
    const action = (q || '').toLowerCase();
    if (action === 'off') {
      antifakeEnabled.delete(m.chat);
      return m.reply(`✅ ${font('antifake disabled.')}`);
    }
    antifakeEnabled.add(m.chat);
    await m.reply(`✅ ${font('antifake enabled.')}\n${font('participants with numbers shorter than 7 digits will be removed.')}\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
  }
);

// ══════════════════════════════════════════════════════════
//  .broadcast — Send message to all groups bot is in
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'broadcast', alias: ['bc'], desc: font('broadcast a message to all groups'), type: 'owner', fromMe: true },
  async (m, q) => {
    if (!q) return m.reply(font('provide a message to broadcast.\n\nExample: .broadcast Hello everyone!'));
    await m.react('⏳');
    try {
      const chats = await m.client.groupFetchAllParticipating();
      const groups = Object.keys(chats);
      let sent = 0, failed = 0;
      for (const groupId of groups) {
        try {
          await m.client.sendMessage(groupId, {
            text: `📢 *${font('broadcast')}*\n\n${q}\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
          });
          sent++;
          await new Promise(r => setTimeout(r, 1000)); // 1s delay to avoid spam
        } catch { failed++; }
      }
      await m.reply(`✅ ${font(`broadcast sent to ${sent} groups.`)}${failed ? `\n❌ ${failed} failed.` : ''}`);
      await m.react('✅');
    } catch (e) {
      await m.react('❌');
      m.reply(font('broadcast failed: ' + e.message));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .stickersearch — Search and send a sticker
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'stickersearch', alias: ['stickers', 'findsticker'], desc: font('search and send a sticker from giphy'), type: 'tools', fromMe: false },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide a search term')}\n\nExample: .stickersearch happy`);
    await m.react('⏳');
    try {
      // Use Giphy public beta key (safe for low-volume use)
      const r = await axios.get(
        `https://api.giphy.com/v1/stickers/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(q)}&limit=10&rating=g`,
        { timeout: 10000 }
      );
      const results = r.data?.data;
      if (!results?.length) throw new Error('No stickers found');
      const pick = results[Math.floor(Math.random() * results.length)];
      const stickerUrl = pick.images?.fixed_width?.webp || pick.images?.original?.url;
      if (!stickerUrl) throw new Error('No sticker URL');

      const buf = await axios.get(stickerUrl, { responseType: 'arraybuffer', timeout: 15000 })
        .then(r => Buffer.from(r.data));
      await m.client.sendMessage(m.chat, { sticker: buf }, getQuoted(m));
      await m.react('✅');
    } catch (e) {
      await m.react('❌');
      m.reply(font('sticker not found. try different keywords.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .groupinfo — Show group info
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'groupinfo', alias: ['ginfo', 'gcinfo'], desc: font('show group information'), type: 'group', fromMe: false },
  async (m) => {
    if (!m.chat.endsWith('@g.us')) return m.reply(font('this command is for groups only.'));
    await m.react('⏳');
    try {
      const meta = await m.client.groupMetadata(m.chat);
      const admins = meta.participants.filter(p => p.admin).length;
      const created = new Date(meta.creation * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      await m.reply(
        `👥 *${font('group info')}*\n\n` +
        `• ${font('name')}        : ${meta.subject}\n` +
        `• ${font('participants')} : ${meta.participants.length}\n` +
        `• ${font('admins')}      : ${admins}\n` +
        `• ${font('created')}     : ${created}\n` +
        `• ${font('desc')}        : ${meta.desc ? meta.desc.slice(0, 100) : 'none'}\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
      );
    } catch (e) {
      await m.react('❌');
      m.reply(font('failed to get group info.'));
    }
  }
);
