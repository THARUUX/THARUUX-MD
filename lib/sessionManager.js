const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const QRCode = require('qrcode');
const pino = require('pino');
const config = require('../config');

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.sessionDir = path.resolve(__dirname, 'session');
    this.credsPath = path.join(this.sessionDir, 'creds.json');
    this.currentSocket = null;
    this.currentQR = null;
    this.currentPairingCode = null;
    this.connectionState = 'disconnected'; // disconnected, connecting, open, closing
    this.userInfo = null;
    this.isBotRunning = false;
    this.qrTimeout = null;

    // Ensure session directory exists
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }

    // Check if session ID was provided via config
    this.initFromConfig();
  }

  initFromConfig() {
    if (config.SESSION_ID && (config.SESSION_ID.startsWith('Phoenix~') || config.SESSION_ID.startsWith('THARUUX~'))) {
      const base64Data = config.SESSION_ID.replace(/^(Phoenix|THARUUX)~/, '').trim();
      try {
        const decoded = Buffer.from(base64Data, 'base64').toString('utf8');
        const parsed = JSON.parse(decoded);
        fs.writeFileSync(this.credsPath, JSON.stringify(parsed, null, 2));
        console.log('✅ Loaded session credentials from config.SESSION_ID');
      } catch (err) {
        console.warn('⚠️ Could not parse config.SESSION_ID as base64 JSON creds:', err.message);
      }
    }
  }

  hasSession() {
    if (!fs.existsSync(this.credsPath)) return false;
    try {
      const creds = JSON.parse(fs.readFileSync(this.credsPath, 'utf8'));
      return !!(creds && (creds.registered === true || (creds.me && creds.me.id)));
    } catch {
      return false;
    }
  }

  clearSessionDir() {
    if (fs.existsSync(this.sessionDir)) {
      try {
        const files = fs.readdirSync(this.sessionDir);
        for (const file of files) {
          if (file !== 'abhi.js') {
            fs.rmSync(path.join(this.sessionDir, file), { recursive: true, force: true });
          }
        }
      } catch (e) {
        console.error('Error clearing session dir:', e);
      }
    }
  }

  getSessionString() {
    if (!this.hasSession()) return null;
    try {
      const raw = fs.readFileSync(this.credsPath, 'utf8');
      return 'THARUUX~' + Buffer.from(raw).toString('base64');
    } catch {
      return null;
    }
  }

  getStatus() {
    let credsUser = null;
    if (this.hasSession()) {
      try {
        const creds = JSON.parse(fs.readFileSync(this.credsPath, 'utf8'));
        if (creds && creds.me) {
          credsUser = {
            id: creds.me.id || creds.me.jid,
            name: creds.me.name || 'THARUUX-MD User',
            phone: (creds.me.id || creds.me.jid || '').split('@')[0].split(':')[0]
          };
        }
      } catch {}
    }

    return {
      hasSession: this.hasSession(),
      connectionState: this.connectionState,
      isBotRunning: this.isBotRunning,
      user: this.userInfo || credsUser,
      currentQR: this.currentQR,
      currentPairingCode: this.currentPairingCode,
      sessionId: this.getSessionString(),
      botMode: config.MODE || 'private'
    };
  }

  async closeActiveSocket() {
    if (this.currentSocket) {
      try {
        this.currentSocket.ev.removeAllListeners();
        this.currentSocket.end(undefined);
      } catch {}
      this.currentSocket = null;
    }
    this.currentQR = null;
    this.currentPairingCode = null;
    if (this.qrTimeout) {
      clearTimeout(this.qrTimeout);
      this.qrTimeout = null;
    }
  }

  async startQRSession() {
    await this.closeActiveSocket();
    if (!this.hasSession()) {
      this.clearSessionDir();
    }
    this.connectionState = 'connecting';
    this.emit('state', { state: 'connecting', mode: 'qr' });
    return this._initSocket({ mode: 'qr' });
  }

  async startPairingSession(phoneNumber) {
    await this.closeActiveSocket();
    if (!this.hasSession()) {
      this.clearSessionDir();
    }
    this.connectionState = 'connecting';
    this.emit('state', { state: 'connecting', mode: 'pairing' });

    const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      throw new Error('Please enter a valid phone number with country code (e.g. 1234567890)');
    }
    return this._initSocket({ mode: 'pairing', phone: cleanPhone });
  }

  async _initSocket({ mode, phone, isReconnect = false }) {
    const baileys = await import('@whiskeysockets/baileys');
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { state, saveCreds } = await baileys.useMultiFileAuthState(this.sessionDir);
    const { version } = await baileys.fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      auth: state,
      printQRInTerminal: false,
      browser: baileys.Browsers.ubuntu('Chrome'),
      syncFullHistory: false
    });

    this.currentSocket = sock;

    sock.ev.on('creds.update', async () => {
      await saveCreds();
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const errMsg = lastDisconnect?.error?.message || '';

      console.log(`📡 [Baileys Event] (${mode}${isReconnect ? '-reconnect' : ''}) Connection update:`, connection || 'in-progress', lastDisconnect ? `(code: ${statusCode}, msg: ${errMsg})` : '');

      if (qr && mode === 'qr') {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, {
            margin: 2,
            scale: 8,
            color: { dark: '#0064e0', light: '#ffffff' }
          });
          this.currentQR = qrDataUrl;
          this.emit('qr', { qrDataUrl, rawQR: qr });
        } catch (e) {
          console.error('QR code generation error:', e);
        }
      }

      if (connection === 'connecting') {
        this.connectionState = 'connecting';
        this.emit('state', { state: 'connecting' });
      } else if (connection === 'open') {
        this.connectionState = 'open';
        this.currentQR = null;
        this.currentPairingCode = null;
        let userName = sock.user?.name;
        if (!userName) {
          try {
            const creds = JSON.parse(fs.readFileSync(this.credsPath, 'utf8'));
            userName = creds?.me?.name;
          } catch {}
        }
        this.userInfo = {
          id: sock.user?.id || '',
          name: userName || 'THARUUX User',
          phone: (sock.user?.id || '').split('@')[0].split(':')[0]
        };
        const sessionId = this.getSessionString();
        console.log('🎉 WhatsApp Connected successfully as:', this.userInfo.name, `(${this.userInfo.phone})`);
        this.emit('connected', { user: this.userInfo, sessionId });
        this.emit('state', { state: 'open', user: this.userInfo, sessionId });
      } else if (connection === 'close') {
        if (statusCode === 401) {
          console.log('🔴 WhatsApp session logged out.');
          this.logout();
        } else if (
          statusCode === 515 ||
          statusCode === 428 ||
          statusCode === 408 ||
          errMsg.includes('restart required') ||
          errMsg.includes('Stream Errored')
        ) {
          console.log(`🔄 WhatsApp handshake requires restart (code ${statusCode || 'stream error'}). Reconnecting socket in 2 seconds...`);
          setTimeout(async () => {
            if (this.connectionState !== 'disconnected' || !this.hasSession()) {
              try {
                await this._initSocket({ mode, phone, isReconnect: true });
              } catch (err) {
                console.error('Error during auto-reconnect:', err);
              }
            }
          }, 2000);
        } else {
          this.connectionState = 'disconnected';
          this.currentQR = null;
          this.currentPairingCode = null;
          this.emit('state', { state: 'disconnected', statusCode });
        }
      }
    });

    if (mode === 'pairing' && phone && !isReconnect) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const code = await sock.requestPairingCode(phone);
        const formattedCode = (code || '').match(/.{1,4}/g)?.join('-') || code;
        this.currentPairingCode = formattedCode;
        console.log('🔑 WhatsApp Pairing Code generated:', formattedCode, 'for phone:', phone);
        this.emit('pairing_code', { code: formattedCode });
        return formattedCode;
      } catch (err) {
        await this.closeActiveSocket();
        throw err;
      }
    }

    return sock;
  }

  logout() {
    this.closeActiveSocket();
    this.clearSessionDir();
    this.userInfo = null;
    this.connectionState = 'disconnected';
    this.isBotRunning = false;
    this.emit('state', { state: 'disconnected', loggedOut: true });
    return true;
  }
}

const sessionManager = new SessionManager();
module.exports = sessionManager;
