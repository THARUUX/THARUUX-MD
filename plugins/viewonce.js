// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Anti-ViewOnce (.vv / .viewonce) Plugin
//   Recovers View-Once images, videos, audio/voice notes, and documents.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const fs = require('fs');
const { pnix, mode } = require('../lib/commands');
const { font } = require('../lib/font');

// LRU cache for recently seen View Once messages (up to 1000 items)
const _viewOnceCache = new Map();

function cacheViewOnceMessage(id, data) {
  if (!id || !data) return;
  if (_viewOnceCache.size >= 1000) {
    const oldestKey = _viewOnceCache.keys().next().value;
    _viewOnceCache.delete(oldestKey);
  }
  _viewOnceCache.set(id, data);
}

/**
 * Deeply unwrap viewOnce / ephemeral wrappers down to raw media message
 */
function extractMediaFromMessage(msg) {
  if (!msg || typeof msg !== 'object') return null;

  let current = msg;

  // Unwrap outer wrappers if passed a store entry or WAMessage
  if (current.rawMsg) current = current.rawMsg;
  if (current.message && typeof current.message === 'object') current = current.message;
  if (current.msg && typeof current.msg === 'object') current = current.msg;
  if (current.data?.message && typeof current.data.message === 'object') current = current.data.message;

  // Handle nested wrappers
  for (let i = 0; i < 10; i++) {
    if (!current || typeof current !== 'object') break;
    if (current.viewOnceMessage?.message) current = current.viewOnceMessage.message;
    else if (current.viewOnceMessageV2?.message) current = current.viewOnceMessageV2.message;
    else if (current.viewOnceMessageV2Extension?.message) current = current.viewOnceMessageV2Extension.message;
    else if (current.viewOnceMessage && typeof current.viewOnceMessage === 'object' && !current.viewOnceMessage.message) current = current.viewOnceMessage;
    else if (current.viewOnceMessageV2 && typeof current.viewOnceMessageV2 === 'object' && !current.viewOnceMessageV2.message) current = current.viewOnceMessageV2;
    else if (current.viewOnceMessageV2Extension && typeof current.viewOnceMessageV2Extension === 'object' && !current.viewOnceMessageV2Extension.message) current = current.viewOnceMessageV2Extension;
    else if (current.ephemeralMessage?.message) current = current.ephemeralMessage.message;
    else if (current.documentWithCaptionMessage?.message) current = current.documentWithCaptionMessage.message;
    else if (current.deviceSentMessage?.message) current = current.deviceSentMessage.message;
    else if (current.message && typeof current.message === 'object') current = current.message;
    else break;
  }

  if (!current || typeof current !== 'object') return null;

  // Check standard Baileys media properties
  if (current.imageMessage) return { type: 'image', msg: current.imageMessage, caption: current.imageMessage.caption };
  if (current.videoMessage) return { type: 'video', msg: current.videoMessage, caption: current.videoMessage.caption };
  if (current.audioMessage) return { type: 'audio', msg: current.audioMessage, ptt: current.audioMessage.ptt };
  if (current.documentMessage) return { type: 'document', msg: current.documentMessage, caption: current.documentMessage.caption };

  // Check if current is already the inner media object itself
  const mime = current.mimetype || '';
  if (mime.startsWith('image/') || (current.url && !mime && current.fileSha256)) {
    return { type: 'image', msg: current, caption: current.caption };
  }
  if (mime.startsWith('video/')) {
    return { type: 'video', msg: current, caption: current.caption };
  }
  if (mime.startsWith('audio/')) {
    return { type: 'audio', msg: current, ptt: Boolean(current.ptt) };
  }
  if (current.fileName || mime.startsWith('application/')) {
    return { type: 'document', msg: current, caption: current.caption };
  }

  return null;
}

// Background listener: automatically intercept and cache all incoming View Once messages
pnix(
  {
    on: 'all',
  },
  async (m, text, client) => {
    try {
      const msgId = m?.data?.key?.id || m?.id;
      if (!msgId) return;

      const media = extractMediaFromMessage(m?.data?.message || m?.msg || m?.data || m);
      if (media) {
        cacheViewOnceMessage(msgId, {
          media,
          rawMsg: m?.data?.message || m?.msg || m?.data,
          sender: m?.sender || m?.data?.key?.participant || m?.data?.key?.remoteJid,
          chat: m?.chat,
          ts: Date.now(),
        });
      }
    } catch {}
  }
);

