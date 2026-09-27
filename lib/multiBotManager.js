const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const QRCode = require('qrcode');
const pino = require('pino');
const zlib = require('zlib');
const { Pool } = require('pg');
const groupSec = require('./groupSecurity');

let DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_URI ||
  'postgresql://postgres.pjetqsuhocnrqhblgmjd:Ldx0r4QP576Www4t@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';

if (DATABASE_URL.includes('db.pjetqsuhocnrqhblgmjd.supabase.co')) {
  DATABASE_URL = 'postgresql://postgres.pjetqsuhocnrqhblgmjd:Ldx0r4QP576Www4t@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 10000,
  statement_timeout: 3000,
  query_timeout: 3000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});
pool.on('error', (err) => {
  console.warn('[DB Pool]', err.message);
});

// Helper to unwrap multi-device and nested message wrappers
function unwrapMessage(content) {
  let m = content;
  while (m) {
    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    else if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    else if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
    else if (m.viewOnceMessageV2Extension?.message) m = m.viewOnceMessageV2Extension.message;
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
    // Map of userId -> { sock, connectionState, currentQR, currentPairingCode, userInfo, isRunning, configCache, store, syncDebounceTimer }
    this.bots = new Map();
  }

  getAntideleteSettings(userId) {
    if (!this._antideleteSettings) this._antideleteSettings = {};
    if (!this._antideleteSettings[userId]) {
      this._antideleteSettings[userId] = {
        enabled: true, // ON by default!
        dest: 'chat',  // 'chat' (resends in chat) | 'dm' (owner DM) | 'both'
        disabledChats: new Set(),
      };
    }
    return this._antideleteSettings[userId];
  }

  getBotChatState(userId) {
    if (!this._botChatStates) this._botChatStates = {};
    if (!this._botChatStates[userId]) {
      const stateFile = path.join(this.getUserSessionDir(userId), 'bot_status.json');
      let loaded = { groups: true, chats: true, disabled: [], enabled: [] };
      if (fs.existsSync(stateFile)) {
        try {
          loaded = { ...loaded, ...JSON.parse(fs.readFileSync(stateFile, 'utf8')) };
        } catch {}
      }
      this._botChatStates[userId] = loaded;
    }
    return this._botChatStates[userId];
  }

  saveBotChatState(userId, state) {
    if (!this._botChatStates) this._botChatStates = {};
    this._botChatStates[userId] = state;
    try {
      const stateFile = path.join(this.getUserSessionDir(userId), 'bot_status.json');
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
      console.error(`Failed to save bot_status.json for ${userId}:`, e.message);
    }
  }

  isBotActiveForChat(state, chatJid) {
    if (!state) return true;
    const isGroup = chatJid.endsWith('@g.us');

    // 1. Explicit override check first
    if (Array.isArray(state.disabled) && state.disabled.includes(chatJid)) {
      return false;
    }
    if (Array.isArray(state.enabled) && state.enabled.includes(chatJid)) {
      return true;
    }

    // 2. Category level check
    if (isGroup) {
      return state.groups !== false;
    } else {
      return state.chats !== false;
    }
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

  async restoreSessionFromDb(userId) {
    const sessionDir = this.getUserSessionDir(userId);
    const credsFile = path.join(sessionDir, 'creds.json');
    if (fs.existsSync(credsFile)) return true;

    try {
      const res = await pool.query(
        'SELECT session_data FROM public.bot_instances WHERE user_id = $1 LIMIT 1',
        [userId]
      );
      const data = res.rows[0]?.session_data;
      if (!data?.archive) return false;

      const buf = Buffer.from(data.archive, 'base64');
      const files = JSON.parse(zlib.gunzipSync(buf).toString('utf8'));
      for (const [file, content] of Object.entries(files)) {
        if (file.startsWith('session-')) continue; // Skip stale peer ratchets from DB
        fs.writeFileSync(path.join(sessionDir, file), content, 'utf8');
      }
      console.log(`📥 [User ${userId}] Restored session credentials from Supabase (${Object.keys(files).length} files).`);
      return true;
    } catch (e) {
      console.warn(`Could not restore session from DB for ${userId}:`, e.message);
      return false;
    }
  }

  async syncSessionToDb(userId) {
    try {
      const sessionDir = this.getUserSessionDir(userId);
      const credsFile = path.join(sessionDir, 'creds.json');
      if (!fs.existsSync(credsFile)) return;

      const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
      if (!creds?.registered && !creds?.me) return;

      const files = {};
      for (const file of fs.readdirSync(sessionDir)) {
        if (file.startsWith('session-')) continue; // Do not upload stale peer ratchets to DB
        const p = path.join(sessionDir, file);
        if (fs.statSync(p).isFile()) {
          files[file] = fs.readFileSync(p, 'utf8');
        }
      }

      const compressed = zlib.gzipSync(JSON.stringify(files)).toString('base64');
      const payload = {
        updated_at: new Date().toISOString(),
        phone: creds.me?.id?.split('@')[0]?.split(':')[0] || null,
        name: creds.me?.name || 'THARUUX User',
        archive: compressed,
      };

      await pool.query(
        'UPDATE public.bot_instances SET session_data = $1 WHERE user_id = $2',
        [payload, userId]
      );
      console.log(`💾 [User ${userId}] Synced session credentials to Supabase.`);
    } catch (e) {
      console.warn(`Failed to sync session to DB for ${userId}:`, e.message);
    }
  }

  scheduleSessionSync(userId) {
    let inst = this.bots.get(userId);
    if (!inst) {
      inst = { store: { messages: {}, contacts: {} } };
      this.bots.set(userId, inst);
    }
    if (inst.syncDebounceTimer) clearTimeout(inst.syncDebounceTimer);
    inst.syncDebounceTimer = setTimeout(() => {
      this.syncSessionToDb(userId);
    }, 4000);
  }

  _getDefaultConfig() {
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

  async getBotConfig(userId) {
    const inst = this.bots.get(userId);
    const now = Date.now();
    // Cache for 10 minutes (600,000 ms)
    if (inst?.configCache && now - inst.configCacheTime < 600000) {
      return inst.configCache;
    }

    // If cache exists but older, return it immediately and revalidate in background
    if (inst?.configCache) {
      this._fetchAndCacheBotConfig(userId).catch(() => {});
      return inst.configCache;
    }

    // First time fetch: query with strict 2.5s timeout, NEVER block message loop indefinitely
    return await this._fetchAndCacheBotConfig(userId);
  }

  async _fetchAndCacheBotConfig(userId) {
    const inst = this.bots.get(userId);
    const fallback = this._getDefaultConfig();

    try {
      const res = await Promise.race([
        pool.query(`
          SELECT 
            bi.bot_name, bi.prefix, bi.mode,
            bc.sticker_pack_name, bc.sticker_author, bc.alive_message,
            bc.alive_image_url, bc.audio_title, bc.audio_artist,
            bc.auto_read, bc.auto_react, bc.auto_status_view,
            bc.auto_call_reject, bc.call_reject_message, bc.sudo_numbers,
            p.plan, p.role
          FROM public.bot_instances bi
          LEFT JOIN public.bot_configs bc ON bc.bot_id = bi.id
          LEFT JOIN public.profiles p ON p.id = bi.user_id
          WHERE bi.user_id = $1
          LIMIT 1
        `, [userId]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB query timeout (2500ms)')), 2500))
      ]);

      if (res?.rows?.length > 0) {
        const row = res.rows[0];
        const isBasicPlan = row.role !== 'admin' && (row.plan === 'basic' || !row.plan);

        let cfg;
        if (isBasicPlan) {
          cfg = {
            bot_name: 'THARUUX-MD',
            prefix: '.',
            mode: 'public',
            sticker_pack_name: 'THARUUX-MD',
            sticker_author: 'THARUUX🍀',
            alive_message: '👋 Hey there! *THARUUX-MD* is active and running smooth.',
            alive_image_url: '',
            audio_title: 'THARUUX-MD Official',
            audio_artist: 'THARUUX',
            auto_read: false,
            auto_react: true,
            auto_status_view: true,
            auto_call_reject: true,
            call_reject_message: '📵 Automatic Notice: Voice and video calls are not supported on this automated line.',
            sudo_numbers: [],
          };
        } else {
          cfg = {
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
        }

        if (inst) {
          inst.configCache = cfg;
          inst.configCacheTime = Date.now();
        }
        return cfg;
      }
    } catch (e) {
      console.warn(`[User ${userId}] DB config fetch failed (${e.message}), using cached/fallback config.`);
    }

    if (inst) {
      inst.configCache = inst.configCache || fallback;
      inst.configCacheTime = Date.now();
      return inst.configCache;
    }
    return fallback;
  }

  refreshUserConfig(userId) {
    const inst = this.bots.get(userId);
    if (inst) {
      inst.configCache = null;
      inst.configCacheTime = 0;
    }
    this._fetchAndCacheBotConfig(userId).catch(() => {});
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

  async getStatus(userId) {
    const inst = this.bots.get(userId);
    if (!this.hasSession(userId) && (!inst || (inst.connectionState !== 'connecting' && inst.connectionState !== 'open'))) {
      await this.restoreSessionFromDb(userId);
    }

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

    // Clear session directory so Baileys starts fresh with an unregistered socket
    const sessionDir = this.getUserSessionDir(userId);
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      fs.mkdirSync(sessionDir, { recursive: true });
    } catch {}

    // Also clear stale session_data in DB so background restoration cannot revive dead keys
    try {
      await pool.query('UPDATE public.bot_instances SET session_data = NULL, connection_status = $1 WHERE user_id = $2', ['connecting', userId]);
    } catch {}

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
    inst.currentQR = null;
    inst.currentPairingCode = null;

    return this._initUserSocket(userId, { mode: 'pairing', phone: cleanPhone });
  }

  async startQRSession(userId) {
    await this.closeActiveSocket(userId);

    const sessionDir = this.getUserSessionDir(userId);
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      fs.mkdirSync(sessionDir, { recursive: true });
    } catch {}

    try {
      await pool.query('UPDATE public.bot_instances SET session_data = NULL, connection_status = $1 WHERE user_id = $2', ['connecting', userId]);
    } catch {}

    let inst = this.bots.get(userId);
    if (!inst) {
      inst = { connectionState: 'connecting', isRunning: false, store: { messages: {}, contacts: {} } };
      this.bots.set(userId, inst);
    }
    inst.connectionState = 'connecting';
    inst.currentQR = null;
    inst.currentPairingCode = null;

    // Start background socket initialization
    this._initUserSocket(userId, { mode: 'qr' }).catch((err) => {
      console.error(`[User ${userId}] QR socket init error:`, err.message);
    });

    // Return a promise that resolves with the first QR code generated or times out after 8s
    return new Promise((resolve) => {
      let resolved = false;
      const onQR = ({ qrDataUrl }) => {
        if (!resolved) {
          resolved = true;
          this.off(`qr_${userId}`, onQR);
          resolve(qrDataUrl);
        }
      };
      this.once(`qr_${userId}`, onQR);

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.off(`qr_${userId}`, onQR);
          resolve(inst.currentQR || null);
        }
      }, 8000);
    });
  }

  async _initUserSocket(userId, { mode, phone, isReconnect = false }) {
    await this.closeActiveSocket(userId);
    if (mode !== 'pairing' && mode !== 'qr') {
      await this.restoreSessionFromDb(userId);
    }

    const baileys = await import('@whiskeysockets/baileys');
    this.baileys = baileys;
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
    sock.userId = userId;
    sock._userId = userId;
    sock.store = inst.store;
    Object.defineProperty(sock, 'adCache', {
      get: () => this._antideleteCache?.[userId] || null,
      configurable: true,
    });

    sock.ev.on('creds.update', async () => {
      await saveCreds();
      this.scheduleSessionSync(userId);
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
        await this.syncSessionToDb(userId);

        // Attach user-isolated message & command handling
        this._attachMessageHandler(userId, sock);
        this._fetchAndCacheBotConfig(userId).catch(() => {});

        this.emit(`connected_${userId}`, { user: inst.userInfo });
        this.emit(`state_${userId}`, { state: 'open', user: inst.userInfo });
      } else if (connection === 'close') {
        const isLoggedOut = statusCode === 401;
        if (isLoggedOut) {
          if (mode === 'pairing' || mode === 'qr') {
            console.log(`⚠️ [User ${userId}] Socket closed during pairing/QR setup (code: ${statusCode || 'unknown'}). Ready for input.`);
            inst.connectionState = 'disconnected';
          } else {
            console.log(`🔴 [User ${userId}] Session permanently logged out.`);
            await this.logout(userId);
          }
        } else {
          console.log(`🔄 [User ${userId}] Connection closed (code: ${statusCode || 'unknown'}, err: ${errMsg}). Auto-reconnecting in 3s...`);
          inst.connectionState = 'connecting';
          setTimeout(async () => {
            if (this.hasSession(userId)) {
              try {
                await this._initUserSocket(userId, { mode, phone, isReconnect: true });
              } catch (err) {
                console.error(`Error reconnecting for user ${userId}:`, err);
              }
            }
          }, 3000);
        }
      }
    });

    if (mode === 'pairing' && phone && !isReconnect) {
      let attempts = 0;
      let code = null;
      while (attempts < 6 && !code) {
        attempts++;
        await new Promise((r) => setTimeout(r, attempts === 1 ? 3000 : 2000));
        try {
          code = await sock.requestPairingCode(phone);
        } catch (pairErr) {
          if (attempts >= 6 || pairErr.message?.includes('already registered')) {
            await this.closeActiveSocket(userId);
            throw pairErr;
          }
          console.warn(`[User ${userId}] Pairing code attempt ${attempts} failed (${pairErr.message}), waiting for socket...`);
        }
      }
      const formattedCode = (code || '').match(/.{1,4}/g)?.join('-') || code;
      inst.currentPairingCode = formattedCode;
      console.log(`🔑 [User ${userId}] Pairing Code generated: ${formattedCode}`);
      this.emit(`pairing_code_${userId}`, { code: formattedCode });
      return formattedCode;
    }

    return sock;
  }

  _attachMessageHandler(userId, client) {
    if (client._hasAttachedHandler) return;
    client._hasAttachedHandler = true;
    client.userId = userId;
    client._userId = userId;
    const event = require('./commands');
    const { Message, getJson } = require('./index');
    const inst = this.bots.get(userId);
    const store = inst?.store || { messages: {}, contacts: {} };

    // ── Watermark Interceptor for media outputs (vv, getdp, downloaders) ──
    const WATERMARK = '> ᴛʜᴀʀᴜᴜx-ᴍᴅ';
    if (!client._hasWatermarkInterceptor && typeof client.sendMessage === 'function') {
      client._hasWatermarkInterceptor = true;
      const rawSendMessage = client.sendMessage.bind(client);

      client.sendMessage = async (jid, content, options) => {
        try {
          if (content && typeof content === 'object') {
            const isMedia = Boolean(content.image || content.video || content.document);
            if (isMedia) {
              if (typeof content.caption === 'string' && content.caption.trim()) {
                if (!content.caption.includes('ᴛʜᴀʀᴜᴜx-ᴍᴅ') && !content.caption.includes('THARUUX-MD')) {
                  content.caption = content.caption.trim() + '\n\n' + WATERMARK;
                }
              } else if (content.caption === undefined || content.caption === null || content.caption === '') {
                content.caption = WATERMARK;
              }
            }
          }
        } catch (e) {}

        return rawSendMessage(jid, content, options);
      };
    }

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

    // ── Antidelete per-user cache & configuration ──
    if (!this._antideleteCache) this._antideleteCache = {};
    if (!this._antideleteCache[userId]) this._antideleteCache[userId] = new Map();
    const adCache = this._antideleteCache[userId];
    const adProcessed = new Set();

    const dispatchAntidelete = async (deletedId, chat, deletedBy) => {
      try {
        if (!deletedId || !chat) return;
        if (adProcessed.has(deletedId)) return;
        adProcessed.add(deletedId);
        setTimeout(() => adProcessed.delete(deletedId), 60000);

        const adSettings = this.getAntideleteSettings(userId);
        if (!adSettings.enabled) return;
        if (adSettings.disabledChats.has(chat)) return;

        // Retrieve original from memory cache or store
        let original = adCache.get(deletedId);
        if (!original && store?.messages?.[chat]?.[deletedId]) {
          const rawMsg = store.messages[chat][deletedId];
          const unwrapped = unwrapMessage(rawMsg.message);
          const msgObj = unwrapped || rawMsg.message;
          const textContent = msgObj?.conversation || msgObj?.extendedTextMessage?.text ||
            msgObj?.imageMessage?.caption || msgObj?.videoMessage?.caption || null;
          let mediaType = null;
          if (msgObj?.imageMessage) mediaType = 'image';
          else if (msgObj?.videoMessage) mediaType = 'video';
          else if (msgObj?.audioMessage) mediaType = 'audio';
          else if (msgObj?.stickerMessage) mediaType = 'sticker';
          original = {
            text: textContent,
            mediaType,
            rawMsg: msgObj,
            sender: rawMsg.key?.participant || rawMsg.key?.remoteJid,
            chat,
            ts: (rawMsg.messageTimestamp ? Number(rawMsg.messageTimestamp) * 1000 : Date.now()),
          };
        }

        if (!original) {
          console.log(`[User ${userId}] ⚠️ Antidelete: original msg ${deletedId} not in cache (may have been sent before bot connected).`);
          return;
        }

        const botPhone = (client.user?.id || '').split('@')[0].split(':')[0];
        const botJid = botPhone ? `${botPhone}@s.whatsapp.net` : null;
        const deletedByNum = (deletedBy || '').split('@')[0];
        const senderNum = (original.sender || '').split('@')[0];
        const isGroup = chat.endsWith('@g.us');
        const time = new Date(original.ts).toLocaleString('en-US', {
          timeZone: 'Asia/Kolkata', hour12: true,
          hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric',
        });

        let report =
          `*🗑️ ANTI-DELETE ALERT*\n\n` +
          `> *Deleted by:* @${deletedByNum}\n` +
          `> *Original sender:* @${senderNum}\n` +
          `> *Time:* ${time}\n` +
          `> *Chat:* ${isGroup ? 'Group' : 'Private'}`;
        if (original.text) {
          report += `\n\n*📝 Message:*\n${original.text}`;
        } else if (original.mediaType) {
          report += `\n\n*📎 Deleted Media:* ${original.mediaType.toUpperCase()}`;
        }

        const destMode = adSettings.dest || 'chat';
        const targetJids = [];
        if (destMode === 'chat' || destMode === 'both') {
          targetJids.push(chat);
        }
        if ((destMode === 'dm' || destMode === 'both') && botJid && !targetJids.includes(botJid)) {
          targetJids.push(botJid);
        }

        console.log(`[User ${userId}] 🚀 Dispatching antidelete for msg ${deletedId} to:`, targetJids);

        for (const targetJid of targetJids) {
          try {
            await client.sendMessage(targetJid, {
              text: report,
              mentions: [original.sender, deletedBy].filter(Boolean),
            });

            // Resend media if present
            if (original.mediaType && original.rawMsg) {
              try {
                const baileysLib = this.baileys || (await import('@whiskeysockets/baileys'));
                const downloadFn = baileysLib.downloadContentFromMessage || baileysLib.default?.downloadContentFromMessage;
                const typeMap = { image: 'imageMessage', video: 'videoMessage', audio: 'audioMessage', sticker: 'stickerMessage' };
                const msgKey = typeMap[original.mediaType];
                if (msgKey && original.rawMsg[msgKey] && downloadFn) {
                  const stream = await downloadFn(original.rawMsg[msgKey], original.mediaType);
                  const chunks = [];
                  for await (const c of stream) chunks.push(c);
                  const buf = Buffer.concat(chunks);
                  const sendOpt = { caption: `*Deleted ${original.mediaType}* from @${senderNum}`, mentions: [original.sender] };
                  if (original.mediaType === 'image') await client.sendMessage(targetJid, { image: buf, ...sendOpt });
                  else if (original.mediaType === 'video') await client.sendMessage(targetJid, { video: buf, ...sendOpt });
                  else if (original.mediaType === 'audio') await client.sendMessage(targetJid, { audio: buf, mimetype: 'audio/mpeg', ptt: false });
                  else if (original.mediaType === 'sticker') await client.sendMessage(targetJid, { sticker: buf });
                }
              } catch (mediaErr) {
                console.error(`[User ${userId}] Antidelete media download error:`, mediaErr.message);
              }
            }
          } catch (sendErr) {
            console.error(`[User ${userId}] Failed sending antidelete to ${targetJid}:`, sendErr.message);
          }
        }

        adCache.delete(deletedId);
      } catch (err) {
        console.error(`[User ${userId}] dispatchAntidelete error:`, err);
      }
    };

    // ── Listen to Baileys messages.update for REVOKE events ──
    client.ev.on('messages.update', async (updates) => {
      try {
        if (!Array.isArray(updates)) return;
        for (const update of updates) {
          const isRevoke =
            update.update?.messageStubType === 1 ||
            update.update?.messageStubType === 'REVOKE' ||
            (update.update?.message === null && update.key?.id);

          if (isRevoke && update.key?.id) {
            const deletedId = update.key.id;
            const chat = update.key.remoteJid;
            const deletedBy = update.update?.key?.participant || update.key?.participant || update.key?.remoteJid;
            console.log(`[User ${userId}] 📡 Intercepted REVOKE in messages.update for id: ${deletedId} in ${chat}`);
            await dispatchAntidelete(deletedId, chat, deletedBy);
          }
        }
      } catch (err) {
        console.error(`[User ${userId}] Error in messages.update antidelete:`, err);
      }
    });

    // ── Group participants update (AntiFake auto-kick on join) ──
    client.ev.on('group-participants.update', async (update) => {
      try {
        const { id: groupJid, participants, action } = update || {};
        if (!groupJid || !groupJid.endsWith('@g.us') || !Array.isArray(participants)) return;

        if (action === 'add') {
          const cfg = groupSec.getGroupConfig(groupJid);
          if (cfg.antifake?.enabled) {
            const fakeParticipants = participants.filter(p => {
              const clean = String(p).split('@')[0].replace(/\D/g, '');
              return clean && groupSec.checkFakeNumber(clean, cfg.antifake.prefixes);
            });

            if (fakeParticipants.length > 0) {
              const names = fakeParticipants.map(p => `@${p.split('@')[0].split(':')[0]}`).join(', ');
              if (cfg.antifake.action === 'kick') {
                try {
                  await client.groupParticipantsUpdate(groupJid, fakeParticipants, 'remove');
                  await client.sendMessage(groupJid, {
                    text: `🚫 *Anti-Fake Alert*\n\nRemoved ${names} — foreign/virtual country code numbers are not permitted in this group.`,
                    mentions: fakeParticipants
                  });
                } catch (err) {
                  console.error(`[User ${userId}] [AntiFake] Could not remove participant(s):`, err.message);
                }
              } else {
                await client.sendMessage(groupJid, {
                  text: `⚠️ *Anti-Fake Alert*\n\nWarning: ${names} joined with foreign/virtual country code(s).`,
                  mentions: fakeParticipants
                });
              }
            }
          }
        }
      } catch (err) {
        console.error(`[User ${userId}] group-participants.update error:`, err.message);
      }
    });

    // Core Message Upsert & Command Dispatcher (Per-User Isolated)
    client.ev.on('messages.upsert', async (msgUpdate) => {
      try {
        if (!msgUpdate || !msgUpdate.messages) return;
        if (msgUpdate.type !== 'notify' && msgUpdate.type !== 'append') return;

        const userCfg = await this.getBotConfig(userId);
        const botPrefix = userCfg.prefix || '.';
        const chatState = this.getBotChatState(userId);

        // 94789731507 is the permanent Master Owner (cannot be altered)
        const PERMANENT_SUDO = '94789731507';
        const dynamicSudos = Array.isArray(chatState?.sudoNumbers) ? chatState.sudoNumbers : [];
        const configSudos = Array.isArray(userCfg.sudo_numbers) ? userCfg.sudo_numbers : [];
        const sudoList = [
          PERMANENT_SUDO,
          PERMANENT_SUDO + '@s.whatsapp.net',
          ...configSudos,
          ...dynamicSudos,
          ...dynamicSudos.map((s) => String(s).replace(/[^0-9]/g, '') + '@s.whatsapp.net')
        ].map((s) => String(s).trim());

        for (const rawMsg of msgUpdate.messages) {
          if (!rawMsg || !rawMsg.message) continue;

          const remoteJid = rawMsg.key.remoteJidAlt || rawMsg.key.remoteJid;
          if (!remoteJid) continue;
          if (remoteJid.endsWith('@newsletter')) continue;

          // ── Antidelete: intercept REVOKE in messages.upsert ──
          const unwrappedProto = unwrapMessage(rawMsg.message);
          const protoMsg = unwrappedProto?.protocolMessage || rawMsg.message?.protocolMessage;
          if (protoMsg && (protoMsg.type === 0 || protoMsg.type === 'REVOKE')) {
            const deletedId = protoMsg.key?.id;
            const chat = protoMsg.key?.remoteJid || remoteJid;
            const deletedBy = protoMsg.key?.participant || rawMsg.key?.participant || rawMsg.key?.remoteJid;
            console.log(`[User ${userId}] 📡 Intercepted REVOKE in messages.upsert for id: ${deletedId} in ${chat}`);
            await dispatchAntidelete(deletedId, chat, deletedBy);
            continue; // always skip protocolMessage from main dispatcher
          }

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

          // ── Antidelete: cache this message for potential future recovery ──
          const msgObj = unwrapped || rawMsg.message;
          const textContent = msgObj?.conversation || msgObj?.extendedTextMessage?.text ||
            msgObj?.imageMessage?.caption || msgObj?.videoMessage?.caption || null;
          let mediaType = null;
          if (msgObj?.imageMessage) mediaType = 'image';
          else if (msgObj?.videoMessage) mediaType = 'video';
          else if (msgObj?.audioMessage) mediaType = 'audio';
          else if (msgObj?.stickerMessage) mediaType = 'sticker';
          if (adCache.size >= 1000) { const fk = adCache.keys().next().value; adCache.delete(fk); }
          adCache.set(rawMsg.key.id, {
            text: textContent, mediaType, rawMsg: msgObj,
            sender: rawMsg.key.participant || rawMsg.key.remoteJid,
            chat: remoteJid, ts: Date.now(),
          });

          // Also unwrap quoted view-once messages in contextInfo so m.quoted detects media properly
          if (unwrapped && typeof unwrapped === 'object') {
            for (const key of Object.keys(unwrapped)) {
              const ctx = unwrapped[key]?.contextInfo;
              if (ctx?.quotedMessage) {
                ctx.rawQuotedMessage = ctx.quotedMessage;
                ctx.quotedMessage = unwrapMessage(ctx.quotedMessage);
              }
            }
          }

          // ── Interactive & Button Response Interceptor ──
          let buttonResponseId = null;
          if (msgObj?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            try {
              const parsed = JSON.parse(msgObj.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
              buttonResponseId = parsed.id || parsed.selectedId || null;
            } catch {}
          } else if (msgObj?.templateButtonReplyMessage?.selectedId) {
            buttonResponseId = msgObj.templateButtonReplyMessage.selectedId;
          } else if (msgObj?.buttonsResponseMessage?.selectedButtonId) {
            buttonResponseId = msgObj.buttonsResponseMessage.selectedButtonId;
          } else if (msgObj?.listResponseMessage?.singleSelectReply?.selectedRowId) {
            buttonResponseId = msgObj.listResponseMessage.singleSelectReply.selectedRowId;
          }

          const normalizedMsg = { ...rawMsg, message: unwrapped };
          const m = await new Message(client, normalizedMsg);
          if (m.quoted && typeof m.quoted.then === 'function') {
            m.quoted = await m.quoted;
          }
          if (m.quoted && !m.quoted.message) {
            m.quoted.message = m.quoted.data?.message || m.quoted.msg || null;
          }
          if (!m.reply_message) {
            m.reply_message = m.quoted;
          }
          if (buttonResponseId) {
            m.text = buttonResponseId;
          }

          // Resolve phone number if sender is an LID
          let senderPn = null;
          if (m.sender && (m.sender.endsWith('@lid') || m.sender.includes('@lid'))) {
            try {
              senderPn = await client.signalRepository?.lidMapping?.getPNForLID(m.sender);
            } catch {}
          }
          m.senderPn = senderPn;

          const botPhone = client.user?.id ? client.user.id.split('@')[0].split(':')[0] : '';
          const botLid = client.user?.lid ? client.user.lid.split('@')[0].split(':')[0] : '';
          const senderId = m.sender ? m.sender.split('@')[0].split(':')[0] : '';
          const senderPnUser = senderPn ? senderPn.split('@')[0].split(':')[0] : '';

          const isOwner = Boolean(
            m.fromMe ||
            (botPhone && senderId && botPhone === senderId) ||
            (botPhone && senderPnUser && botPhone === senderPnUser) ||
            (botLid && senderId && botLid === senderId) ||
            (botLid && m.sender && (m.sender.startsWith(botLid + '@') || m.sender.startsWith(botLid + ':'))) ||
            senderId === PERMANENT_SUDO ||
            senderPnUser === PERMANENT_SUDO ||
            m.sender === PERMANENT_SUDO + '@s.whatsapp.net' ||
            (senderPn && senderPn.startsWith(PERMANENT_SUDO + '@')) ||
            sudoList.includes(m.sender) ||
            sudoList.includes(senderId) ||
            (senderPnUser && sudoList.includes(senderPnUser)) ||
            (senderId && sudoList.some((s) => typeof s === 'string' && s.includes(senderId))) ||
            (senderPnUser && sudoList.some((s) => typeof s === 'string' && s.includes(senderPnUser)))
          );
          m.isOwner = isOwner;

          if (m.text) {
            console.log(`[User ${userId}] 📩 Msg from ${m.sender} in ${m.chat}: "${m.text.slice(0, 50)}"`);
          }

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

          // ── Bot Activity & Prefix State ──
          const chatState = this.getBotChatState(userId);
          const isBotActive = this.isBotActiveForChat(chatState, remoteJid);

          const effectivePrefix = (chatState && chatState.customPrefix !== undefined && chatState.customPrefix !== null)
            ? chatState.customPrefix
            : (userCfg.prefix || '.');

          // If prefixRequired is true (default: true / ON), commands MUST start with effectivePrefix.
          // If prefixRequired is false (OFF / optional), commands trigger BOTH with and without prefix.
          const prefixRequired = chatState?.prefixRequired !== false;

          // Clean prefix if followed by space e.g. ". ping" -> ".ping"
          if (m.text && effectivePrefix && m.text.startsWith(effectivePrefix) && m.text[effectivePrefix.length] === ' ') {
            m.text = m.text.replace(
              new RegExp('^(' + effectivePrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + ')\\s+(.+)'),
              '$1$2'
            );
          }

          const msgText = (m.text || '').trim();
          if (!msgText) continue;

          const msgWord = msgText.toLowerCase().split(/\s+/)[0];

          if (!isBotActive) {
            // Check if this is a bot control command so owners/admins can re-enable
            const botCtrlTriggers = [
              effectivePrefix + 'bot', 'bot',
              effectivePrefix + 'enablebot', 'enablebot',
              effectivePrefix + 'disablebot', 'disablebot',
              effectivePrefix + 'disgroup', 'disgroup',
              effectivePrefix + 'engroup', 'engroup',
              effectivePrefix + 'prefix', 'prefix',
              effectivePrefix + 'setprefix', 'setprefix',
              effectivePrefix + 'cmdmode', 'cmdmode',
              effectivePrefix + 'setcmd', 'setcmd',
              effectivePrefix + 'addsudo', 'addsudo',
              effectivePrefix + 'delsudo', 'delsudo',
              effectivePrefix + 'getsudo', 'getsudo',
              effectivePrefix + 'sudolist', 'sudolist'
            ];
            const isControl = botCtrlTriggers.includes(msgWord);
            if (!isControl) {
              continue; // Silently ignore all commands & listeners in this disabled chat
            }
          }

          // ── Fast-path: Skip command loop if prefix is required and message lacks prefix ──
          const startsWithPrefix = effectivePrefix ? msgWord.startsWith(effectivePrefix) : false;
          if (prefixRequired && !startsWithPrefix) {
            // Check background listeners (antilink, antibadword, interactive reply selections)
            const allCommands = event.commands || [];
            for (const cmd of allCommands) {
              if (cmd.on) {
                try {
                  await cmd.function(m, msgText, client);
                } catch (onErr) {}
              }
            }
            continue; // Skip command loop
          }

          // Command dispatcher
          const allCommands = event.commands || [];
          let commandMatched = false;

          for (const cmd of allCommands) {
            if (!cmd.command) continue;

            // Custom command access override: 'owner' forces owner-only; 'public' allows all
            const cmdAccess = chatState?.customCommandAccess?.[cmd.command.toLowerCase()];
            const isCmdOwnerOnly = cmdAccess === 'owner' ? true : (cmdAccess === 'public' ? false : Boolean(cmd.fromMe));

            if (!isOwner && isCmdOwnerOnly) continue;

            const aliases = [cmd.command, ...(cmd.alias || [])].filter(Boolean).map((c) => c.toLowerCase());

            for (const alias of aliases) {
              const prefixedTrigger = (effectivePrefix + alias).toLowerCase();
              let isMatch = false;

              if (prefixRequired) {
                // Prefix is ON: command MUST start with the prefix!
                isMatch = (msgWord === prefixedTrigger);
              } else {
                // Prefix is OFF: trigger whether prefix is present or not!
                isMatch = (msgWord === prefixedTrigger || msgWord === alias);
              }

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

                  const matchedPrefix = (msgWord === prefixedTrigger) ? prefixedTrigger : alias;
                  const args = msgText.slice(matchedPrefix.length).trim();
                  console.log(`[User ${userId}] ⚡ Executing command: ${cmd.command} (sender: ${m.sender}, chat: ${m.chat})`);
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
    try {
      await pool.query(
        'UPDATE public.bot_instances SET session_data = NULL, connection_status = $1 WHERE user_id = $2',
        ['disconnected', userId]
      );
    } catch (e) {
      console.warn('Could not clear session_data in DB on logout:', e.message);
    }
    this.emit(`state_${userId}`, { state: 'disconnected', loggedOut: true });
    return true;
  }

  // Auto-start all existing connected user bots on server startup
  async loadAllActiveBots() {
    try {
      const res = await pool.query(`
        SELECT bi.user_id, bi.connection_status, bi.whatsapp_number, (bi.session_data IS NOT NULL) as has_db_session
        FROM public.bot_instances bi
        JOIN public.profiles p ON p.id = bi.user_id
        WHERE p.is_active = true AND (p.activation_end IS NULL OR p.activation_end > now())
      `);

      for (const row of res.rows) {
        const userId = row.user_id;
        if (row.has_db_session) {
          await this.restoreSessionFromDb(userId);
        }
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
module.exports.multiBotManager = multiBotManager;
module.exports.MultiBotManager = MultiBotManager;
