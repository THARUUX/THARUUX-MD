// THARUUX-MD Web Interface & Session Manager Logic
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const tabQr = document.getElementById('tab-qr');
  const tabPair = document.getElementById('tab-pair');
  const qrPane = document.getElementById('qr-pane');
  const pairPane = document.getElementById('pair-pane');

  const qrPlaceholder = document.getElementById('qr-placeholder');
  const qrImage = document.getElementById('qr-image');
  const qrLoader = document.getElementById('qr-loader');
  const qrLoaderText = document.getElementById('qr-loader-text');
  const qrLaser = document.getElementById('qr-laser');
  const qrTimerBar = document.getElementById('qr-timer-bar');
  const qrTimerProgress = document.getElementById('qr-timer-progress');
  const generateQrBtn = document.getElementById('generate-qr-btn');

  const pairingForm = document.getElementById('pairing-form');
  const phoneInput = document.getElementById('phone-input');
  const getCodeBtn = document.getElementById('get-code-btn');
  const displayPairingCode = document.getElementById('display-pairing-code');
  const copyCodeBtn = document.getElementById('copy-code-btn');

  const authSection = document.getElementById('auth-section');
  const dashboardSection = document.getElementById('dashboard-section');

  const globalStatusDot = document.querySelector('#global-status-badge .status-dot');
  const globalStatusText = document.getElementById('global-status-text');

  const connectedUserName = document.getElementById('connected-user-name');
  const connectedUserPhone = document.getElementById('connected-user-phone');
  const botModeText = document.getElementById('bot-mode-text');
  const toggleModeBtn = document.getElementById('toggle-mode-btn');
  const pluginsCountBadge = document.getElementById('plugins-count-badge');
  const pluginsTotalCount = document.getElementById('plugins-total-count');

  const sessionCodeDisplay = document.getElementById('session-code-display');
  const copySessionBtn = document.getElementById('copy-session-btn');
  const saveEnvBtn = document.getElementById('save-env-btn');
  const startBotNowBtn = document.getElementById('start-bot-now-btn');
  const restartBotBtn = document.getElementById('restart-bot-btn');
  const logoutBtn = document.getElementById('logout-btn');

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const toastContainer = document.getElementById('toast-container');

  let qrCountdownInterval = null;
  let qrTimeLeft = 25;

  // Theme Management
  const savedTheme = localStorage.getItem('tharuux_theme') || 'theme-light';
  document.body.className = savedTheme;

  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('theme-dark');
    document.body.className = isDark ? 'theme-light' : 'theme-dark';
    localStorage.setItem('tharuux_theme', document.body.className);
  });

  // Toast Notification System
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Tabs Switching
  tabQr.addEventListener('click', () => {
    tabQr.classList.add('active');
    tabPair.classList.remove('active');
    qrPane.classList.add('active');
    pairPane.classList.remove('active');
  });

  tabPair.addEventListener('click', () => {
    tabPair.classList.add('active');
    tabQr.classList.remove('active');
    pairPane.classList.add('active');
    qrPane.classList.remove('active');
  });

  // Update Global Header Status Badge
  function updateGlobalStatus(state, message) {
    globalStatusDot.className = 'status-dot';
    if (state === 'open') {
      globalStatusDot.classList.add('open');
      globalStatusText.textContent = message || 'Bot Connected & Online';
    } else if (state === 'connecting') {
      globalStatusDot.classList.add('connecting');
      globalStatusText.textContent = message || 'Connecting WhatsApp...';
    } else {
      globalStatusDot.classList.add('disconnected');
      globalStatusText.textContent = message || 'Disconnected / No Session';
    }
  }

  // Switch between Auth view and Dashboard view
  function renderView(hasSession, statusData) {
    if (hasSession && (statusData.hasSession || statusData.state === 'open')) {
      authSection.classList.add('hidden');
      dashboardSection.classList.remove('hidden');

      if (statusData.user) {
        connectedUserName.textContent = statusData.user.name || 'WhatsApp User';
        connectedUserPhone.textContent = statusData.user.phone ? `+${statusData.user.phone}` : 'Connected';
      }

      if (statusData.sessionId) {
        sessionCodeDisplay.textContent = statusData.sessionId;
      }

      if (statusData.botMode) {
        botModeText.textContent = statusData.botMode.toUpperCase();
      }

      if (statusData.pluginsCount) {
        pluginsCountBadge.textContent = `${statusData.pluginsCount} Active`;
        pluginsTotalCount.textContent = `${statusData.pluginsCount} Plugins Loaded`;
      }

      updateGlobalStatus('open', 'Session Connected & Active');
    } else {
      authSection.classList.remove('hidden');
      dashboardSection.classList.add('hidden');
      updateGlobalStatus('disconnected', 'Ready to Scan or Link');
    }
  }

  // Start QR Code Flow
  async function requestQRCode() {
    qrPlaceholder.classList.add('hidden');
    qrImage.classList.add('hidden');
    qrLoader.classList.remove('hidden');
    qrLoaderText.textContent = 'Contacting WhatsApp servers...';
    qrLaser.classList.add('hidden');
    qrTimerBar.classList.add('hidden');
    generateQrBtn.disabled = true;

    try {
      const res = await fetch('/api/session/qr', { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || 'Failed to start QR session', 'error');
        qrLoader.classList.add('hidden');
        qrPlaceholder.classList.remove('hidden');
        generateQrBtn.disabled = false;
      }
    } catch (e) {
      showToast('Network error while requesting QR code', 'error');
      qrLoader.classList.add('hidden');
      qrPlaceholder.classList.remove('hidden');
      generateQrBtn.disabled = false;
    }
  }

  generateQrBtn.addEventListener('click', requestQRCode);

  // Render Incoming QR Code
  function displayNewQR(qrDataUrl) {
    qrLoader.classList.add('hidden');
    qrPlaceholder.classList.add('hidden');
    qrImage.src = qrDataUrl;
    qrImage.classList.remove('hidden');
    qrLaser.classList.remove('hidden');
    qrTimerBar.classList.remove('hidden');
    generateQrBtn.disabled = false;

    // Reset countdown timer
    if (qrCountdownInterval) clearInterval(qrCountdownInterval);
    qrTimeLeft = 25;
    qrTimerProgress.style.width = '100%';

    qrCountdownInterval = setInterval(() => {
      qrTimeLeft--;
      const percent = (qrTimeLeft / 25) * 100;
      qrTimerProgress.style.width = `${Math.max(0, percent)}%`;

      if (qrTimeLeft <= 0) {
        clearInterval(qrCountdownInterval);
        qrLaser.classList.add('hidden');
      }
    }, 1000);
  }

  // Handle Phone Pairing Code Form
  pairingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = phoneInput.value.trim();
    if (!phone) {
      showToast('Please enter your phone number with country code', 'error');
      return;
    }

    getCodeBtn.disabled = true;
    getCodeBtn.querySelector('.btn-text').textContent = 'Requesting Pairing Code...';
    displayPairingCode.textContent = 'WAITING...';

    try {
      const res = await fetch('/api/session/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (data.success && data.code) {
        displayPairingCode.textContent = data.code;
        copyCodeBtn.disabled = false;
        showToast('Pairing code generated! Check your phone.', 'success');
      } else {
        showToast(data.error || 'Failed to request pairing code', 'error');
        displayPairingCode.textContent = 'FAILED';
      }
    } catch (err) {
      showToast('Error requesting pairing code: ' + err.message, 'error');
      displayPairingCode.textContent = 'ERROR';
    } finally {
      getCodeBtn.disabled = false;
      getCodeBtn.querySelector('.btn-text').textContent = 'Get 8-Digit Pairing Code';
    }
  });

  // Copy Pairing Code Button
  copyCodeBtn.addEventListener('click', () => {
    const raw = displayPairingCode.textContent.replace(/[^0-9A-Z]/gi, '');
    if (raw) {
      navigator.clipboard.writeText(raw).then(() => {
        showToast(`Pairing code ${raw} copied to clipboard!`, 'success');
        copyCodeBtn.querySelector('span').textContent = 'Copied!';
        setTimeout(() => {
          copyCodeBtn.querySelector('span').textContent = 'Copy Code';
        }, 2000);
      });
    }
  });

  // Copy Session String Button
  copySessionBtn.addEventListener('click', () => {
    const sessionStr = sessionCodeDisplay.textContent.trim();
    if (sessionStr && !sessionStr.includes('loading')) {
      navigator.clipboard.writeText(sessionStr).then(() => {
        showToast('Session ID copied to clipboard!', 'success');
        copySessionBtn.querySelector('span').textContent = 'Copied!';
        setTimeout(() => {
          copySessionBtn.querySelector('span').textContent = 'Copy Session String';
        }, 2000);
      });
    }
  });

  // Save to config.env Button
  saveEnvBtn.addEventListener('click', async () => {
    saveEnvBtn.disabled = true;
    try {
      const res = await fetch('/api/session/save-env', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Saved SESSION_ID directly to config.env!', 'success');
      } else {
        showToast(data.error || 'Failed to save to config.env', 'error');
      }
    } catch (e) {
      showToast('Error saving to config.env', 'error');
    } finally {
      saveEnvBtn.disabled = false;
    }
  });

  // Run THARUUX-MD Bot Now Button
  startBotNowBtn.addEventListener('click', async () => {
    startBotNowBtn.disabled = true;
    startBotNowBtn.querySelector('span').textContent = 'Starting Bot...';
    try {
      const res = await fetch('/api/session/start-bot', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('THARUUX-MD Bot is now running live!', 'success');
        startBotNowBtn.querySelector('span').textContent = 'Bot Running Online';
        startBotNowBtn.classList.remove('pulse-glow');
      } else {
        showToast(data.error || 'Failed to start bot', 'error');
        startBotNowBtn.querySelector('span').textContent = 'Run THARUUX-MD Bot Now';
        startBotNowBtn.disabled = false;
      }
    } catch (e) {
      showToast('Error communicating with bot process', 'error');
      startBotNowBtn.disabled = false;
    }
  });

  // Restart Bot Button
  restartBotBtn.addEventListener('click', async () => {
    restartBotBtn.disabled = true;
    showToast('Restarting THARUUX-MD Bot instance...', 'info');
    try {
      const res = await fetch('/api/session/start-bot', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Bot restarted successfully!', 'success');
      } else {
        showToast(data.error || 'Restart failed', 'error');
      }
    } catch (e) {
      showToast('Error restarting bot', 'error');
    } finally {
      restartBotBtn.disabled = false;
    }
  });

  // Toggle Mode (Public / Private)
  toggleModeBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/bot/toggle-mode', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        botModeText.textContent = data.mode.toUpperCase();
        showToast(`Bot mode switched to ${data.mode.toUpperCase()}`, 'success');
      }
    } catch {
      showToast('Failed to switch bot mode', 'error');
    }
  });

  // Logout / Disconnect Button
  logoutBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to disconnect? This will clear the current session.')) {
      return;
    }
    logoutBtn.disabled = true;
    try {
      const res = await fetch('/api/session/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Session cleared. You can link a new account.', 'info');
        renderView(false, { hasSession: false });
      }
    } catch {
      showToast('Error logging out', 'error');
    } finally {
      logoutBtn.disabled = false;
    }
  });

  // Initial Status Check
  async function checkInitialStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      renderView(data.hasSession, data);
    } catch (e) {
      console.warn('Initial status fetch failed:', e);
    }
  }
  checkInitialStatus();

  // Connect to Server-Sent Events (SSE) Stream
  function setupSSE() {
    const eventSource = new EventSource('/api/session/events');

    eventSource.addEventListener('qr', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.qrDataUrl) {
          displayNewQR(data.qrDataUrl);
          updateGlobalStatus('connecting', 'QR Code Ready to Scan');
        }
      } catch (err) {
        console.error('Error handling QR event:', err);
      }
    });

    eventSource.addEventListener('pairing_code', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.code) {
          displayPairingCode.textContent = data.code;
          copyCodeBtn.disabled = false;
          updateGlobalStatus('connecting', 'Pairing Code Active');
        }
      } catch (err) {
        console.error('Error handling pairing event:', err);
      }
    });

    eventSource.addEventListener('state', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.state === 'open') {
          showToast('WhatsApp Connected Successfully!', 'success');
          renderView(true, data);
        } else if (data.state === 'connecting') {
          updateGlobalStatus('connecting', 'Establishing WhatsApp connection...');
        } else if (data.state === 'disconnected') {
          if (data.loggedOut) {
            renderView(false, { hasSession: false });
          } else {
            updateGlobalStatus('disconnected', 'Disconnected');
          }
        }
      } catch (err) {
        console.error('Error handling state event:', err);
      }
    });

    eventSource.addEventListener('connected', (e) => {
      try {
        const data = JSON.parse(e.data);
        showToast('Device linked! THARUUX-MD Bot is ready.', 'success');
        renderView(true, data);
      } catch {}
    });

    eventSource.onerror = () => {
      // Reconnection handled automatically by EventSource
    };
  }

  setupSSE();
});
