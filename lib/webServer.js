const express = require('express');
const path = require('path');
const fs = require('fs');
const multiBotManager = require('./multiBotManager');
const config = require('../config');
const commands = require('./commands');

function setupWebServer(app) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Serve static UI assets
  app.use('/public', express.static(publicDir));

  // Boot all active multi-tenant bot instances
  multiBotManager.loadAllActiveBots().catch(console.error);

  // Server-Sent Events (SSE) for real-time live connection updates
  const sseClients = new Map(); // clientId -> { res, userId }

  function broadcastUserEvent(userId, eventType, data) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [res, clientUserId] of sseClients.entries()) {
      if (!clientUserId || clientUserId === userId) {
        try {
          res.write(payload);
        } catch {
          sseClients.delete(res);
        }
      }
    }
  }

  // Current status endpoint (strictly isolated per userId)
  app.get('/api/status', async (req, res) => {
    const userId = req.query.userId;

    const pluginsDir = path.resolve(__dirname, '../plugins');
    let plugins = [];
    if (fs.existsSync(pluginsDir)) {
      plugins = fs.readdirSync(pluginsDir).filter((f) => f.endsWith('.js')).map((f) => f.replace('.js', ''));
    }

    if (!userId) {
      return res.json({
        success: true,
        source: 'no_user',
        hasSession: false,
        connectionState: 'disconnected',
        isBotRunning: false,
        user: null,
        currentQR: null,
        currentPairingCode: null,
        botMode: 'public',
        prefix: '.',
        commandsCount: commands.commands?.length || 0,
        pluginsCount: plugins.length,
        plugins,
        uptime: process.uptime(),
      });
    }

    const status = multiBotManager.getStatus(userId);
    const userCfg = await multiBotManager.getBotConfig(userId);

    res.json({
      success: true,
      userId,
      source: 'user_bot',
      ...status,
      botMode: userCfg.mode || 'public',
      prefix: userCfg.prefix || '.',
      commandsCount: commands.commands?.length || 0,
      pluginsCount: plugins.length,
      plugins,
      uptime: process.uptime(),
    });
  });

  // Start QR Code generation for a specific user
  app.post('/api/session/qr', async (req, res) => {
    try {
      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }

      await multiBotManager.startQRSession(userId);
      res.json({ success: true, message: 'QR session initiated. Watching for QR code...' });
    } catch (err) {
      console.error('Failed to start QR session:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Start Pairing Code generation for a specific user
  app.post('/api/session/pairing', async (req, res) => {
    try {
      const phone = req.body.phone || req.body.phoneNumber;
      const userId = req.body.userId;

      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }
      if (!phone) {
        return res.status(400).json({ success: false, error: 'Phone number is required' });
      }

      const code = await multiBotManager.startPairingSession(userId, phone);
      res.json({ success: true, code, message: 'Pairing code generated' });
    } catch (err) {
      console.error('Failed to generate pairing code:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Logout / disconnect a specific user's bot
  app.post('/api/session/logout', async (req, res) => {
    try {
      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }

      await multiBotManager.logout(userId);
      res.json({ success: true, message: 'Bot disconnected successfully.' });
    } catch (err) {
      console.error('Error logging out bot:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Invalidate cached config when user updates settings
  app.post('/api/bot/config-sync', (req, res) => {
    const userId = req.body.userId;
    if (userId) {
      multiBotManager.refreshUserConfig(userId);
    }
    res.json({ success: true });
  });

  // SSE event stream
  app.get('/api/session/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const userId = req.query.userId || null;
    sseClients.set(res, userId);

    if (userId) {
      const status = multiBotManager.getStatus(userId);
      res.write(`event: state\ndata: ${JSON.stringify(status)}\n\n`);
    }

    req.on('close', () => {
      sseClients.delete(res);
    });
  });
}

module.exports = setupWebServer;
