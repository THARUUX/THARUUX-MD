// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Group Management Plugin
//   Commands: tagall, hidetag, warn, warnings, clearwarn,
//             antilink, antibadword, antidelete, mute, unmute,
//             kick, promote, demote, groupinfo, resetlink
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { pnix, mode } = require('../lib');
const fs = require('fs');
const path = require('path');

const groupSec = require('../lib/groupSecurity');

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
  if (m && (m.isOwner || m.fromMe)) return true;

  const botPhone = client.user?.id ? client.user.id.split('@')[0].split(':')[0] : '';
  const botLid = client.user?.lid ? client.user.lid.split('@')[0].split(':')[0] : '';
  const senderClean = (senderJid || '').split('@')[0].split(':')[0];

  if (botPhone && senderClean && botPhone === senderClean) return true;
  if (botLid && senderClean && botLid === senderClean) return true;

  const meta = await getGroupMeta(client, groupJid);
  if (!meta || !meta.participants) return false;

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
    const targetClean = target.split('@')[0].split(':')[0];
    const count = groupSec.addWarning(m.chat, targetClean);
    const MAX_WARNS = 3;

    await client.sendMessage(m.chat, {
      text: `⚠️ *Warning ${count}/${MAX_WARNS}*\n\n@${targetClean} has been warned!\n*Reason:* ${reason}${count >= MAX_WARNS ? '\n\n🔴 Maximum warnings reached — removing member!' : ''}`,
      mentions: [target],
    }, { quoted: m.data || m });

    if (count >= MAX_WARNS) {
      try {
        await client.groupParticipantsUpdate(m.chat, [target], 'remove');
        groupSec.clearWarnings(m.chat, targetClean);
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
    const count = groupSec.getWarnings(m.chat, targetClean);
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
    groupSec.clearWarnings(m.chat, targetClean);
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

// ── ANTILINK ──────────────────────────────────
pnix(
  { command: 'antilink', desc: 'Configure Anti-Link filter. Usage: .antilink on/off/set delete|warn|kick', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    const parts = (args || '').trim().toLowerCase().split(/\s+/);
    const sub = parts[0];
    const val = parts[1];

    if (sub === 'on') {
      groupSec.updateGroupConfig(m.chat, (c) => { c.antilink.enabled = true; });
      const cfg = groupSec.getGroupConfig(m.chat);
      return m.reply(`✅ *Anti-Link is ON*\n\nAction: *${cfg.antilink.action.toUpperCase()}*\nWhatsApp & web links sent by non-admins will be intercepted.`);
    } else if (sub === 'off') {
      groupSec.updateGroupConfig(m.chat, (c) => { c.antilink.enabled = false; });
      return m.reply('✅ *Anti-Link is OFF*.');
    } else if (sub === 'set' || sub === 'action') {
      if (!['delete', 'warn', 'kick'].includes(val)) {
        return m.reply('❌ Invalid action. Choose: *delete*, *warn*, or *kick*.\nExample: *.antilink set kick*');
      }
      groupSec.updateGroupConfig(m.chat, (c) => { c.antilink.action = val; });
      return m.reply(`✅ *Anti-Link action set to: ${val.toUpperCase()}*`);
    } else {
      const cfg = groupSec.getGroupConfig(m.chat);
      return m.reply(
        `🔗 *Anti-Link Configuration*\n\n` +
        `• Status: *${cfg.antilink.enabled ? '✅ ON' : '❌ OFF'}*\n` +
        `• Action: *${cfg.antilink.action.toUpperCase()}*\n\n` +
        `*Commands:*\n` +
        `• *.antilink on* — enable protection\n` +
        `• *.antilink off* — disable protection\n` +
        `• *.antilink set delete* — delete link message\n` +
        `• *.antilink set warn* — warn user (3 warns = kick)\n` +
        `• *.antilink set kick* — kick immediately`
      );
    }
  }
);

// ── ANTIBADWORD ───────────────────────────────
pnix(
  { command: 'antibadword', alias: ['antiword', 'antiswear', 'noswear'], desc: 'Configure Anti-Badword filter. Usage: .antibadword on/off/set delete|warn|kick', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    const parts = (args || '').trim().toLowerCase().split(/\s+/);
    const sub = parts[0];
    const val = parts[1];

    if (sub === 'on') {
      groupSec.updateGroupConfig(m.chat, (c) => { c.antibadword.enabled = true; });
      const cfg = groupSec.getGroupConfig(m.chat);
      return m.reply(`✅ *Anti-Bad Word is ON*\n\nAction: *${cfg.antibadword.action.toUpperCase()}*\nMessages with profanity will be intercepted.`);
    } else if (sub === 'off') {
      groupSec.updateGroupConfig(m.chat, (c) => { c.antibadword.enabled = false; });
      return m.reply('✅ *Anti-Bad Word is OFF*.');
    } else if (sub === 'set' || sub === 'action') {
      if (!['delete', 'warn', 'kick'].includes(val)) {
        return m.reply('❌ Invalid action. Choose: *delete*, *warn*, or *kick*.\nExample: *.antibadword set warn*');
      }
      groupSec.updateGroupConfig(m.chat, (c) => { c.antibadword.action = val; });
      return m.reply(`✅ *Anti-Bad Word action set to: ${val.toUpperCase()}*`);
    } else {
      const cfg = groupSec.getGroupConfig(m.chat);
      return m.reply(
        `🚫 *Anti-Bad Word Configuration*\n\n` +
        `• Status: *${cfg.antibadword.enabled ? '✅ ON' : '❌ OFF'}*\n` +
        `• Action: *${cfg.antibadword.action.toUpperCase()}*\n` +
        `• Custom Words: *${cfg.antibadword.customWords?.length || 0} words*\n\n` +
        `*Commands:*\n` +
        `• *.antibadword on* — enable\n` +
        `• *.antibadword off* — disable\n` +
        `• *.antibadword set delete|warn|kick* — set action\n` +
        `• *.addword <word>* — add custom banned word\n` +
        `• *.delword <word>* — remove custom banned word\n` +
        `• *.badwords* — list custom banned words`
      );
    }
  }
);

pnix(
  { command: 'addword', alias: ['addban', 'banword'], desc: 'Add custom word to badword blacklist', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    const word = (args || '').trim().toLowerCase();
    if (!word) return m.reply('❌ Provide a word to ban.\nExample: *.addword spammer*');

    groupSec.updateGroupConfig(m.chat, (c) => {
      if (!c.antibadword.customWords) c.antibadword.customWords = [];
      if (!c.antibadword.customWords.includes(word)) {
        c.antibadword.customWords.push(word);
      }
    });
    return m.reply(`✅ Added *"${word}"* to the group banned words list.`);
  }
);

pnix(
  { command: 'delword', alias: ['delban', 'removeword'], desc: 'Remove word from badword blacklist', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    const word = (args || '').trim().toLowerCase();
    if (!word) return m.reply('❌ Provide a word to unban.\nExample: *.delword spammer*');

    groupSec.updateGroupConfig(m.chat, (c) => {
      if (!c.antibadword.customWords) c.antibadword.customWords = [];
      c.antibadword.customWords = c.antibadword.customWords.filter(w => w !== word);
    });
    return m.reply(`✅ Removed *"${word}"* from the group banned words list.`);
  }
);

pnix(
  { command: 'badwords', alias: ['badwordslist', 'banlist'], desc: 'List active custom banned words', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    const cfg = groupSec.getGroupConfig(m.chat);
    const list = cfg.antibadword.customWords || [];
    if (list.length === 0) {
      return m.reply('📜 No custom bad words added yet for this group.\n(Default common profanities are automatically covered when enabled).');
    }
    return m.reply(`📜 *Custom Banned Words (${list.length}):*\n\n` + list.map((w, i) => `${i + 1}. ${w}`).join('\n'));
  }
);

// ── ANTIFAKE (block virtual/foreign fake numbers) ──
pnix(
  { command: 'antifake', alias: ['antiface'], desc: 'Block fake / virtual country code numbers. Usage: .antifake on/off/action/addprefix', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    const parts = (args || '').trim().toLowerCase().split(/\s+/);
    const sub = parts[0];
    const val = parts[1];

    if (sub === 'on') {
      groupSec.updateGroupConfig(m.chat, (c) => { c.antifake.enabled = true; });
      const cfg = groupSec.getGroupConfig(m.chat);
      return m.reply(
        `✅ *Anti-Fake is ON*\n\n` +
        `• Action: *${cfg.antifake.action.toUpperCase()}*\n` +
        `• Blocked country prefixes: *+${cfg.antifake.prefixes.join(', +')}*\n\n` +
        `Any members joining or chatting with these prefixes will be intercepted.`
      );
    } else if (sub === 'off') {
      groupSec.updateGroupConfig(m.chat, (c) => { c.antifake.enabled = false; });
      return m.reply('✅ *Anti-Fake is OFF*.');
    } else if (sub === 'action' || sub === 'set') {
      if (!['kick', 'warn', 'delete'].includes(val)) {
        return m.reply('❌ Invalid action. Choose: *kick* or *warn*.\nExample: *.antifake action kick*');
      }
      groupSec.updateGroupConfig(m.chat, (c) => { c.antifake.action = val; });
      return m.reply(`✅ *Anti-Fake action set to: ${val.toUpperCase()}*`);
    } else if (sub === 'addprefix' || sub === 'add') {
      const rawPrefixes = (args || '').slice(sub.length).trim();
      if (!rawPrefixes) return m.reply('❌ Provide country code(s) to block. Example: *.antifake addprefix 1,212*');
      const cleanList = rawPrefixes.split(',').map(s => s.replace(/\D/g, '')).filter(Boolean);
      if (cleanList.length === 0) return m.reply('❌ Invalid country code prefix provided.');

      groupSec.updateGroupConfig(m.chat, (c) => {
        if (!c.antifake.prefixes) c.antifake.prefixes = [];
        cleanList.forEach(p => {
          if (!c.antifake.prefixes.includes(p)) c.antifake.prefixes.push(p);
        });
      });
      return m.reply(`✅ Added prefix(es): *+${cleanList.join(', +')}* to Anti-Fake blacklist.`);
    } else if (sub === 'delprefix' || sub === 'del') {
      const code = (val || '').replace(/\D/g, '');
      if (!code) return m.reply('❌ Provide country code to remove. Example: *.antifake delprefix 1*');
      groupSec.updateGroupConfig(m.chat, (c) => {
        if (!c.antifake.prefixes) c.antifake.prefixes = [];
        c.antifake.prefixes = c.antifake.prefixes.filter(p => p !== code);
      });
      return m.reply(`✅ Removed prefix *+${code}* from Anti-Fake.`);
    } else {
      const cfg = groupSec.getGroupConfig(m.chat);
      return m.reply(
        `🛡️ *Anti-Fake Number Configuration*\n\n` +
        `• Status: *${cfg.antifake.enabled ? '✅ ON' : '❌ OFF'}*\n` +
        `• Action: *${cfg.antifake.action.toUpperCase()}*\n` +
        `• Blocked Prefixes: *+${(cfg.antifake.prefixes || []).join(', +')}*\n\n` +
        `*Commands:*\n` +
        `• *.antifake on* — enable\n` +
        `• *.antifake off* — disable\n` +
        `• *.antifake action kick|warn* — set action\n` +
        `• *.antifake addprefix 1,212* — add country codes\n` +
        `• *.antifake delprefix 1* — remove country code`
      );
    }
  }
);

// ── ANTISPAM / ANTISPACE (anti-flood message limit) ──
pnix(
  { command: 'antispam', alias: ['antispace', 'antiflood'], desc: 'Configure Anti-Spam protection. Usage: .antispam on/off/action/limit', type: 'group', onlyGroup: true },
  async (m, args, client) => {
    if (!await isGroupAdmin(client, m.chat, m.sender, m)) return m.reply('❌ Admins only.');
    const parts = (args || '').trim().toLowerCase().split(/\s+/);
    const sub = parts[0];
    const val = parts[1];

    if (sub === 'on') {
      groupSec.updateGroupConfig(m.chat, (c) => { c.antispam.enabled = true; });
      const cfg = groupSec.getGroupConfig(m.chat);
      return m.reply(`✅ *Anti-Spam is ON*\n\nThreshold: *${cfg.antispam.limit} messages in ${cfg.antispam.window} seconds*\nAction: *${cfg.antispam.action.toUpperCase()}*`);
    } else if (sub === 'off') {
      groupSec.updateGroupConfig(m.chat, (c) => { c.antispam.enabled = false; });
      return m.reply('✅ *Anti-Spam is OFF*.');
    } else if (sub === 'action' || sub === 'set') {
      if (!['delete', 'warn', 'kick'].includes(val)) {
        return m.reply('❌ Invalid action. Choose: *delete*, *warn*, or *kick*.\nExample: *.antispam action warn*');
      }
      groupSec.updateGroupConfig(m.chat, (c) => { c.antispam.action = val; });
      return m.reply(`✅ *Anti-Spam action set to: ${val.toUpperCase()}*`);
    } else if (sub === 'limit') {
      const limit = parseInt(parts[1]);
      const windowSec = parseInt(parts[2]) || 5;
      if (!limit || limit < 2) return m.reply('❌ Limit must be at least 2 messages.\nExample: *.antispam limit 5 5* (5 msgs in 5s)');
      groupSec.updateGroupConfig(m.chat, (c) => {
        c.antispam.limit = limit;
        c.antispam.window = windowSec;
      });
      return m.reply(`✅ *Anti-Spam limit updated:* ${limit} messages in ${windowSec} seconds.`);
    } else {
      const cfg = groupSec.getGroupConfig(m.chat);
      return m.reply(
        `⚡ *Anti-Spam Configuration*\n\n` +
        `• Status: *${cfg.antispam.enabled ? '✅ ON' : '❌ OFF'}*\n` +
        `• Limit: *${cfg.antispam.limit} msgs in ${cfg.antispam.window}s*\n` +
        `• Action: *${cfg.antispam.action.toUpperCase()}*\n\n` +
        `*Commands:*\n` +
        `• *.antispam on* — enable\n` +
        `• *.antispam off* — disable\n` +
        `• *.antispam action delete|warn|kick* — set action\n` +
        `• *.antispam limit 5 5* — set limit & window`
      );
    }
  }
);

// ── Unified Security Message Listener ─────────
pnix({ on: 'text' }, async (m, text, client) => {
  if (!m.chat.endsWith('@g.us')) return; // groups only

  // Group admins and bot owners are 100% exempt from security filters
  if (await isGroupAdmin(client, m.chat, m.sender, m)) return;

  const cfg = groupSec.getGroupConfig(m.chat);
  const senderClean = (m.senderPn || m.sender).split('@')[0].split(':')[0];
  const targetJid = m.sender;

  // 1. Check AntiFake
  if (cfg.antifake?.enabled && groupSec.checkFakeNumber(senderClean, cfg.antifake.prefixes)) {
    try {
      await client.sendMessage(m.chat, { delete: m.data?.key }).catch(() => {});
      if (cfg.antifake.action === 'kick') {
        await client.groupParticipantsUpdate(m.chat, [targetJid], 'remove').catch(() => {});
        await client.sendMessage(m.chat, {
          text: `🚫 @${senderClean} was kicked because fake/foreign numbers are not allowed!`,
          mentions: [targetJid],
        });
      } else {
        await client.sendMessage(m.chat, {
          text: `⚠️ @${senderClean}, numbers with your country prefix are restricted in this group!`,
          mentions: [targetJid],
        });
      }
    } catch {}
    return;
  }

  // 2. Check AntiSpam / AntiSpace
  if (cfg.antispam?.enabled && groupSec.trackSpam(m.chat, senderClean, cfg.antispam.limit, cfg.antispam.window)) {
    try {
      await client.sendMessage(m.chat, { delete: m.data?.key }).catch(() => {});
      if (cfg.antispam.action === 'kick') {
        await client.groupParticipantsUpdate(m.chat, [targetJid], 'remove').catch(() => {});
        await client.sendMessage(m.chat, {
          text: `🚫 @${senderClean} was kicked for spamming messages too fast!`,
          mentions: [targetJid],
        });
      } else if (cfg.antispam.action === 'warn') {
        const count = groupSec.addWarning(m.chat, senderClean);
        if (count >= 3) {
          await client.groupParticipantsUpdate(m.chat, [targetJid], 'remove').catch(() => {});
          groupSec.clearWarnings(m.chat, senderClean);
          await client.sendMessage(m.chat, {
            text: `🔴 @${senderClean} was kicked after 3 spam warnings!`,
            mentions: [targetJid],
          });
        } else {
          await client.sendMessage(m.chat, {
            text: `⚠️ @${senderClean}, please slow down! Warning ${count}/3 for spamming.`,
            mentions: [targetJid],
          });
        }
      } else {
        await client.sendMessage(m.chat, {
          text: `⚠️ @${senderClean}, please slow down! Excessive messaging is not allowed.`,
          mentions: [targetJid],
        });
      }
    } catch {}
    return;
  }

  // 3. Check AntiLink
  if (cfg.antilink?.enabled && groupSec.checkLink(text)) {
    try {
      await client.sendMessage(m.chat, { delete: m.data?.key }).catch(() => {});
      if (cfg.antilink.action === 'kick') {
        await client.groupParticipantsUpdate(m.chat, [targetJid], 'remove').catch(() => {});
        await client.sendMessage(m.chat, {
          text: `🚫 @${senderClean} has been removed for posting links!`,
          mentions: [targetJid],
        });
      } else if (cfg.antilink.action === 'warn') {
        const count = groupSec.addWarning(m.chat, senderClean);
        if (count >= 3) {
          await client.groupParticipantsUpdate(m.chat, [targetJid], 'remove').catch(() => {});
          groupSec.clearWarnings(m.chat, senderClean);
          await client.sendMessage(m.chat, {
            text: `🔴 @${senderClean} was kicked after 3 link warnings!`,
            mentions: [targetJid],
          });
        } else {
          await client.sendMessage(m.chat, {
            text: `⚠️ @${senderClean}, links are not allowed here! Warning ${count}/3.`,
            mentions: [targetJid],
          });
        }
      } else {
        await client.sendMessage(m.chat, {
          text: `⚠️ @${senderClean}, links are not allowed in this group!`,
          mentions: [targetJid],
        });
      }
    } catch {}
    return;
  }

  // 4. Check AntiBadword
  if (cfg.antibadword?.enabled) {
    const bad = groupSec.checkBadWord(text, cfg.antibadword.customWords);
    if (bad) {
      try {
        await client.sendMessage(m.chat, { delete: m.data?.key }).catch(() => {});
        if (cfg.antibadword.action === 'kick') {
          await client.groupParticipantsUpdate(m.chat, [targetJid], 'remove').catch(() => {});
          await client.sendMessage(m.chat, {
            text: `🚫 @${senderClean} has been removed for using prohibited words!`,
            mentions: [targetJid],
          });
        } else if (cfg.antibadword.action === 'warn') {
          const count = groupSec.addWarning(m.chat, senderClean);
          if (count >= 3) {
            await client.groupParticipantsUpdate(m.chat, [targetJid], 'remove').catch(() => {});
            groupSec.clearWarnings(m.chat, senderClean);
            await client.sendMessage(m.chat, {
              text: `🔴 @${senderClean} was kicked after 3 bad word warnings!`,
              mentions: [targetJid],
            });
          } else {
            await client.sendMessage(m.chat, {
              text: `⚠️ @${senderClean}, please keep your language clean! Warning ${count}/3.`,
              mentions: [targetJid],
            });
          }
        } else {
          await client.sendMessage(m.chat, {
            text: `⚠️ @${senderClean}, please keep your language clean!`,
            mentions: [targetJid],
          });
        }
      } catch {}
      return;
    }
  }
});
