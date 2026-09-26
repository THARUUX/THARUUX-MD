const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const QRCode = require('qrcode');
const pino = require('pino');
const { Pool } = require('pg');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_URI ||
  'postgresql://postgres:Ldx0r4QP576Www4t@db.pjetqsuhocnrqhblgmjd.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

// Helper to unwrap multi-device and nested message wrappers
function unwrapMessage(content) {
  let m = content;
  while (m) {
    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    else if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    else if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
    else if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;
    else if (m.deviceSentMessage?.message) m = m.deviceSentMessage.message;
    else break;
  }
  return m;
}

class MultiBotManager extends EventEmitter {
  constructor() {
    super();
    this.sessionsBaseDir = path.resolve(__dirname, '../sessions');
    if (!fs.existsSync(this.sessionsBaseDir)) {
      fs.mkdirSync(this.sessionsBaseDir, { recursive: true });
    }
    // Map of userId -> { sock, connectionState, currentQR, currentPairingCode, userInfo, isRunning, configCache, store }
    this.bots = new Map();
  }

  getUserSessionDir(userId) {
    const cleanId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const dir = path.join(this.sessionsBaseDir, cleanId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  hasSession(userId) {
    const credsFile = path.join(this.getUserSessionDir(userId), 'creds.json');
    if (!fs.existsSync(credsFile)) return false;
    try {
      const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
      return !!(creds && (creds.registered === true || creds.me));
    } catch {
      return false;
    }
  }

  async getBotConfig(userId) {
    const inst = this.bots.get(userId);
    if (inst?.configCache && Date.now() - inst.configCacheTime < 30000) {
      return inst.configCache;
    }

    try {
      const res = await pool.query(`
        SELECT 
          bi.bot_name, bi.prefix, bi.mode,
          bc.sticker_pack_name, bc.sticker_author, bc.alive_message,
          bc.alive_image_url, bc.audio_title, bc.audio_artist,
          bc.auto_read, bc.auto_react, bc.auto_status_view,
          bc.auto_call_reject, bc.call_reject_message, bc.sudo_numbers
        FROM public.bot_instances bi
        LEFT JOIN public.bot_configs bc ON bc.bot_id = bi.id
        WHERE bi.user_id = $1
        LIMIT 1
      `, [userId]);

      if (res.rows.length > 0) {
        const row = res.rows[0];
        const cfg = {
          bot_name: row.bot_name || 'THARUUX-MD',
          prefix: row.prefix || '.',
          mode: row.mode || 'public',
          sticker_pack_name: row.sticker_pack_name || 'THARUUX-MD',
          sticker_author: row.sticker_author || 'THARUUX🍀',
          alive_message: row.alive_message || '👋 Hey there! *THARUUX-MD* is active.',
          alive_image_url: row.alive_image_url || '',
          audio_title: row.audio_title || 'THARUUX-MD Official',
          audio_artist: row.audio_artist || 'THARUUX',
          auto_read: !!row.auto_read,
          auto_react: row.auto_react !== false,
          auto_status_view: !!row.auto_status_view,
          auto_call_reject: !!row.auto_call_reject,
          call_reject_message: row.call_reject_message || '📵 Calls are not allowed on this automated line.',
          sudo_numbers: Array.isArray(row.sudo_numbers) ? row.sudo_numbers : [],
        };
        if (inst) {
          inst.configCache = cfg;
          inst.configCacheTime = Date.now();
        }
        return cfg;
      }
    } catch (e) {
      console.warn('Could not fetch bot config from DB:', e.message);
    }

    return {
      bot_name: 'THARUUX-MD',
      prefix: '.',
      mode: 'public',
      sticker_pack_name: 'THARUUX-MD',
      sticker_author: 'THARUUX🍀',
      alive_message: '👋 Hey there! *THARUUX-MD* is active.',
      alive_image_url: '',
      audio_title: 'THARUUX-MD Official',
      audio_artist: 'THARUUX',
      auto_read: false,
      auto_react: true,
      auto_status_view: false,
      auto_call_reject: false,
      call_reject_message: '📵 Calls are not allowed on this automated line.',
      sudo_numbers: [],
    };
  }

  refreshUserConfig(userId) {
    const inst = this.bots.get(userId);
    if (inst) {
      inst.configCache = null;
      inst.configCacheTime = 0;
    }
  }

  async updateBotStatusInDb(userId, status, phone = null, name = null) {
    try {
      await pool.query(`
        UPDATE public.bot_instances
        SET 
          connection_status = $1,
          whatsapp_number = COALESCE($2, whatsapp_number),
          whatsapp_name = COALESCE($3, whatsapp_name),
          last_connected_at = CASE WHEN $1 = 'connected' THEN now() ELSE last_connected_at END,
          updated_at = now()
        WHERE user_id = $4
      `, [status, phone, name, userId]);
    } catch (e) {
      console.warn('Could not update bot status in DB:', e.message);
    }
  }

  getStatus(userId) {
    const defaultState = {
      userId,
      source: 'user_bot',
      hasSession: this.hasSession(userId),
      connectionState: 'disconnected',
      isBotRunning: false,
      user: null,
      currentQR: null,
      currentPairingCode: null,
    };

    const inst = this.bots.get(userId);
    if (!inst) return defaultState;

    return {
      userId,
      source: 'user_bot',
      hasSession: this.hasSession(userId),
      connectionState: inst.connectionState || 'disconnected',
      isBotRunning: !!inst.isRunning,
      user: inst.userInfo || null,
      currentQR: inst.currentQR || null,
      currentPairingCode: inst.currentPairingCode || null,
    };
  }

  async closeActiveSocket(userId) {
    const inst = this.bots.get(userId);
    if (inst?.sock) {
      try {
        inst.sock.ev.removeAllListeners();
        inst.sock.end(undefined);
      } catch {}
      inst.sock = null;
    }
    if (inst) {
      inst.currentQR = null;
      inst.currentPairingCode = null;
      inst.connectionState = 'disconnected';
      inst.isRunning = false;
    }
  }

  async startPairingSession(userId, phoneNumber) {
    await this.closeActiveSocket(userId);

    const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      throw new Error('Please enter a valid phone number with country code (e.g. 94789731507)');
    }

    let inst = this.bots.get(userId);
    if (!inst) {
      inst = { connectionState: 'connecting', isRunning: false, store: { messages: {}, contacts: {} } };
      this.bots.set(userId, inst);
    }
    inst.connectionState = 'connecting';

    return this._initUserSocket(userId, { mode: 'pairing', phone: cleanPhone });
  }

  async startQRSession(userId) {
    await this.closeActiveSocket(userId);

    let inst = this.bots.get(userId);
    if (!inst) {
      inst = { connectionState: 'connecting', isRunning: false, store: { messages: {}, contacts: {} } };
      this.bots.set(userId, inst);
    }
    inst.connectionState = 'connecting';

    return this._initUserSocket(userId, { mode: 'qr' });
  }

  async _initUserSocket(userId, { mode, phone, isReconnect = false }) {
    const baileys = await import('@whiskeysockets/baileys');
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const sessionDir = this.getUserSessionDir(userId);

    const { state, saveCreds } = await baileys.useMultiFileAuthState(sessionDir);
    const { version } = await baileys.fetchLatestBaileysVersion();

    let inst = this.bots.get(userId);
    if (!inst) {
      inst = { store: { messages: {}, contacts: {} } };
      this.bots.set(userId, inst);
    }

    const sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      auth: state,
      printQRInTerminal: false,
      browser: baileys.Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      getMessage: async (key) => {
        const jid = key.remoteJidAlt || key.remoteJid;
        return inst.store?.messages?.[jid]?.[key.id]?.message || null;
      },
    });

