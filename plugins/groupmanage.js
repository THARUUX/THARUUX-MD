// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Group Management Plugin
//   Commands: tagall, hidetag, warn, warnings, clearwarn,
//             antilink, antibadword, antidelete, mute, unmute,
//             kick, promote, demote, groupinfo, resetlink
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { pnix, mode } = require('../lib');
const fs = require('fs');
const path = require('path');

// Simple in-memory stores (survive until bot restart; Fly.io volume keeps sessions)
const warningsStore = {};   // { groupJid: { userJid: count } }
const antilinkGroups = new Set();    // group JIDs with antilink ON
const antibadwordGroups = new Set(); // group JIDs with antibadword ON
const mutedGroups = new Set();       // group JIDs that are muted

// Helper: get group metadata safely
async function getGroupMeta(client, jid) {
  try { return await client.groupMetadata(jid); } catch { return null; }
}

// Helper: resolve target to matching participant JID in group (resolves LID <-> Phone Number)
function resolveParticipantJid(meta, targetJid) {
  if (!targetJid || !meta || !meta.participants) return targetJid;
  const cleanTarget = String(targetJid).split('@')[0].split(':')[0];
  const participant = meta.participants.find(p => {
    const pClean = (p.id || '').split('@')[0].split(':')[0];
    const lidClean = (p.lid || '').split('@')[0].split(':')[0];
    const jidClean = (p.jid || '').split('@')[0].split(':')[0];
    const pnClean = (p.phoneNumber || '').split('@')[0].split(':')[0];
    return p.id === targetJid || p.lid === targetJid ||
      (cleanTarget && (pClean === cleanTarget || lidClean === cleanTarget || jidClean === cleanTarget || pnClean === cleanTarget));
  });
  return participant?.id || targetJid;
}

