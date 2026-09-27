// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Utilities Plugin
//   Commands: translate, tts, weather, wiki, quote, fact
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { pnix, mode } = require('../lib');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ── TRANSLATE ────────────────────────────────
pnix(
  { command: 'translate', alias: ['trt', 'tr'], desc: 'Translate text to any language. Usage: .translate <text> <lang> or reply with .translate <lang>', type: 'utilities' },
  async (m, args, client) => {
    let text = '', lang = 'en';

    if (m.reply_message?.text) {
      // Replied to a message — use reply text and first arg as lang
      text = m.reply_message.text;
      lang = args.trim() || 'en';
    } else {
      // Direct: .translate hello world fr
      const parts = args.trim().split(' ');
      if (parts.length < 2) {
        return m.reply(
          `*🌐 TRANSLATOR*\n\nUsage:\n` +
          `1. Reply to a message: *.translate <lang>*\n` +
          `2. Direct: *.translate <text> <lang>*\n\n` +
          `*Language codes:* en, si, fr, es, de, it, pt, ru, ja, ko, zh, ar, hi, ta`
        );
      }
      lang = parts.pop();
      text = parts.join(' ');
    }

    if (!text) return m.reply('❌ No text to translate.');

    await m.react('🌐');
    let translated = null;

    // Try multiple free APIs
    const apis = [
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`,
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${lang}`,
    ];

    for (const url of apis) {
      try {
        const res = await axios.get(url, { timeout: 8000 });
        const d = res.data;
        if (Array.isArray(d) && d[0]?.[0]?.[0]) { translated = d[0][0][0]; break; }
        if (d?.responseData?.translatedText) { translated = d.responseData.translatedText; break; }
      } catch { continue; }
    }

    if (!translated) return m.reply('❌ Translation failed. Please try again later.');
    await m.react('✅');
    return m.reply(`*🌐 Translation (→ ${lang.toUpperCase()})*\n\n${translated}`);
  }
);

// ── TEXT-TO-SPEECH ────────────────────────────
pnix(
  { command: 'tts', desc: 'Convert text to speech audio. Usage: .tts <text> or reply with .tts', type: 'utilities' },
  async (m, args, client) => {
    const text = args.trim() || m.reply_message?.text;
    if (!text) return m.reply('❌ Provide text or reply to a message.\nUsage: *.tts <text>*');

    await m.react('🔊');
    const lang = 'en';
    // Use Google TTS (no API key needed)
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;

    try {
      await client.sendMessage(m.chat, {
        audio: { url: ttsUrl },
        mimetype: 'audio/mpeg',
        ptt: true,
      }, { quoted: m.data });
      await m.react('✅');
    } catch (e) {
      await m.react('❌');
      return m.reply('❌ Failed to generate TTS. Text may be too long.');
    }
  }
);