    inst.sock = sock;

    sock.ev.on('creds.update', async () => {
      await saveCreds();
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const errMsg = lastDisconnect?.error?.message || '';

      console.log(`📡 [User ${userId}] Connection update:`, connection || 'in-progress');

      if (qr && (mode === 'qr' || !inst.userInfo)) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
          inst.currentQR = qrDataUrl;
          this.emit(`qr_${userId}`, { qrDataUrl });
        } catch (e) {
          console.error('QR code generation error:', e);
        }
      }

      if (connection === 'connecting') {
        inst.connectionState = 'connecting';
        this.emit(`state_${userId}`, { state: 'connecting' });
      } else if (connection === 'open') {
        inst.connectionState = 'open';
        inst.isRunning = true;
        inst.currentQR = null;
        inst.currentPairingCode = null;

        const phoneNum = (sock.user?.id || '').split('@')[0].split(':')[0];
        const userName = sock.user?.name || 'THARUUX User';

        inst.userInfo = { id: sock.user?.id || '', name: userName, phone: phoneNum };

        console.log(`🎉 [User ${userId}] WhatsApp Connected as: ${userName} (+${phoneNum})`);
        await this.updateBotStatusInDb(userId, 'connected', phoneNum, userName);

        // Attach user-isolated message & command handling
        this._attachMessageHandler(userId, sock);

        this.emit(`connected_${userId}`, { user: inst.userInfo });
        this.emit(`state_${userId}`, { state: 'open', user: inst.userInfo });
      } else if (connection === 'close') {
        if (statusCode === 401) {
          console.log(`🔴 [User ${userId}] Session logged out.`);
          await this.logout(userId);
        } else if (statusCode === 515 || statusCode === 428 || statusCode === 408 || errMsg.includes('restart required')) {
          console.log(`🔄 [User ${userId}] Reconnecting socket in 2 seconds...`);
          setTimeout(async () => {
            if (this.hasSession(userId)) {
              try {
                await this._initUserSocket(userId, { mode, phone, isReconnect: true });
              } catch (err) {
                console.error(`Error reconnecting for user ${userId}:`, err);
              }
            }
          }, 2000);
        } else {
          inst.connectionState = 'disconnected';
          inst.isRunning = false;
          inst.currentQR = null;
          inst.currentPairingCode = null;
          await this.updateBotStatusInDb(userId, 'disconnected');
          this.emit(`state_${userId}`, { state: 'disconnected', statusCode });
        }
      }
    });

    if (mode === 'pairing' && phone && !isReconnect) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const code = await sock.requestPairingCode(phone);
        const formattedCode = (code || '').match(/.{1,4}/g)?.join('-') || code;
        inst.currentPairingCode = formattedCode;
        console.log(`🔑 [User ${userId}] Pairing Code generated: ${formattedCode}`);
        this.emit(`pairing_code_${userId}`, { code: formattedCode });
        return formattedCode;
      } catch (err) {
        await this.closeActiveSocket(userId);
        throw err;
      }
    }

    return sock;
  }

  _attachMessageHandler(userId, client) {
    const event = require('./commands');
    const { Message, getJson } = require('./index');
    const inst = this.bots.get(userId);
    const store = inst?.store || { messages: {}, contacts: {} };

    // Auto Call Reject
    client.ev.on('call', async (calls) => {
      try {
        const userCfg = await this.getBotConfig(userId);
        for (const call of calls) {
          const { status, from, id } = call;
          if (userCfg.auto_call_reject && status === 'offer') {
            await client.rejectCall(id, from);
            if (userCfg.call_reject_message) {
              await client.sendMessage(from, { text: userCfg.call_reject_message }).catch(() => {});
            }
          }
        }
      } catch (e) {}
    });

    // Contacts store
    client.ev.on('contacts.update', (contacts) => {
      for (const c of contacts) {
        const id = c.id;
        if (store && store.contacts) {
          store.contacts[id] = { id, name: c.notify };
        }
      }
    });

    // Core Message Upsert & Command Dispatcher (Per-User Isolated)
    client.ev.on('messages.upsert', async (msgUpdate) => {
      try {
        if (!msgUpdate || !msgUpdate.messages) return;
        if (msgUpdate.type !== 'notify' && msgUpdate.type !== 'append') return;

        const userCfg = await this.getBotConfig(userId);
        const botPrefix = userCfg.prefix || '.';
        const sudoList = Array.isArray(userCfg.sudo_numbers) ? userCfg.sudo_numbers : [];

        for (const rawMsg of msgUpdate.messages) {
          if (!rawMsg || !rawMsg.message) continue;

          const remoteJid = rawMsg.key.remoteJidAlt || rawMsg.key.remoteJid;
          if (!remoteJid) continue;
          if (remoteJid.endsWith('@newsletter')) continue;

          const unwrapped = unwrapMessage(rawMsg.message);
          if (!unwrapped) continue;

          const msgType = Object.keys(unwrapped)[0];
          if (
            msgType === 'protocolMessage' ||
            msgType === 'senderKeyDistributionMessage' ||
            msgType === 'messageContextInfo'
          ) {
            continue;
          }

          if (!store.messages[remoteJid]) store.messages[remoteJid] = {};
          store.messages[remoteJid][rawMsg.key.id] = rawMsg;
          const storedKeys = Object.keys(store.messages[remoteJid]);
          if (storedKeys.length > 100) {
            delete store.messages[remoteJid][storedKeys[0]];
          }

          const normalizedMsg = { ...rawMsg, message: unwrapped };
          const m = await new Message(client, normalizedMsg);

          const botPhone = client.user?.id ? client.user.id.split('@')[0].split(':')[0] : '';
          const senderId = m.sender ? m.sender.split('@')[0].split(':')[0] : '';

          const isOwner = Boolean(
            m.fromMe ||
            (botPhone && senderId && botPhone === senderId) ||
            sudoList.includes(m.sender) ||
            sudoList.includes(senderId) ||
            (senderId && sudoList.some((s) => typeof s === 'string' && s.includes(senderId)))
          );

          // Work mode isolation: if private mode, ignore non-owner messages
          if (userCfg.mode === 'private' && !isOwner) {
            continue;
          }

          // Status automation
          const isStatus = Boolean(
            remoteJid === 'status@broadcast' ||
            m?.msg?.imageMessage?.contextInfo ||
            m?.msg?.extendedTextMessage?.contextInfo ||
            m?.msg?.videoMessage?.contextInfo?.statusSourceType ||
            m?.msg?.audioMessage?.contextInfo?.statusSourceType
          );
          if (isStatus) {
            if (userCfg.auto_status_view) {
              await client.readMessages([rawMsg.key]).catch(() => {});
            }
          }

          if (userCfg.auto_read) {
            await client.readMessages([m.data.key]).catch(() => {});
          }

          // Clean prefix if followed by space e.g. ". ping" -> ".ping"
          if (m.text && botPrefix && m.text.startsWith(botPrefix) && m.text[botPrefix.length] === ' ') {
            m.text = m.text.replace(
              new RegExp('^(' + botPrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + ')\\s+(.+)'),
              '$1$2'
            );
          }

          const msgText = (m.text || '').trim();
          if (!msgText) continue;

          const msgWord = msgText.toLowerCase().split(/\s+/)[0];

          // Command dispatcher
          const allCommands = event.commands || [];
          let commandMatched = false;

          for (const cmd of allCommands) {
            if (!cmd.command) continue;
            if (!isOwner && cmd.fromMe) continue;

            const aliases = [cmd.command, ...(cmd.alias || [])].filter(Boolean).map((c) => c.toLowerCase());

            for (const alias of aliases) {
              const trigger = (botPrefix + alias).toLowerCase();
              const isMatch = msgWord === trigger || msgWord === alias;

              if (isMatch) {
                commandMatched = true;
                try {
                  if (cmd.onlyGroup && !m.isGroup) {
                    await m.reply('_*ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ ɪꜱ ᴏɴʟʏ ꜰᴏʀ ɢʀᴏᴜᴘꜱ!*_');
                    return;
                  }

                  if (cmd.react) {
                    await client.sendMessage(m.chat, {
                      react: { text: cmd.react, key: m.data.key },
                    }).catch(() => {});
                  }

                  const matchedPrefix = msgWord === trigger ? trigger : alias;
                  const args = msgText.slice(matchedPrefix.length).trim();
                  await cmd.function(m, args, client);
                  return;
                } catch (cmdErr) {
                  console.error(`[User ${userId}] Command error in ${cmd.command}:`, cmdErr.message);
                  await m.reply(`*Error in command ${cmd.command}:*\n\`\`\`${cmdErr.message}\`\`\``).catch(() => {});
                  return;
                }
              }
            }
          }

          // Listener events (on: 'text', on: 'all')
          if (!commandMatched) {
            for (const cmd of allCommands) {
              if (cmd.on) {
                try {
                  await cmd.function(m, msgText, client);
                } catch (onErr) {}
              }
            }
          }
        }
      } catch (upsertErr) {
        console.error(`[User ${userId}] messages.upsert crash:`, upsertErr);
      }
    });
  }

  async logout(userId) {
    await this.closeActiveSocket(userId);
    const sessionDir = this.getUserSessionDir(userId);
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch {}
    this.bots.delete(userId);
    await this.updateBotStatusInDb(userId, 'disconnected');
    this.emit(`state_${userId}`, { state: 'disconnected', loggedOut: true });
    return true;
  }

  // Auto-start all existing connected user bots on server startup
  async loadAllActiveBots() {
    try {
      const res = await pool.query(`
        SELECT bi.user_id, bi.connection_status, bi.whatsapp_number
        FROM public.bot_instances bi
        JOIN public.profiles p ON p.id = bi.user_id
        WHERE p.is_active = true AND (p.activation_end IS NULL OR p.activation_end > now())
      `);

      for (const row of res.rows) {
        const userId = row.user_id;
        if (this.hasSession(userId)) {
          console.log(`🚀 Booting background bot instance for user: ${userId}`);
          this._initUserSocket(userId, { mode: 'reconnect', isReconnect: true }).catch((err) => {
            console.error(`Failed to boot bot for ${userId}:`, err.message);
          });
        }
      }
    } catch (e) {
      console.warn('Could not auto-load active bots on startup:', e.message);
    }
  }
}

const multiBotManager = new MultiBotManager();
module.exports = multiBotManager;
