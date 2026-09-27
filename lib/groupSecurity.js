// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Group Security Engine
//   Features: Antilink, AntiBadword, AntiFake, AntiSpam (AntiSpace)
//   Persistence: sessions/groupSecurity.json (survives Fly.io & restarts)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

// Determine persistent data file path (prefer sessions mount directory)
const DATA_DIR = path.resolve(__dirname, '../sessions');
const FALLBACK_DIR = path.resolve(__dirname, '../data');
const FILE_PATH = fs.existsSync(DATA_DIR)
  ? path.join(DATA_DIR, 'groupSecurity.json')
  : path.join(FALLBACK_DIR, 'groupSecurity.json');

// Default profanities (English + Sinhala common words)
const DEFAULT_BAD_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy',
  'faggot', 'retard', 'whore', 'slut', 'motherfucker', 'bullshit', 'damn',
  'cock', 'rape', 'nigger', 'nigga', 'hentai', 'porn', 'xxx',
  'ponnaya', 'pakaya', 'huththa', 'hukanna', 'kariyo', 'balla', 'walaththaya',
  'vesi', 'pky', 'keriya', 'huththo', 'htta', 'wsgpt', 'ponny', 'hknn', 'htto', 'pkya', 'kriya', 'huknna', 'wesa', 'wesi', 'htti', 'kariya', 'ponnayo', 'ponnyo', 'bts', 'wesige', 'vesige'
];

// Default blocked country code prefixes for AntiFake (virtual/VOIP spammers)
const DEFAULT_FAKE_PREFIXES = ['1', '212', '263', '234', '92'];

// Universal URL & invite link detection regex (stateless & fast)
const URL_REGEX = /(?:https?:\/\/|www\.)\S+|(?:chat\.whatsapp\.com|wa\.me|t\.me|discord\.gg)\/\S+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|me|ly|co|xyz|info|tv|app|site|live|club|top|store|online)\b(?:\/\S*)?/i;

// In-memory runtime state
let securityStore = {};
const spamMap = new Map(); // key: `${groupId}:${userKey}` -> array of timestamps
const badWordRegexCache = new Map(); // cacheKey -> compiled RegExp

// Ensure directory exists and load store
function loadStore() {
  try {
    const targetFile = fs.existsSync(FILE_PATH)
      ? FILE_PATH
      : (fs.existsSync(path.join(FALLBACK_DIR, 'groupSecurity.json'))
        ? path.join(FALLBACK_DIR, 'groupSecurity.json')
        : FILE_PATH);

    if (fs.existsSync(targetFile)) {
      const raw = fs.readFileSync(targetFile, 'utf8');
      securityStore = JSON.parse(raw) || {};
    } else {
      securityStore = {};
    }
  } catch (err) {
    console.error('⚠️ [GroupSecurity] Error loading security store:', err.message);
    securityStore = {};
  }
}

// Debounced disk persistence to avoid blocking the Node.js event loop
let saveTimer = null;
function saveStore() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const dir = path.dirname(FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(FILE_PATH, JSON.stringify(securityStore, null, 2), 'utf8');
    } catch (err) {
      console.error('⚠️ [GroupSecurity] Error saving security store:', err.message);
    }
  }, 300);
}

// Initial load
loadStore();

/**
 * Get or initialize security config for a group
 */
function getGroupConfig(groupId) {
  if (!securityStore[groupId]) {
    securityStore[groupId] = {
      antilink: { enabled: false, action: 'delete' },
      antibadword: { enabled: false, action: 'delete', customWords: [], removedWords: [] },
      antifake: { enabled: false, action: 'kick', prefixes: [...DEFAULT_FAKE_PREFIXES] },
      antispam: { enabled: false, action: 'delete', limit: 5, window: 5 },
      warnings: {} // userKey -> count
    };
  }
  if (!securityStore[groupId].antibadword.removedWords) {
    securityStore[groupId].antibadword.removedWords = [];
  }
  return securityStore[groupId];
}

/**
 * Update group security config and persist
 */
function updateGroupConfig(groupId, updater) {
  const cfg = getGroupConfig(groupId);
  updater(cfg);
  saveStore();
  return cfg;
}

/**
 * Check if text contains any banned bad word (Single-pass compiled RegExp)
 */
function checkBadWord(text, customWords = [], removedWords = []) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

  const customKey = (customWords || []).sort().join(',');
  const removedKey = (removedWords || []).sort().join(',');
  const cacheKey = `${customKey}|${removedKey}`;

  let regex = badWordRegexCache.get(cacheKey);
  if (regex === undefined) {
    const removedSet = new Set((removedWords || []).map(w => w.toLowerCase()));
    const allWords = new Set([...DEFAULT_BAD_WORDS, ...(customWords || [])]);
    const activeWords = [];
    for (const w of allWords) {
      if (!w) continue;
      const clean = w.toLowerCase().trim();
      if (clean && !removedSet.has(clean)) {
        activeWords.push(clean);
      }
    }
    if (activeWords.length === 0) {
      regex = null;
    } else {
      activeWords.sort((a, b) => b.length - a.length);
      const escaped = activeWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      regex = new RegExp(`\\b(?:${escaped.join('|')})\\b`, 'i');
    }
    badWordRegexCache.set(cacheKey, regex);
  }

  if (!regex) return null;
  const match = lower.match(regex);
  return match ? match[0] : null;
}

/**
 * Check if text contains links
 */
function checkLink(text) {
  if (!text || typeof text !== 'string') return false;
  return URL_REGEX.test(text);
}

/**
 * Check if phone number is fake/foreign based on configured prefixes
 */
function checkFakeNumber(phoneJid, prefixes = DEFAULT_FAKE_PREFIXES) {
  if (!phoneJid) return false;
  const cleanNum = String(phoneJid).replace(/\D/g, '');
  const activePrefixes = prefixes && prefixes.length > 0 ? prefixes : DEFAULT_FAKE_PREFIXES;
  return activePrefixes.some(prefix => cleanNum.startsWith(prefix));
}

/**
 * Track user message rate for anti-spam
 * Returns true if user exceeded spam limit
 */
function trackSpam(groupId, userKey, limit = 20, windowSec = 10) {
  const now = Date.now();
  const windowMs = (windowSec || 5) * 1000;
  const mapKey = `${groupId}:${userKey}`;
  const history = spamMap.get(mapKey) || [];

  const recent = history.filter(t => now - t < windowMs);
  recent.push(now);
  spamMap.set(mapKey, recent);

  return recent.length >= (limit || 5);
}

/**
 * Manage warnings per group member
 */
function addWarning(groupId, userKey) {
  const cfg = getGroupConfig(groupId);
  if (!cfg.warnings) cfg.warnings = {};
  const current = (cfg.warnings[userKey] || 0) + 1;
  cfg.warnings[userKey] = current;
  saveStore();
  return current;
}

function getWarnings(groupId, userKey) {
  const cfg = getGroupConfig(groupId);
  return cfg.warnings?.[userKey] || 0;
}

function clearWarnings(groupId, userKey) {
  const cfg = getGroupConfig(groupId);
  if (cfg.warnings && cfg.warnings[userKey] !== undefined) {
    cfg.warnings[userKey] = 0;
    saveStore();
  }
}

module.exports = {
  getGroupConfig,
  updateGroupConfig,
  checkBadWord,
  checkLink,
  checkFakeNumber,
  trackSpam,
  addWarning,
  getWarnings,
  clearWarnings,
  DEFAULT_BAD_WORDS,
  DEFAULT_FAKE_PREFIXES
};