// ── WEATHER ───────────────────────────────────
pnix(
  { command: 'weather', alias: ['wt'], desc: 'Get weather for a city. Usage: .weather <city>', type: 'utilities' },
  async (m, args, client) => {
    const city = args.trim();
    if (!city) return m.reply('❌ Provide a city name.\nUsage: *.weather Colombo*');

    await m.react('🌤️');
    try {
      // Using open-meteo + geocoding (no API key required)
      const geo = await axios.get(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
        { timeout: 8000 }
      );
      const loc = geo.data?.results?.[0];
      if (!loc) return m.reply(`❌ City "*${city}*" not found.`);

      const wx = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true&hourly=relativehumidity_2m,windspeed_10m`,
        { timeout: 8000 }
      );
      const cur = wx.data?.current_weather;
      const humidity = wx.data?.hourly?.relativehumidity_2m?.[0] ?? 'N/A';

      const wmoCode = {
        0: '☀️ Clear', 1: '🌤️ Mainly clear', 2: '⛅ Partly cloudy', 3: '☁️ Overcast',
        45: '🌫️ Foggy', 51: '🌦️ Light drizzle', 61: '🌧️ Light rain', 63: '🌧️ Moderate rain',
        65: '🌧️ Heavy rain', 80: '🌦️ Showers', 95: '⛈️ Thunderstorm',
      };
      const condition = wmoCode[cur?.weathercode] || '🌡️ Unknown';

      await m.react('✅');
      return m.reply(
        `*🌤️ Weather — ${loc.name}, ${loc.country_code?.toUpperCase()}*\n\n` +
        `*Condition:* ${condition}\n` +
        `*Temperature:* ${cur?.temperature}°C\n` +
        `*Wind Speed:* ${cur?.windspeed} km/h\n` +
        `*Humidity:* ${humidity}%\n` +
        `*Timezone:* ${loc.timezone}`
      );
    } catch (e) {
      await m.react('❌');
      return m.reply('❌ Failed to fetch weather. Try again later.');
    }
  }
);

// ── WIKIPEDIA ─────────────────────────────────
pnix(
  { command: 'wiki', alias: ['wikipedia'], desc: 'Search Wikipedia. Usage: .wiki <query>', type: 'utilities' },
  async (m, args, client) => {
    const query = args.trim();
    if (!query) return m.reply('❌ Provide a search term.\nUsage: *.wiki Albert Einstein*');

    await m.react('📖');
    try {
      const res = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
        { timeout: 8000 }
      );
      const d = res.data;
      if (d.type === 'disambiguation') return m.reply(`❌ "${query}" is ambiguous. Please be more specific.`);
      await m.react('✅');
      return m.reply(
        `*📖 ${d.title}*\n\n${d.extract}\n\n🔗 ${d.content_urls?.desktop?.page || ''}`
      );
    } catch {
      await m.react('❌');
      return m.reply(`❌ No Wikipedia article found for "*${query}*".`);
    }
  }
);

// ── RANDOM QUOTE ──────────────────────────────
pnix(
  { command: 'quote', alias: ['rquote'], desc: 'Get a random inspirational quote', type: 'utilities' },
  async (m, args, client) => {
    try {
      const res = await axios.get('https://zenquotes.io/api/random', { timeout: 8000 });
      const q = res.data?.[0];
      if (!q) throw new Error('No quote');
      return m.reply(`*💬 "${q.q}"*\n\n— _${q.a}_`);
    } catch {
      return m.reply('❌ Failed to fetch quote. Try again later.');
    }
  }
);

// ── RANDOM FACT ───────────────────────────────
pnix(
  { command: 'fact', alias: ['rfact', 'funfact'], desc: 'Get a random interesting fact', type: 'utilities' },
  async (m, args, client) => {
    try {
      const res = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', { timeout: 8000 });
      const fact = res.data?.text;
      if (!fact) throw new Error('No fact');
      return m.reply(`*🧠 Random Fact*\n\n${fact}`);
    } catch {
      return m.reply('❌ Failed to fetch fact. Try again later.');
    }
  }
);

// ── LYRICS ────────────────────────────────────
pnix(
  { command: 'lyrics', alias: ['lyric'], desc: 'Get lyrics for a song. Usage: .lyrics <song name>', type: 'utilities' },
  async (m, args, client) => {
    const query = args.trim();
    if (!query) return m.reply('❌ Provide a song name.\nUsage: *.lyrics Shape of You*');

    await m.react('🎵');
    try {
      const res = await axios.get(
        `https://lyrist.vercel.app/api/${encodeURIComponent(query)}`,
        { timeout: 10000 }
      );
      const d = res.data;
      if (!d?.lyrics) throw new Error('No lyrics');

      const text = `*🎵 ${d.title}*\n*Artist:* ${d.artist}\n\n${d.lyrics.slice(0, 4000)}${d.lyrics.length > 4000 ? '\n\n_(truncated)_' : ''}`;
      await m.react('✅');
      return m.reply(text);
    } catch {
      await m.react('❌');
      return m.reply(`❌ Lyrics not found for "*${query}*".`);
    }
  }
);

// ── AI (GEMINI) ───────────────────────────────
pnix(
  { command: 'ai', alias: ['gemini', 'ask', 'gpt'], desc: 'Ask AI a question. Usage: .ai <question>', type: 'utilities' },
  async (m, args, client) => {
    const query = args.trim() || m.reply_message?.text;
    if (!query) return m.reply('❌ Provide a question.\nUsage: *.ai What is black hole?*');

    await m.react('🤖');

    const apis = [
      `https://api.giftedtech.my.id/api/ai/geminiai?apikey=gifted&q=${encodeURIComponent(query)}`,
      `https://vapis.my.id/api/gemini?q=${encodeURIComponent(query)}`,
      `https://api.siputzx.my.id/api/ai/gemini-pro?content=${encodeURIComponent(query)}`,
      `https://api.ryzendesu.vip/api/ai/gemini?text=${encodeURIComponent(query)}`,
    ];

    let answer = null;
    for (const url of apis) {
      try {
        const res = await axios.get(url, { timeout: 15000 });
        const d = res.data;
        answer = d?.result || d?.answer || d?.data || d?.message || d?.response;
        if (answer && typeof answer === 'string' && answer.length > 3) break;
      } catch { continue; }
    }

    if (!answer) {
      await m.react('❌');
      return m.reply('❌ AI is busy right now. Please try again in a moment.');
    }
    await m.react('✅');
    return m.reply(`*🤖 AI Response*\n\n${answer}`);
  }
);