pnix(
  {
    command: 'vv',
    alias: ['viewonce', 'antivo', 'vo', 'antiviewonce'],
    desc: 'Reveal and retrieve View Once photos, videos, and voice notes.',
    type: 'media',
    fromMe: mode,
  },
  async (m, args, client) => {
    try {
      // 1. Resolve quoted message if it is a Promise
      const quoted = m.quoted && typeof m.quoted.then === 'function' ? await m.quoted : m.quoted;

      // 2. Extract potential stanzaId (quoted message ID)
      const stanzaId =
        quoted?.id ||
        quoted?.stanzaId ||
        m.msg?.contextInfo?.stanzaId ||
        m.data?.message?.extendedTextMessage?.contextInfo?.stanzaId ||
        (m.data?.message && typeof m.data.message === 'object'
          ? Object.values(m.data.message).find((v) => v?.contextInfo?.stanzaId)?.contextInfo?.stanzaId
          : null);

      // 3. Collect all candidate message structures from quoted and current message
      const candidates = [
        quoted?.msg,
        quoted?.data?.message,
        quoted?.message,
        quoted?.image ? { imageMessage: quoted.image } : null,
        quoted?.video ? { videoMessage: quoted.video } : null,
        quoted?.audio ? { audioMessage: quoted.audio } : null,
        quoted?.document ? { documentMessage: quoted.document } : null,
        m.msg?.contextInfo?.rawQuotedMessage,
        m.msg?.contextInfo?.quotedMessage,
        m.data?.message?.extendedTextMessage?.contextInfo?.rawQuotedMessage,
        m.data?.message?.extendedTextMessage?.contextInfo?.quotedMessage,
        m.data?.message,
        m.msg,
      ].filter(Boolean);

      if (m.data?.message && typeof m.data.message === 'object') {
        for (const val of Object.values(m.data.message)) {
          if (val?.contextInfo?.quotedMessage) candidates.push(val.contextInfo.quotedMessage);
          if (val?.contextInfo?.rawQuotedMessage) candidates.push(val.contextInfo.rawQuotedMessage);
        }
      }

      let mediaInfo = null;
      for (const candidate of candidates) {
        mediaInfo = extractMediaFromMessage(candidate);
        if (mediaInfo) break;
      }

      // 4. If not found in direct payload, search in caches and message stores using stanzaId
      if (!mediaInfo && stanzaId) {
        // A. Check in-memory view-once cache
        const cachedVO = _viewOnceCache.get(stanzaId);
        if (cachedVO) {
          mediaInfo = cachedVO.media || extractMediaFromMessage(cachedVO.rawMsg || cachedVO);
        }

        // B. Check client.store (single-bot or multi-bot memory store)
        if (!mediaInfo && client?.store?.messages) {
          const chatStore = client.store.messages[m.chat];
          if (chatStore?.[stanzaId]) {
            mediaInfo = extractMediaFromMessage(chatStore[stanzaId]);
          }
          if (!mediaInfo) {
            for (const cJid of Object.keys(client.store.messages)) {
              if (client.store.messages[cJid]?.[stanzaId]) {
                mediaInfo = extractMediaFromMessage(client.store.messages[cJid][stanzaId]);
                if (mediaInfo) break;
              }
            }
          }
        }

        // C. Check client.adCache (Antidelete cache on socket)
        if (!mediaInfo && client?.adCache?.get) {
          const adEntry = client.adCache.get(stanzaId);
          if (adEntry) {
            mediaInfo = extractMediaFromMessage(adEntry.rawMsg || adEntry);
          }
        }

        // D. Check multiBotManager stores & antidelete caches
        if (!mediaInfo) {
          try {
            const rawManager = require('../lib/multiBotManager');
            const multiBotManager = rawManager.multiBotManager || rawManager;
            const userId =
              client?._userId ||
              client?.userId ||
              (multiBotManager?.bots && multiBotManager.bots.keys().next().value);

            if (userId) {
              const userBot = multiBotManager?.bots?.get(userId);
              if (userBot?.store?.messages?.[m.chat]?.[stanzaId]) {
                mediaInfo = extractMediaFromMessage(userBot.store.messages[m.chat][stanzaId]);
              }
              if (!mediaInfo && multiBotManager?._antideleteCache?.[userId]?.get) {
                const adEntry = multiBotManager._antideleteCache[userId].get(stanzaId);
                if (adEntry) {
                  mediaInfo = extractMediaFromMessage(adEntry.rawMsg || adEntry);
                }
              }
            }
          } catch {}
        }

        // E. Check disk store file ./lib/database/store.json
        if (!mediaInfo && fs.existsSync('./lib/database/store.json')) {
          try {
            const diskStore = JSON.parse(fs.readFileSync('./lib/database/store.json', 'utf8'));
            const diskMsg = diskStore.messages?.[m.chat]?.[stanzaId];
            if (diskMsg) {
              mediaInfo = extractMediaFromMessage(diskMsg);
            }
          } catch {}
        }

        // F. Check Baileys getMessage / loadMessage
        if (!mediaInfo && typeof client?.getMessage === 'function') {
          try {
            const loaded = await client.getMessage({ remoteJid: m.chat, id: stanzaId });
            if (loaded) mediaInfo = extractMediaFromMessage(loaded);
          } catch {}
        }
        if (!mediaInfo && typeof client?.loadMessage === 'function') {
          try {
            const loaded = await client.loadMessage(m.chat, stanzaId);
            if (loaded) mediaInfo = extractMediaFromMessage(loaded);
          } catch {}
        }
      }

      if (!mediaInfo) {
        return m.reply(
          `*${font('View Once Recovery')}*\n\n` +
          `❌ *No View Once media detected!*\n\n` +
          `*${font('How to use')}*\n` +
          `Reply to any View Once photo, video, or voice note with: \`.vv\`\n\n` +
          `_Tip: Make sure you reply directly to the View Once message. If the message was sent before the bot was connected, WhatsApp may not have delivered the media keys._\n\n` +
          `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
        );
      }

      // React to indicate processing
      if (client?.sendMessage && m.data?.key) {
        await client.sendMessage(m.chat, {
          react: { text: '⏳', key: m.data.key },
        }).catch(() => {});
      }

      // 5. Download media stream and convert to Buffer
      let buffer = null;

      // Method A: Download via Baileys downloadContentFromMessage
      try {
        let baileysLib;
        try {
          baileysLib = await import('@whiskeysockets/baileys');
        } catch (err) {
          baileysLib = require('../lib/tharuux/baileys');
        }
        const downloadFn = baileysLib.downloadContentFromMessage || baileysLib.default?.downloadContentFromMessage;
        if (typeof downloadFn === 'function') {
          const stream = await downloadFn(mediaInfo.msg, mediaInfo.type);
          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          if (chunks.length > 0) {
            buffer = Buffer.concat(chunks);
          }
        }
      } catch (dlErr) {
        console.warn('Baileys downloadContentFromMessage failed, trying fallback:', dlErr.message);
      }

      // Method B: Fallback to quoted.download() if available
      if ((!buffer || buffer.length === 0) && quoted?.download && typeof quoted.download === 'function') {
        try {
          buffer = await quoted.download();
        } catch (dlErr2) {
          console.warn('quoted.download() failed:', dlErr2.message);
        }
      }

      // Method C: Fallback to m.download() if available
      if ((!buffer || buffer.length === 0) && m?.download && typeof m.download === 'function') {
        try {
          buffer = await m.download();
        } catch {}
      }

      if (!buffer || buffer.length === 0) {
        throw new Error('Retrieved media buffer is empty or expired on WhatsApp servers.');
      }

      // 6. Send recovered media back to chat
      const senderJid =
        quoted?.sender ||
        m.msg?.contextInfo?.participant ||
        _viewOnceCache.get(stanzaId)?.sender ||
        m.quoted?.sender ||
        m.sender;

      const senderNum = (senderJid || '').split('@')[0].split(':')[0];
      const defaultCaption = `🔓 *View Once Retrieved*\n👤 *From:* @${senderNum}${
        mediaInfo.caption ? `\n💬 *Caption:* ${mediaInfo.caption}` : ''
      }\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`;

      const sendOptions = {
        quoted: m.data || m,
        mentions: senderJid ? [senderJid] : [],
      };

      if (mediaInfo.type === 'image') {
        await client.sendMessage(
          m.chat,
          {
            image: buffer,
            caption: defaultCaption,
          },
          sendOptions
        );
      } else if (mediaInfo.type === 'video') {
        await client.sendMessage(
          m.chat,
          {
            video: buffer,
            caption: defaultCaption,
            mimetype: mediaInfo.msg.mimetype || 'video/mp4',
          },
          sendOptions
        );
      } else if (mediaInfo.type === 'audio') {
        await client.sendMessage(
          m.chat,
          {
            audio: buffer,
            mimetype: mediaInfo.msg.mimetype || 'audio/ogg; codecs=opus',
            ptt: Boolean(mediaInfo.ptt ?? true),
          },
          sendOptions
        );
      } else if (mediaInfo.type === 'document') {
        await client.sendMessage(
          m.chat,
          {
            document: buffer,
            mimetype: mediaInfo.msg.mimetype || 'application/octet-stream',
            fileName: mediaInfo.msg.fileName || 'ViewOnce_Document',
            caption: defaultCaption,
          },
          sendOptions
        );
      }

      // Success reaction
      if (client?.sendMessage && m.data?.key) {
        await client.sendMessage(m.chat, {
          react: { text: '🔓', key: m.data.key },
        }).catch(() => {});
      }
    } catch (err) {
      console.error('ViewOnce retrieval error:', err);
      return m.reply(
        `❌ *Failed to retrieve View Once message:*\n` +
        `\`\`\`${err.message}\`\`\`\n\n` +
        `_Note: If the sender sent this long ago, WhatsApp servers may have already expired the media keys._`
      );
    }
  }
);
