// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Media Downloader (Stable)
//   • YouTube: play-dl search → yt-dlp -g → axios download
//   • TikTok:  TikWM POST API (no watermark)
//   • Images:  wallhaven.cc
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const { pnix, mode } = require('../lib');
const { font } = require('../lib/font');
const fs = require('fs');
const axios = require('axios');
const playdl = require('play-dl');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const YTDLP = (() => {
  const candidates = [
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    '/home/tharuux/.local/bin/yt-dlp',
    'yt-dlp'
  ];
  for (const c of candidates) {
    if (c === 'yt-dlp') continue;
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return 'yt-dlp';
})();

const WALLHAVEN = 'https://wallhaven.cc/api/v1';
const SPARKY    = 'https://api-aswin-sparky.koyeb.app/api';

// ─── YT helper: search → { url, title, channel, duration, thumb } ─────
async function ytSearch(query) {
  const urlMatch = query.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s]+/i);
  if (urlMatch) {
    const cleanUrl = urlMatch[0];
    try {
      const info = await playdl.video_info(cleanUrl);
      const d = info.video_details;
      return {
        url: cleanUrl,
        title: d.title || 'YouTube Audio',
        channel: d.channel?.name || '',
        duration: d.durationRaw || '',
        thumb: d.thumbnails?.slice(-1)[0]?.url || '',
      };
    } catch {}
    return { url: cleanUrl, title: 'YouTube Audio', channel: '', duration: '', thumb: '' };
  }
  const results = await playdl.search(query, { source: { youtube: 'video' }, limit: 1 });
  if (!results?.length) throw new Error('No results found');
  const v = results[0];
  return {
    url: v.url,
    title: v.title || 'Unknown',
    channel: v.channel?.name || '',
    duration: v.durationRaw || '',
    thumb: v.thumbnails?.slice(-1)[0]?.url || '',
  };
}

// ─── YT helper: get CDN URL via yt-dlp -g ─────────────────
async function ytGetUrl(videoUrl, audioOnly = true) {
  const urlMatch = videoUrl.match(/https?:\/\/[^\s]+/);
  const cleanUrl = urlMatch ? urlMatch[0] : videoUrl.trim();
  const format = audioOnly
    ? 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best'
    : 'bestvideo[height<=480][ext=mp4]+bestaudio/best[height<=480]/best[ext=mp4]';
  const { stdout } = await execFileAsync(YTDLP, [
    '--quiet', '--no-warnings', '--no-playlist', '-g', '-f', format,
    '--no-check-certificates',
    '--extractor-args', 'youtube:player_client=ios,web,mweb',
    cleanUrl
  ], { timeout: 25000 });
  return stdout.trim().split('\n')[0];
}

// ─── YT helper: download buffer with browser headers ──────
async function ytDownload(cdnUrl) {
  const r = await axios.get(cdnUrl, {
    responseType: 'arraybuffer',
    timeout: 90000,
    maxContentLength: 50 * 1024 * 1024, // 50MB limit
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Range': 'bytes=0-',
      'Referer': 'https://www.youtube.com/',
      'Origin': 'https://www.youtube.com',
    },
  });
  return Buffer.from(r.data);
}

// ─── Safe quoted helper ────────────────────────────────────
const getQuoted = (m) => (m?.data?.key ? { quoted: m.data } : (m?.key ? { quoted: m } : {}));

// ─── Safe GET helper ───────────────────────────────────────
async function get(url, timeout = 12000) {
  const r = await axios.get(url, { timeout, validateStatus: () => true });
  return r.data;
}

// ─── Song format selection sessions ─────────────────────────
const songSessions = new Map();
const BOT_WATERMARK = '> ᴛʜᴀʀᴜᴜx-ᴍᴅ';

