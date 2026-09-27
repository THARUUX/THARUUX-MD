// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Profile Picture Downloader Plugin
//   Commands: .getdp, .pfp, .dp, .getpfp, .profilepic, .gcdp
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { pnix, mode } = require('../lib');
const axios = require('axios');

pnix(
  {
    command: 'getdp',
    alias: ['pfp', 'dp', 'getpfp', 'profilepic', 'gcdp', 'groupdp', 'mypfp'],
    desc: 'Download full-resolution profile picture of any user, group, or yourself.',
    type: 'download',
    fromMe: mode,
  },
  async (m, args, client) => {
    let targetJid = null;
    let isGroupTarget = false;
    const cleanArgs = (args || '').trim().toLowerCase();

    // 1. Group DP requests (.getdp group, .gcdp, .groupdp)
    if (
      cleanArgs === 'group' ||
      cleanArgs === 'gc' ||
      m.command === 'gcdp' ||
      m.command === 'groupdp'
    ) {
      if (!m.isGroup) return m.reply('❌ This command can only be used in a group to get the group icon.');
      targetJid = m.chat;
      isGroupTarget = true;
    }

    // 2. Own DP requests (.getdp me, .mypfp)
    else if (cleanArgs === 'me' || cleanArgs === 'my' || m.command === 'mypfp') {
      targetJid = m.sender;
    }

    // 3. Mentions / Tags (@user)
    else {
      const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (mentioned.length > 0) {
        targetJid = mentioned[0];
      }

      // 4. Replied-to message
      else if (m.reply_message?.sender) {
        targetJid = m.reply_message.sender;
      }

      // 5. Raw phone number provided (.getdp 94789731507 or +94789731507)
      else if (cleanArgs && cleanArgs.replace(/\D/g, '').length >= 7) {
        const rawDigits = cleanArgs.replace(/\D/g, '');
        targetJid = `${rawDigits}@s.whatsapp.net`;
      }

      // 6. In private chat (DM) with no args: default to the person you are chatting with
      else if (!m.isGroup) {
        targetJid = m.chat;
      }
    }

    // If still no target resolved, display usage instructions
    if (!targetJid) {
      return m.reply(
        `📸 *PROFILE PICTURE DOWNLOADER*\n\n` +
        `*How to use:*\n` +
        `• *Reply to any message:* \`.getdp\`\n` +
        `• *Tag a user:* \`.getdp @user\`\n` +
        `• *Enter phone number:* \`.getdp 94789731507\`\n` +
        `• *Get group icon:* \`.getdp group\` or \`.gcdp\`\n` +
        `• *Get your own DP:* \`.getdp me\` or \`.mypfp\``
      );
    }

    await m.react('🔍');

    try {
      // Fetch full-resolution image URL, with fallback to preview
      let ppUrl = null;
      try {
        ppUrl = await client.profilePictureUrl(targetJid, 'image');
      } catch (errHigh) {
        try {
          ppUrl = await client.profilePictureUrl(targetJid, 'preview');
        } catch (errPreview) {
          ppUrl = null;
        }
      }

      if (!ppUrl) {
        await m.react('❌');
        return m.reply(
          `❌ *Could not retrieve profile picture.*\n\n` +
          `The user or group may have no profile photo set, or their privacy settings hide it from this bot.`
        );
      }

      // Download buffer directly for fast and guaranteed delivery
      const res = await axios.get(ppUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: { 'User-Agent': 'WhatsApp/2.24.6.77' },
      });

      const imgBuffer = Buffer.from(res.data);
      const isTargetGroup = isGroupTarget || targetJid.endsWith('@g.us');
      const targetPhone = targetJid.split('@')[0].split(':')[0];

      let caption = `📸 *Profile Picture Downloaded*\n\n`;
      if (isTargetGroup) {
        let groupName = 'Group';
        try {
          const meta = await client.groupMetadata(targetJid);
          if (meta?.subject) groupName = meta.subject;
        } catch {}
        caption += `• *Type:* Group Icon\n`;
        caption += `• *Group:* ${groupName}\n`;
      } else {
        caption += `• *User:* @${targetPhone}\n`;
        caption += `• *Number:* +${targetPhone}\n`;
      }
      caption += `• *Resolution:* High Quality (HD)\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`;

      await client.sendMessage(
        m.chat,
        {
          image: imgBuffer,
          caption,
          mentions: isTargetGroup ? [] : [targetJid],
        },
        { quoted: m.data }
      );

      await m.react('📸');
    } catch (error) {
      console.error('Failed to get profile picture:', error.message);
      await m.react('❌');
      return m.reply(`❌ *Failed to download profile picture:*\n\`\`\`${error.message}\`\`\``);
    }
  }
);
