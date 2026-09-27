// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Utility Tools
//   weather, translate, wiki, lyrics, tts, qr, shazam,
//   screenshot, tempmail, news
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const { pnix, mode } = require('../lib');
const { font } = require('../lib/font');
const axios = require('axios');
const gtts = require('node-gtts');
const QRCode = require('qrcode');
const os = require('os');
const path = require('path');
const fs = require('fs');

// ─── Safe GET ─────────────────────────────────────────────
async function get(url, opts = {}) {
  const r = await axios.get(url, { timeout: 15000, validateStatus: () => true, ...opts });
  return r.data;
}

// ─── Safe quoted helper ────────────────────────────────────
const getQuoted = (m) => (m?.data?.key ? { quoted: m.data } : (m?.key ? { quoted: m } : {}));

// ══════════════════════════════════════════════════════════
//  .weather — Current weather by city
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'weather', alias: ['climate', 'w'], desc: font('current weather for any city'), type: 'tools', fromMe: false },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide a city name')}\n\nExample: .weather Colombo`);
    await m.react('⏳');
    try {
      const data = await get(`https://wttr.in/${encodeURIComponent(q)}?format=j1`);
      if (!data?.current_condition?.[0]) throw new Error('City not found');
      const c = data.current_condition[0];
      const loc = data.nearest_area?.[0];
      const cityName = loc?.areaName?.[0]?.value || q;
      const country = loc?.country?.[0]?.value || '';
      const desc = c.weatherDesc?.[0]?.value || '';
      const temp = c.temp_C;
      const feels = c.FeelsLikeC;
      const humidity = c.humidity;
      const wind = c.windspeedKmph;
      const vis = c.visibility;
      const uv = c.uvIndex;

      const emoji = desc.toLowerCase().includes('sun') || desc.toLowerCase().includes('clear') ? '☀️'
        : desc.toLowerCase().includes('rain') ? '🌧️'
        : desc.toLowerCase().includes('cloud') ? '☁️'
        : desc.toLowerCase().includes('storm') ? '⛈️'
        : desc.toLowerCase().includes('snow') ? '❄️'
        : '🌡️';

      await m.reply(
        `${emoji} *${font(cityName)}*${country ? `, ${font(country)}` : ''}\n\n` +
        `• ${font('condition')}  : ${font(desc)}\n` +
        `• ${font('temperature')} : ${temp}°C (feels ${feels}°C)\n` +
        `• ${font('humidity')}  : ${humidity}%\n` +
        `• ${font('wind')}      : ${wind} km/h\n` +
        `• ${font('visibility')}: ${vis} km\n` +
        `• ${font('uv index')}  : ${uv}\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`
      );
      await m.react('✅');
    } catch (e) {
      await m.react('❌');
      m.reply(font('city not found. try a different city name.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .translate — Translate text
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'translate', alias: ['tr', 'tl'], desc: font('translate text to any language'), type: 'tools', fromMe: false },
  async (m, q) => {
    if (!q) return m.reply(
      `${font('usage')}: .translate <lang> <text>\n\n` +
      `${font('examples')}:\n.translate si Hello world\n.translate ta Good morning\n.translate fr How are you?\n\n` +
      `${font('common codes')}: en, si, ta, fr, de, es, ja, ko, zh, ar, hi, ru`
    );
    const parts = q.trim().split(' ');
    const lang = parts[0];
    const text = parts.slice(1).join(' ');
    if (!text) return m.reply(font('provide text after the language code.\n\nExample: .translate si Hello'));
    await m.react('⏳');
    try {
      const r = await get(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${lang}`,
        { timeout: 10000 }
      );
      const translated = r?.responseData?.translatedText;
      if (!translated || translated === text) throw new Error('Translation failed');
      await m.reply(`🌐 ${font(translated)}\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
      await m.react('✅');
    } catch (e) {
      await m.react('❌');
      m.reply(font('translation failed. check the language code and try again.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .wiki — Wikipedia search
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'wiki', alias: ['wikipedia', 'define'], desc: font('search wikipedia'), type: 'tools', fromMe: false },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide a topic')}\n\nExample: .wiki Albert Einstein`);
    await m.react('⏳');
    try {
      // Step 1: search
      const search = await get(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=1`
      );
      const title = search?.query?.search?.[0]?.title;
      if (!title) throw new Error('Not found');

      // Step 2: get extract
      const page = await get(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts|pageimages&exintro=true&explaintext=true&exsentences=5&pithumbsize=300&format=json`
      );
      const pages = page?.query?.pages;
      const p = pages && Object.values(pages)[0];
      if (!p?.extract) throw new Error('No extract');

      const extract = p.extract.trim().slice(0, 900);
      const thumb = p.thumbnail?.source;

      const msg = `📖 *${font(title)}*\n\n${extract}${extract.length >= 900 ? '...' : ''}\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`;

      if (thumb) {
        await m.client.sendMessage(m.chat, { image: { url: thumb }, caption: msg }, getQuoted(m));
      } else {
        await m.reply(msg);
      }
      await m.react('✅');
    } catch (e) {
      await m.react('❌');
      m.reply(font('nothing found for that topic. try different keywords.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .lyrics — Get song lyrics
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'lyrics', alias: ['lyric', 'lrc'], desc: font('get song lyrics'), type: 'tools', fromMe: false },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide artist and song name')}\n\nExample: .lyrics Alan Walker Faded`);
    await m.react('⏳');
    try {
      // Try lyrics.ovh — parse "Artist Song" format
      const parts = q.trim().split(' ');
      // Try different artist/song splits
      let lyrics = null, songTitle = q;
      for (let i = 1; i < parts.length; i++) {
        const artist = parts.slice(0, i).join(' ');
        const song = parts.slice(i).join(' ');
        try {
          const r = await get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`, { timeout: 8000 });
          if (r?.lyrics) { lyrics = r.lyrics; songTitle = `${artist} — ${song}`; break; }
        } catch {}
      }
      if (!lyrics) throw new Error('Not found');

      // Trim to WhatsApp limit
      const trimmed = lyrics.length > 3000 ? lyrics.slice(0, 3000) + '\n...' : lyrics;
      await m.reply(`🎵 *${font(songTitle)}*\n\n${trimmed}\n\n> ᴛʜᴀʀᴜᴜx-ᴍᴅ`);
      await m.react('✅');
    } catch (e) {
      await m.react('❌');
      m.reply(font('lyrics not found. try format: .lyrics <artist> <song>'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .tts — Text to Speech (sends voice note)
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'tts', desc: font('convert text to speech (voice note)'), type: 'tools', fromMe: false },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide text to speak')}\n\nExample: .tts Hello everyone!\nExample: .tts si ආයුබෝවන්`);
    await m.react('⏳');
    try {
      const parts = q.trim().split(' ');
      // Check if first word is a lang code
      const langCodes = ['en', 'si', 'ta', 'fr', 'de', 'es', 'ja', 'ko', 'hi', 'ar', 'zh', 'ru', 'it', 'pt'];
      let lang = 'en', text = q;
      if (parts.length > 1 && langCodes.includes(parts[0])) {
        lang = parts[0];
        text = parts.slice(1).join(' ');
      }

      const tmpFile = path.join(os.tmpdir(), `tts_${Date.now()}.mp3`);
      await new Promise((resolve, reject) => {
        gtts(lang).save(tmpFile, text, (err) => err ? reject(err) : resolve());
      });
      const buf = fs.readFileSync(tmpFile);
      fs.unlinkSync(tmpFile);

      await m.client.sendMessage(m.chat, {
        audio: buf,
        mimetype: 'audio/mpeg',
        ptt: true, // sends as voice note
      }, getQuoted(m));
      await m.react('✅');
    } catch (e) {
      console.error('[tts]', e.message);
      await m.react('❌');
      m.reply(font('text to speech failed. try again.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .qr — Generate QR code
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'qr', alias: ['qrcode'], desc: font('generate a qr code from text or url'), type: 'tools', fromMe: false },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide text or a url')}\n\nExample: .qr https://github.com`);
    await m.react('⏳');
    try {
      const buf = await QRCode.toBuffer(q, { type: 'png', width: 400, margin: 2 });
      await m.client.sendMessage(m.chat, { image: buf, caption: font('qr code generated') }, getQuoted(m));
      await m.react('✅');
    } catch (e) {
      await m.react('❌');
      m.reply(font('failed to generate qr code.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .screenshot — Screenshot a website
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'screenshot', alias: ['ss', 'webss'], desc: font('screenshot a website url'), type: 'tools', fromMe: false },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide a website url')}\n\nExample: .screenshot https://google.com`);
    if (!q.startsWith('http')) q = 'https://' + q;
    await m.react('⏳');
    try {
      // Use thum.io (free, no key needed)
      const ssUrl = `https://image.thum.io/get/width/1280/crop/800/${encodeURIComponent(q)}`;
      const buf = await axios.get(ssUrl, { responseType: 'arraybuffer', timeout: 30000 })
        .then(r => Buffer.from(r.data));
      if (buf.length < 5000) throw new Error('Screenshot failed or empty');
      await m.client.sendMessage(m.chat, { image: buf, caption: `📸 ${font(q.slice(0, 50))}` }, getQuoted(m));
      await m.react('✅');
    } catch (e) {
      await m.react('❌');
      m.reply(font('failed to screenshot. make sure the url is valid.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .news — Latest news headlines
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'news', desc: font('latest news headlines'), type: 'tools', fromMe: false },
  async (m, q) => {
    await m.react('⏳');
    try {
      const topic = q || 'world';
      // GNews API - free 100 requests/day, no sign-in needed for basic
      // Use RSS-to-JSON instead (fully free)
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`;
      const r = await axios.get(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`, { timeout: 10000 });
      const items = r.data?.items?.slice(0, 6);
      if (!items?.length) throw new Error('No news');

      let msg = `📰 *${font('Latest News')}* · ${font(topic)}\n\n`;
      items.forEach((item, i) => {
        const title = item.title?.replace(/\s*-\s*[^-]+$/, '').trim(); // remove source suffix
        const source = item.author || '';
        msg += `*${i + 1}.* ${title}${source ? `\n    _${source}_` : ''}\n\n`;
      });
      msg += `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`;
      await m.reply(msg);
      await m.react('✅');
    } catch (e) {
      await m.react('❌');
      m.reply(font('failed to fetch news. try again.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .shazam — Identify song from audio/video
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'shazam', alias: ['identify', 'songid'], desc: font('identify a song from replied audio/video'), type: 'tools', fromMe: false },
  async (m, q) => {
    // Check for quoted message
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return m.reply(font('please reply to an audio or video message to identify the song.'));
    const msgType = Object.keys(quoted)[0];
    if (!['audioMessage', 'videoMessage', 'documentMessage'].includes(msgType)) {
      return m.reply(font('please reply to an audio or video message.'));
    }
    await m.react('⏳');
    try {
      // Download the media
      const stream = await m.client.downloadMediaMessage({ message: quoted });
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buf = Buffer.concat(chunks);

      // Use ACRCloud free endpoint (no key for basic identify)
      // Fallback to audd.io free tier
      const FormData = require('form-data') || (() => { throw new Error('form-data missing'); })();

      const form = new FormData();
      form.append('return', 'apple_music,spotify');
      form.append('file', buf, { filename: 'audio.mp3', contentType: 'audio/mpeg' });

      const r = await axios.post('https://api.audd.io/', form, {
        headers: { ...form.getHeaders?.() || {} },
        timeout: 30000,
      });

      const result = r.data?.result;
      if (!result) {
        await m.react('❌');
        return m.reply(font('song not recognized. try a clearer audio clip.'));
      }

      const thumb = result.spotify?.album?.images?.[0]?.url || result.apple_music?.artwork?.url?.replace('{w}x{h}', '300x300');
      const msg =
        `🎵 *${font('Song Identified')}*\n\n` +
        `• ${font('title')}   : ${result.title || 'Unknown'}\n` +
        `• ${font('artist')}  : ${result.artist || 'Unknown'}\n` +
        `• ${font('album')}   : ${result.album || '—'}\n` +
        `• ${font('release')} : ${result.release_date || '—'}\n\n` +
        `> ᴛʜᴀʀᴜᴜx-ᴍᴅ`;

      if (thumb) {
        await m.client.sendMessage(m.chat, { image: { url: thumb }, caption: msg }, getQuoted(m));
      } else {
        await m.reply(msg);
      }
      await m.react('✅');
    } catch (e) {
      console.error('[shazam]', e.message);
      await m.react('❌');
      m.reply(font('song identification failed. the audd.io api requires a free api key.\nget one at audd.io and add AUDD_API_KEY to config.'));
    }
  }
);