// ══════════════════════════════════════════════════════════
//  .song  — Search & ask format (Audio, Document, Voice)
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'song', alias: ['play', 'music'], desc: font('search and download a song'), type: 'media', fromMe: mode },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide a song name or youtube url')}\n\nExample: .song faded alan walker`);
    await m.react('⏳');
    try {
      const info = await ytSearch(q);

      const sessionData = {
        url: info.url,
        title: info.title,
        channel: info.channel,
        duration: info.duration,
        thumb: info.thumb,
        createdAt: Date.now(),
      };

      const keyUser = `${m.chat}:${m.sender}`;
      songSessions.set(keyUser, sessionData);
      songSessions.set(m.chat, sessionData);

      // Auto-expire session after 3 minutes
      setTimeout(() => {
        if (songSessions.get(keyUser) === sessionData) songSessions.delete(keyUser);
        if (songSessions.get(m.chat) === sessionData) songSessions.delete(m.chat);
      }, 180000);

      const promptText =
        `*ᴛʜᴀʀᴜᴜx-ᴍᴅ ꜱᴏɴɢ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
        `🎵 *Title:* ${font(info.title)}\n` +
        (info.channel ? `👤 *Artist:* ${font(info.channel)}\n` : '') +
        (info.duration ? `⏱️ *Duration:* ${info.duration}\n` : '') +
        `\n*Reply with a number:*\n` +
        `1 ╎ 🎵 Audio (.mp3)\n` +
        `2 ╎ 📄 Document (.mp3)\n` +
        `3 ╎ 🎤 Voice Note (PTT)\n\n` +
        `${BOT_WATERMARK}`;

      if (info.thumb) {
        await m.client.sendMessage(m.chat, {
          image: { url: info.thumb },
          caption: promptText,
        }, getQuoted(m));
      } else {
        await m.client.sendMessage(m.chat, {
          text: promptText,
          contextInfo: {
            externalAdReply: {
              title: font(info.title),
              body: 'ᴛʜᴀʀᴜᴜx-ᴍᴅ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ',
              thumbnailUrl: 'https://md.tharuux.lk/images/logo.png',
              mediaType: 1,
            },
          },
        }, getQuoted(m));
      }
      await m.react('🎵');
    } catch (e) {
      console.error('[song]', e.message);
      await m.react('❌');
      m.reply(font('failed to find song. please try again.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  Interactive text listener for song format (1, 2, 3)
// ══════════════════════════════════════════════════════════
pnix(
  { on: 'text', fromMe: mode, dontAddCommandList: true },
  async (m, text) => {
    const raw = (text || m.text || '').trim().toLowerCase();
    if (!raw) return;

    const is1 = raw === '1' || raw === 'audio' || raw === 'mp3';
    const is2 = raw === '2' || raw === 'doc' || raw === 'document';
    const is3 = raw === '3' || raw === 'voice' || raw === 'ptt' || raw === 'vn';
    if (!is1 && !is2 && !is3) return;

    const keyUser = `${m.chat}:${m.sender}`;
    const session = songSessions.get(keyUser) || songSessions.get(m.chat);
    if (!session) return;

    // Delete session immediately to prevent duplicate runs
    songSessions.delete(keyUser);
    songSessions.delete(m.chat);

    await m.react('⏳');
    try {
      console.log(`[song-download] Format: ${is1 ? 'Audio' : is2 ? 'Document' : 'Voice'} | URL: ${session.url}`);
      const cdnUrl = await ytGetUrl(session.url, true);
      const buf = await ytDownload(cdnUrl);

      const safeTitle = (session.title || 'song').replace(/[/\\?%*:|"<>]/g, '').slice(0, 60);
      const adReply = {
        title: session.title || 'THARUUX-MD Song',
        body: 'ᴛʜᴀʀᴜᴜx-ᴍᴅ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ',
        mediaType: 1,
        thumbnailUrl: session.thumb || 'https://md.tharuux.lk/images/logo.png',
        renderLargerThumbnail: true,
        sourceUrl: session.url,
      };

      if (is1) {
        // Option 1: Audio file
        await m.client.sendMessage(m.chat, {
          audio: buf,
          mimetype: 'audio/mp4',
          ptt: false,
          contextInfo: { externalAdReply: adReply },
        }, getQuoted(m));
      } else if (is2) {
        // Option 2: Audio document (.mp3)
        await m.client.sendMessage(m.chat, {
          document: buf,
          mimetype: 'audio/mpeg',
          fileName: `${safeTitle}.mp3`,
          caption: `🎵 *${font(session.title)}*\n\n${BOT_WATERMARK}`,
          contextInfo: { externalAdReply: adReply },
        }, getQuoted(m));
      } else if (is3) {
        // Option 3: Voice note (PTT)
        await m.client.sendMessage(m.chat, {
          audio: buf,
          mimetype: 'audio/mp4',
          ptt: true,
          contextInfo: { externalAdReply: adReply },
        }, getQuoted(m));
      }

      await m.react('✅');
    } catch (e) {
      console.error('[song-download]', e.message);
      await m.react('❌');
      m.reply(font('failed to download audio. please try again.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .yta  — YouTube Audio by URL (Direct download)
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'yta', alias: ['ytaudio', 'ytmp3'], desc: font('youtube audio downloader (direct)'), type: 'media', fromMe: mode },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide a youtube url')}\n\nExample: .yta https://youtu.be/xxx`);
    await m.react('⏳');
    try {
      const info = await ytSearch(q);
      const cdnUrl = await ytGetUrl(info.url, true);
      const buf = await ytDownload(cdnUrl);
      await m.client.sendMessage(m.chat, {
        audio: buf,
        mimetype: 'audio/mp4',
        ptt: false,
        contextInfo: {
          externalAdReply: {
            title: info.title || 'THARUUX-MD Song',
            body: 'ᴛʜᴀʀᴜᴜx-ᴍᴅ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ',
            mediaType: 1,
            thumbnailUrl: info.thumb || 'https://md.tharuux.lk/images/logo.png',
            renderLargerThumbnail: true,
            sourceUrl: info.url,
          },
        },
      }, getQuoted(m));
      if (info.title) await m.reply(`🎵 ${font(info.title)}\n\n${BOT_WATERMARK}`);
      await m.react('✅');
    } catch (e) {
      console.error('[yta]', e.message);
      await m.react('❌');
      m.reply(font('failed to download audio. check the url and try again.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .ytv  — YouTube Video by URL
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'ytv', alias: ['ytvideo', 'ytmp4'], desc: font('youtube video downloader'), type: 'media', fromMe: mode },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide a youtube url')}\n\nExample: .ytv https://youtu.be/xxx`);
    await m.react('⏳');
    try {
      const info = await ytSearch(q);
      const cdnUrl = await ytGetUrl(info.url, false);
      const buf = await ytDownload(cdnUrl);
      await m.client.sendMessage(m.chat, {
        video: buf,
        caption: info.title ? font(info.title) : '',
        mimetype: 'video/mp4',
      }, getQuoted(m));
      await m.react('✅');
    } catch (e) {
      console.error('[ytv]', e.message);
      await m.react('❌');
      m.reply(font('failed to download video. note: videos over 50mb cannot be sent.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .spotify  — Spotify/song name → audio
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'spotify', desc: font('search spotify track and download as audio'), type: 'media', fromMe: mode },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide a song name or spotify url')}\n\nExample: .spotify blinding lights`);
    await m.react('⏳');
    let searchQuery = q;
    if (q.includes('spotify.com/track')) {
      try {
        const oembed = await get(`https://open.spotify.com/oembed?url=${encodeURIComponent(q)}`, 8000);
        if (oembed?.title) searchQuery = oembed.title;
      } catch {}
    }
    try {
      const info = await ytSearch(searchQuery + ' audio');
      const cdnUrl = await ytGetUrl(info.url, true);
      const buf = await ytDownload(cdnUrl);
      await m.client.sendMessage(m.chat, { audio: buf, mimetype: 'audio/mp4', ptt: false }, getQuoted(m));
      await m.reply(`🎵 ${font(info.title || searchQuery)}`);
      await m.react('✅');
    } catch (e) {
      console.error('[spotify]', e.message);
      await m.react('❌');
      m.reply(font('failed to find or download that song. try .song instead.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .tiktok  — TikTok no-watermark download
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'tiktok', alias: ['tt', 'ttdl'], desc: font('tiktok video downloader (no watermark)'), type: 'media', fromMe: mode },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide a tiktok url')}\n\nExample: .tiktok https://vt.tiktok.com/xxx`);
    await m.react('⏳');
    try {
      // TikWM POST — no-watermark, free, no key needed
      const { data } = await axios.post('https://tikwm.com/api/',
        new URLSearchParams({ url: q, hd: 1 }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
      );
      const d = data?.data;
      if (!d?.play) throw new Error('No video URL from TikWM');
      const videoUrl = d.hdplay || d.play;
      const buf = await axios.get(videoUrl, {
        responseType: 'arraybuffer', timeout: 60000,
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.tiktok.com/' },
      }).then(r => Buffer.from(r.data));
      await m.client.sendMessage(m.chat, {
        video: buf,
        caption: d.title ? font(d.title.slice(0, 100)) : '',
        mimetype: 'video/mp4',
      }, getQuoted(m));
      await m.react('✅');
    } catch (e) {
      console.error('[tiktok]', e.message);
      // Fallback: sparky API
      try {
        const data = await get(`${SPARKY}/downloader/tiktok?url=${encodeURIComponent(q)}`);
        const url = data?.data?.nowm || data?.data?.video || data?.data?.url;
        if (url) {
          await m.client.sendMessage(m.chat, { video: { url }, mimetype: 'video/mp4' }, getQuoted(m));
          await m.react('✅'); return;
        }
      } catch {}
      await m.react('❌');
      m.reply(font('failed to download tiktok video. please try again.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .pinterest  — Pinterest pin downloader
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'pinterest', alias: ['pin'], desc: font('pinterest image/video downloader'), type: 'media', fromMe: mode },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide a pinterest pin url')}\n\nExample: .pinterest https://pin.it/xxx`);
    await m.react('⏳');
    try {
      const data = await get(`${SPARKY}/downloader/pin?url=${encodeURIComponent(q)}`);
      const mediaUrl = data?.data?.url || data?.data?.image || data?.data?.video;
      if (!mediaUrl) throw new Error('No media URL');
      const isVideo = data?.data?.type === 'video' || String(mediaUrl).includes('.mp4');
      if (isVideo) {
        await m.client.sendMessage(m.chat, { video: { url: mediaUrl } }, getQuoted(m));
      } else {
        await m.client.sendMessage(m.chat, { image: { url: mediaUrl } }, getQuoted(m));
      }
      await m.react('✅');
    } catch (e) {
      await m.react('❌');
      m.reply(font('failed to download pinterest content.'));
    }
  }
);

// ══════════════════════════════════════════════════════════
//  .wallpaper  — HD wallpaper search
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'wallpaper', desc: font('search and send a hd wallpaper'), type: 'media', fromMe: mode },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide a keyword')}\n\nExample: .wallpaper cyberpunk`);
    await m.react('⏳');
    try {
      const data = await get(`${WALLHAVEN}/search?q=${encodeURIComponent(q)}&purity=100&categories=111&atleast=1920x1080&sorting=random`, 10000);
      if (!data?.data?.length) { await m.react('❌'); return m.reply(font(`no wallpapers found for "${q}".`)); }
      const pick = data.data[Math.floor(Math.random() * Math.min(data.data.length, 10))];
      await m.client.sendMessage(m.chat, { image: { url: pick.path }, caption: `${font('wallpaper')} · ${font(q)}\n${pick.resolution || ''}` }, getQuoted(m));
      await m.react('✅');
    } catch { await m.react('❌'); m.reply(font('failed to fetch wallpaper.')); }
  }
);

// ══════════════════════════════════════════════════════════
//  .img  — Image search
// ══════════════════════════════════════════════════════════
pnix(
  { command: 'img', alias: ['image', 'photo'], desc: font('search and send an image'), type: 'media', fromMe: mode },
  async (m, q) => {
    if (!q) return m.reply(`${font('provide a keyword')}\n\nExample: .img sunset`);
    await m.react('⏳');
    try {
      const data = await get(`${WALLHAVEN}/search?q=${encodeURIComponent(q)}&purity=100&sorting=random`, 10000);
      if (!data?.data?.length) { await m.react('❌'); return m.reply(font(`no images found for "${q}".`)); }
      const pick = data.data[Math.floor(Math.random() * Math.min(data.data.length, 10))];
      await m.client.sendMessage(m.chat, { image: { url: pick.path }, caption: font(q) }, getQuoted(m));
      await m.react('✅');
    } catch { await m.react('❌'); m.reply(font('failed to fetch image.')); }
  }
);