// Helper: check if sender is group admin (LID and Phone JID aware)
async function isGroupAdmin(client, groupJid, senderJid, m = null) {
  // Bot owner or self always passes
  if (m && (m.isOwner || m.fromMe)) return true;

  const botPhone = client.user?.id ? client.user.id.split('@')[0].split(':')[0] : '';
  const botLid = client.user?.lid ? client.user.lid.split('@')[0].split(':')[0] : '';
  const senderClean = (senderJid || '').split('@')[0].split(':')[0];

  if (botPhone && senderClean && botPhone === senderClean) return true;
  if (botLid && senderClean && botLid === senderClean) return true;

  const meta = await getGroupMeta(client, groupJid);
  if (!meta || !meta.participants) return false;

  // Build candidate IDs for the sender
  const targetIds = new Set();
  const addId = (jid) => {
    if (jid && typeof jid === 'string') {
      targetIds.add(jid.toLowerCase());
      const clean = jid.split('@')[0].split(':')[0].toLowerCase();
      if (clean) targetIds.add(clean);
    }
  };

  addId(senderJid);
  if (m?.senderPn) addId(m.senderPn);

  // If LID, attempt to resolve PN from Signal store
  if (senderJid && senderJid.includes('@lid')) {
    try {
      const pn = await client?.signalRepository?.lidMapping?.getPNForLID(senderJid);
      if (pn) addId(pn);
    } catch {}
  }
  // If PN, attempt to resolve LID from Signal store
  if (senderJid && senderJid.includes('@s.whatsapp.net')) {
    try {
      const lid = await client?.signalRepository?.lidMapping?.getLIDForPN(senderJid);
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
}

// Helper: check if bot itself is admin
async function isBotAdmin(client, groupJid) {
  const meta = await getGroupMeta(client, groupJid);
  if (!meta || !meta.participants) return false;

  const botIds = new Set();
  const addId = (jid) => {
    if (jid && typeof jid === 'string') {
      botIds.add(jid.toLowerCase());
      const clean = jid.split('@')[0].split(':')[0].toLowerCase();
      if (clean) botIds.add(clean);
    }
  };

  addId(client.user?.id);
  addId(client.user?.lid);

  if (client.user?.id?.includes('@s.whatsapp.net')) {
    try {
      const lid = await client?.signalRepository?.lidMapping?.getLIDForPN(client.user.id);
      if (lid) addId(lid);
    } catch {}
  }
  if (client.user?.lid?.includes('@lid')) {
    try {
      const pn = await client?.signalRepository?.lidMapping?.getPNForLID(client.user.lid);
      if (pn) addId(pn);
    } catch {}
  }

  return meta.participants.some(p => {
    if (p.admin !== 'admin' && p.admin !== 'superadmin') return false;
    const candidates = [p.id, p.lid, p.jid, p.phoneNumber];
    return candidates.some(cand => {
      if (!cand || typeof cand !== 'string') return false;
      const lower = cand.toLowerCase();
      const clean = cand.split('@')[0].split(':')[0].toLowerCase();
      return botIds.has(lower) || botIds.has(clean);
    });
  });
}

// ── TAG ALL ───────────────────────────────────
pnix(
  { command: 'tagall', alias: ['everyone', 'all'], desc: 'Tag all group members (admin only)', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Only group admins can use this command.');

    const meta = await getGroupMeta(client, m.chat);
    if (!meta) return m.reply('❌ Failed to fetch group info.');

    const members = meta.participants;
    const customMsg = args.trim() || '📢 Attention everyone!';
    let text = `${customMsg}\n\n`;
    members.forEach(p => {
      const num = (p.phoneNumber || p.id).split('@')[0].split(':')[0];
      text += `@${num}\n`;
    });

    await client.sendMessage(m.chat, {
      text,
      mentions: members.map(p => p.id),
    }, { quoted: m.data || m });
  }
);

// ── HIDETAG (silent tag all) ──────────────────
pnix(
  { command: 'hidetag', alias: ['htag'], desc: 'Tag all members silently (admin only)', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    const meta = await getGroupMeta(client, m.chat);
    if (!meta) return m.reply('❌ Failed to fetch group info.');
    const text = args.trim() || '📌 Notice';
    await client.sendMessage(m.chat, {
      text,
      mentions: meta.participants.map(p => p.id),
    }, { quoted: m.data || m });
  }
);

// ── WARN ──────────────────────────────────────
pnix(
  { command: 'warn', desc: 'Warn a tagged member (admin only). Usage: .warn @user <reason>', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    if (!await isBotAdmin(client, m.chat)) return m.reply('❌ Bot must be an admin to warn members.');

    const meta = await getGroupMeta(client, m.chat);
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let target = mentioned[0] || m.quoted?.sender || m.reply_message?.sender;
    if (meta && target) target = resolveParticipantJid(meta, target);
    if (!target) return m.reply('❌ Tag a user or reply to their message.\nUsage: *.warn @user <reason>*');

    const reason = args.replace(/@\d+/g, '').trim() || 'No reason provided';
    const groupKey = m.chat;
    if (!warningsStore[groupKey]) warningsStore[groupKey] = {};
    const targetClean = target.split('@')[0].split(':')[0];
    warningsStore[groupKey][target] = (warningsStore[groupKey][target] || warningsStore[groupKey][targetClean] || 0) + 1;
    warningsStore[groupKey][targetClean] = warningsStore[groupKey][target];
    const count = warningsStore[groupKey][target];
    const MAX_WARNS = 3;

    await client.sendMessage(m.chat, {
      text: `⚠️ *Warning ${count}/${MAX_WARNS}*\n\n@${targetClean} has been warned!\n*Reason:* ${reason}${count >= MAX_WARNS ? '\n\n🔴 Maximum warnings reached — taking action!' : ''}`,
      mentions: [target],
    }, { quoted: m.data || m });

    if (count >= MAX_WARNS) {
      try {
        await client.groupParticipantsUpdate(m.chat, [target], 'remove');
        warningsStore[groupKey][target] = 0;
        warningsStore[groupKey][targetClean] = 0;
      } catch (e) { await m.reply('❌ Could not remove member. Check bot permissions.'); }
    }
  }
);

// ── WARNINGS (view count) ─────────────────────
pnix(
  { command: 'warnings', alias: ['warnlist'], desc: 'Check warnings for a member. Usage: .warnings @user', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    const meta = await getGroupMeta(client, m.chat);
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let target = mentioned[0] || m.quoted?.sender || m.reply_message?.sender || m.sender;
    if (meta && target) target = resolveParticipantJid(meta, target);
    const targetClean = target.split('@')[0].split(':')[0];
    const count = warningsStore[m.chat]?.[target] || warningsStore[m.chat]?.[targetClean] || 0;
    return m.reply(`⚠️ *Warnings for @${targetClean}*: ${count}/3`);
  }
);

// ── CLEAR WARNINGS ────────────────────────────
pnix(
  { command: 'clearwarn', alias: ['resetwarn'], desc: 'Clear warnings for a member (admin only)', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    const meta = await getGroupMeta(client, m.chat);
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let target = mentioned[0] || m.quoted?.sender || m.reply_message?.sender;
    if (meta && target) target = resolveParticipantJid(meta, target);
    if (!target) return m.reply('❌ Tag or reply to a member.');
    const targetClean = target.split('@')[0].split(':')[0];
    if (warningsStore[m.chat]) {
      warningsStore[m.chat][target] = 0;
      warningsStore[m.chat][targetClean] = 0;
    }
    return m.reply(`✅ Warnings cleared for @${targetClean}.`);
  }
);

// ── KICK ──────────────────────────────────────
pnix(
  { command: 'kick', alias: ['remove'], desc: 'Remove a member from group (admin only)', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    if (!await isBotAdmin(client, m.chat)) return m.reply('❌ Bot must be admin to kick members.');
    const meta = await getGroupMeta(client, m.chat);
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let target = mentioned[0] || m.quoted?.sender || m.reply_message?.sender;
    if (meta && target) target = resolveParticipantJid(meta, target);
    if (!target) return m.reply('❌ Tag or reply to a member to kick.');
    try {
      await client.groupParticipantsUpdate(m.chat, [target], 'remove');
      return m.reply(`✅ @${target.split('@')[0].split(':')[0]} has been removed from the group.`);
    } catch { return m.reply('❌ Failed to kick member.'); }
  }
);

// ── PROMOTE ───────────────────────────────────
pnix(
  { command: 'promote', desc: 'Promote a member to admin (admin only)', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    if (!await isBotAdmin(client, m.chat)) return m.reply('❌ Bot must be admin.');
    const meta = await getGroupMeta(client, m.chat);
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let target = mentioned[0] || m.quoted?.sender || m.reply_message?.sender;
    if (meta && target) target = resolveParticipantJid(meta, target);
    if (!target) return m.reply('❌ Tag or reply to a member.');
    try {
      await client.groupParticipantsUpdate(m.chat, [target], 'promote');
      return m.reply(`✅ @${target.split('@')[0].split(':')[0]} has been promoted to admin.`);
    } catch { return m.reply('❌ Failed to promote member.'); }
  }
);

// ── DEMOTE ────────────────────────────────────
pnix(
  { command: 'demote', desc: 'Demote an admin to member (admin only)', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    if (!await isBotAdmin(client, m.chat)) return m.reply('❌ Bot must be admin.');
    const meta = await getGroupMeta(client, m.chat);
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let target = mentioned[0] || m.quoted?.sender || m.reply_message?.sender;
    if (meta && target) target = resolveParticipantJid(meta, target);
    if (!target) return m.reply('❌ Tag or reply to a member.');
    try {
      await client.groupParticipantsUpdate(m.chat, [target], 'demote');
      return m.reply(`✅ @${target.split('@')[0].split(':')[0]} has been demoted to member.`);
    } catch { return m.reply('❌ Failed to demote member.'); }
  }
);

// ── MUTE (restrict non-admins from messaging) ─
pnix(
  { command: 'mute', desc: 'Mute the group (only admins can send messages)', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    if (!await isBotAdmin(client, m.chat)) return m.reply('❌ Bot must be admin.');
    try {
      await client.groupSettingUpdate(m.chat, 'announcement');
      mutedGroups.add(m.chat);
      return m.reply('🔇 Group has been *muted*. Only admins can send messages now.');
    } catch { return m.reply('❌ Failed to mute group.'); }
  }
);

// ── UNMUTE ────────────────────────────────────
pnix(
  { command: 'unmute', desc: 'Unmute the group (all members can send messages)', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    if (!await isBotAdmin(client, m.chat)) return m.reply('❌ Bot must be admin.');
    try {
      await client.groupSettingUpdate(m.chat, 'not_announcement');
      mutedGroups.delete(m.chat);
      return m.reply('🔊 Group has been *unmuted*. All members can now send messages.');
    } catch { return m.reply('❌ Failed to unmute group.'); }
  }
);

// ── GROUP INFO ────────────────────────────────
pnix(
  { command: 'groupinfo', alias: ['ginfo', 'gcinfo'], desc: 'Get detailed group information', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    const meta = await getGroupMeta(client, m.chat);
    if (!meta) return m.reply('❌ Failed to fetch group info.');

    const adminParticipants = meta.participants.filter(p => p.admin);
    const admins = adminParticipants.map(p => {
      const num = (p.phoneNumber || p.id).split('@')[0].split(':')[0];
      return `@${num}`;
    }).join(', ') || 'None';
    const created = meta.creation ? new Date(meta.creation * 1000).toLocaleDateString() : 'Unknown';

    return await client.sendMessage(m.chat, {
      text: `*📋 Group Info*\n\n` +
      `*Name:* ${meta.subject}\n` +
      `*Description:* ${meta.desc || 'No description'}\n` +
      `*Members:* ${meta.participants.length}\n` +
      `*Admins:* ${admins}\n` +
      `*Created:* ${created}\n` +
      `*ID:* ${m.chat}`,
      mentions: adminParticipants.map(p => p.id),
    }, { quoted: m.data || m });
  }
);

// ── RESET INVITE LINK ─────────────────────────
pnix(
  { command: 'resetlink', alias: ['revoke'], desc: 'Reset the group invite link (admin only)', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    if (!await isBotAdmin(client, m.chat)) return m.reply('❌ Bot must be admin.');
    try {
      const newCode = await client.groupRevokeInvite(m.chat);
      return m.reply(`✅ Group invite link has been reset.\n\n🔗 New link: https://chat.whatsapp.com/${newCode}`);
    } catch { return m.reply('❌ Failed to reset invite link.'); }
  }
);

// ── ANTILINK (in-memory, per bot runtime) ─────
pnix(
  { command: 'antilink', desc: 'Enable/disable antilink in group. Usage: .antilink on/off', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    const action = args.trim().toLowerCase();
    if (action === 'on') {
      antilinkGroups.add(m.chat);
      return m.reply('✅ *Antilink is ON* — WhatsApp links will be deleted and the sender warned.');
    } else if (action === 'off') {
      antilinkGroups.delete(m.chat);
      return m.reply('✅ *Antilink is OFF*.');
    } else {
      return m.reply(`*🔗 Antilink Status:* ${antilinkGroups.has(m.chat) ? '✅ ON' : '❌ OFF'}\n\nUsage: *.antilink on/off*`);
    }
  }
);

// ── ANTIBADWORD ───────────────────────────────
pnix(
  { command: 'antibadword', alias: ['antiswear'], desc: 'Enable/disable bad word filter. Usage: .antibadword on/off', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    const action = args.trim().toLowerCase();
    if (action === 'on') {
      antibadwordGroups.add(m.chat);
      return m.reply('✅ *Anti-Bad Word is ON* — messages with profanity will be deleted.');
    } else if (action === 'off') {
      antibadwordGroups.delete(m.chat);
      return m.reply('✅ *Anti-Bad Word is OFF*.');
    } else {
      return m.reply(`*🚫 Anti-Bad Word:* ${antibadwordGroups.has(m.chat) ? '✅ ON' : '❌ OFF'}\n\nUsage: *.antibadword on/off*`);
    }
  }
);

// ── Message listener for Antilink & Antibadword ─
pnix({ on: 'text' }, async (m, text, client) => {
  if (!m.chat.endsWith('@g.us')) return; // groups only

  const hasLink = /https?:\/\/[^\s]+|wa\.me\/\w+|chat\.whatsapp\.com\/\w+/i.test(text);
  const hasBadWord = /\b(fuck|shit|bitch|asshole|bastard|cunt)\b/i.test(text);

  if (antilinkGroups.has(m.chat) && hasLink) {
    if (await isGroupAdmin(client, m.chat, m.sender, m)) return; // don't delete admin messages
    try {
      await client.sendMessage(m.chat, { delete: m.data?.key });
      await client.sendMessage(m.chat, {
        text: `⚠️ @${m.sender.split('@')[0].split(':')[0]}, links are not allowed in this group!`,
        mentions: [m.sender],
      });
    } catch {}
  }

  if (antibadwordGroups.has(m.chat) && hasBadWord) {
    if (await isGroupAdmin(client, m.chat, m.sender, m)) return;
    try {
      await client.sendMessage(m.chat, { delete: m.data?.key });
      await client.sendMessage(m.chat, {
        text: `⚠️ @${m.sender.split('@')[0].split(':')[0]}, please keep your language clean!`,
        mentions: [m.sender],
      });
    } catch {}
  }
});
