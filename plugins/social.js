// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   THARUUX-MD — Social & Fun Plugin
//   Commands: truth, dare, ship, 8ball, joke,
//             meme, compliment, insult, tictactoe,
//             hangman, trivia, quote, weather (social)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { pnix, mode } = require('../lib');
const axios = require('axios');

// ── TRUTH ─────────────────────────────────────
pnix(
  { command: 'truth', alias: ['t'], desc: 'Get a random truth question', type: 'fun' },
  async (m, args, client) => {
    const truths = [
      'What is the most embarrassing thing you have ever done?',
      'What is your biggest fear?',
      'Have you ever told a lie to get out of trouble?',
      'What is your most embarrassing crush?',
      'What is the worst thing you have ever done as a prank?',
      'Have you ever cheated in a test?',
      'What is one thing you would change about yourself?',
      'Who is your secret crush right now?',
      'What is the biggest lie you have ever told your parents?',
      'What is a secret you have never told anyone?',
    ];
    const q = truths[Math.floor(Math.random() * truths.length)];
    return m.reply(`*🎯 TRUTH*\n\n${q}`);
  }
);

// ── DARE ──────────────────────────────────────
pnix(
  { command: 'dare', alias: ['d'], desc: 'Get a random dare challenge', type: 'fun' },
  async (m, args, client) => {
    const dares = [
      'Send a selfie without any filter to this chat.',
      'Write your name with your non-dominant hand and send the photo.',
      'Do 10 push-ups and send a video proof.',
      'Call someone you haven\'t spoken to in a year.',
      'Send your most embarrassing photo from your gallery.',
      'Speak in an accent for the next 5 minutes.',
      'Change your profile picture to something funny for 1 hour.',
      'Send a voice note singing your favourite song.',
      'Write a poem about the person to your left.',
      'Do your best animal impression on a voice note.',
    ];
    const d = dares[Math.floor(Math.random() * dares.length)];
    return m.reply(`*💪 DARE*\n\n${d}`);
  }
);

// ── SHIP ──────────────────────────────────────
pnix(
  { command: 'ship', desc: 'Check compatibility between two names. Usage: .ship <name1> & <name2>', type: 'fun' },
  async (m, args, client) => {
    let names = args.split(/[&|,]/);
    if (names.length < 2) {
      const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (mentioned.length >= 2) {
        names = mentioned.map(j => j.split('@')[0]);
      } else {
        return m.reply('❌ Usage: *.ship Name1 & Name2* or tag two people.');
      }
    }
    const [n1, n2] = names.map(n => n.trim());
    const score = Math.floor(Math.random() * 101);
    const bars = Math.round(score / 10);
    const meter = '█'.repeat(bars) + '░'.repeat(10 - bars);

    let emoji = '💔';
    if (score >= 80) emoji = '💖';
    else if (score >= 60) emoji = '❤️';
    else if (score >= 40) emoji = '🧡';
    else if (score >= 20) emoji = '💛';

    return m.reply(
      `*💘 SHIP METER*\n\n` +
      `${n1} ❤️ ${n2}\n\n` +
      `[${meter}] ${score}%\n\n` +
      `${emoji} ${score >= 80 ? 'Perfect match!' : score >= 60 ? 'Great compatibility!' : score >= 40 ? 'There is potential!' : score >= 20 ? 'Need more work...' : 'Not meant to be!'}`
    );
  }
);

// ── MAGIC 8-BALL ──────────────────────────────
pnix(
  { command: '8ball', alias: ['eightball', 'magic8'], desc: 'Ask the magic 8 ball. Usage: .8ball <question>', type: 'fun' },
  async (m, args, client) => {
    const q = args.trim();
    if (!q) return m.reply('❌ Ask a question!\nUsage: *.8ball Will I be rich?*');

    const answers = [
      '🟢 It is certain.', '🟢 It is decidedly so.', '🟢 Without a doubt.', '🟢 Yes, definitely!',
      '🟡 Reply hazy, try again.', '🟡 Ask again later.', '🟡 Better not tell you now.',
      '🔴 Don\'t count on it.', '🔴 My reply is no.', '🔴 Very doubtful.',
    ];
    const ans = answers[Math.floor(Math.random() * answers.length)];
    return m.reply(`*🎱 Magic 8-Ball*\n\n❓ ${q}\n\n${ans}`);
  }
);

// ── JOKE ──────────────────────────────────────
pnix(
  { command: 'joke', alias: ['jokes', 'rjoke'], desc: 'Get a random joke', type: 'fun' },
  async (m, args, client) => {
    try {
      const res = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 8000 });
      const { setup, punchline } = res.data;
      return m.reply(`*😂 Joke*\n\n${setup}\n\n||${punchline}||`);
    } catch {
      return m.reply('😂 Why did the bot crash? Because it ran out of jokes! (API unavailable)');
    }
  }
);

// ── MEME ──────────────────────────────────────
pnix(
  { command: 'meme', alias: ['randmeme'], desc: 'Get a random meme', type: 'fun' },
  async (m, args, client) => {
    await m.react('🤣');
    try {
      const res = await axios.get('https://meme-api.com/gimme', { timeout: 10000 });
      const { title, url } = res.data;
      if (!url) throw new Error();
      await client.sendMessage(m.chat, {
        image: { url },
        caption: `*😂 ${title}*`,
      }, { quoted: m.data });
    } catch {
      await m.react('❌');
      return m.reply('❌ Failed to fetch meme. Try again!');
    }
  }
);

// ── COMPLIMENT ────────────────────────────────
pnix(
  { command: 'compliment', alias: ['comp'], desc: 'Send a compliment. Usage: .compliment @user', type: 'fun' },
  async (m, args, client) => {
    const compliments = [
      'You have the best smile!', 'You are absolutely amazing!', 'You light up every room you walk into!',
      'Your intelligence is truly inspiring.', 'You make the world a better place.',
      'You are one of a kind!', 'You are stronger than you think.', 'Your kindness is contagious!',
    ];
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const name = mentioned ? `@${mentioned.split('@')[0]}` : (args.trim() || 'you');
    const c = compliments[Math.floor(Math.random() * compliments.length)];
    return m.reply(`*💝 Compliment for ${name}*\n\n${c}`);
  }
);

// ── SIMP METER ────────────────────────────────
pnix(
  { command: 'simp', desc: 'Check your simp level. Usage: .simp @user', type: 'fun' },
  async (m, args, client) => {
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const name = mentioned ? `@${mentioned.split('@')[0]}` : (args.trim() || m.pushName || 'You');
    const score = Math.floor(Math.random() * 101);
    const bars = Math.round(score / 10);
    const meter = '█'.repeat(bars) + '░'.repeat(10 - bars);
    return m.reply(
      `*😩 SIMP METER*\n\n${name}\n[${meter}] ${score}%\n\n${score > 80 ? '💀 Ultimate Simp! Certified!' : score > 60 ? '😭 Pretty Simpy...' : score > 40 ? '😅 A bit simpy...' : '😎 You\'re based, not a simp!'}`
    );
  }
);

// ── STUPID METER ──────────────────────────────
pnix(
  { command: 'stupid', alias: ['iq', 'iqtest'], desc: 'Check IQ level. Usage: .stupid @user', type: 'fun' },
  async (m, args, client) => {
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const name = mentioned ? `@${mentioned.split('@')[0]}` : (args.trim() || m.pushName || 'You');
    const iq = Math.floor(Math.random() * 201);
    return m.reply(
      `*🧠 IQ TEST*\n\n${name}'s IQ: *${iq}*\n\n${iq > 160 ? '🌟 Genius level!' : iq > 120 ? '🎓 Above average!' : iq > 90 ? '😐 Average.' : iq > 60 ? '😅 Below average...' : '💀 Oh no...'}`
    );
  }
);

// ── RANDOM JOKE (dad jokes) ───────────────────
pnix(
  { command: 'dadjoke', alias: ['dad'], desc: 'Get a dad joke', type: 'fun' },
  async (m, args, client) => {
    try {
      const res = await axios.get('https://icanhazdadjoke.com/', {
        headers: { Accept: 'application/json' },
        timeout: 8000,
      });
      return m.reply(`*👴 Dad Joke*\n\n${res.data.joke}`);
    } catch {
      return m.reply('Why do dads tell bad jokes? Because they love groan-ing! (API unavailable)');
    }
  }
);

// ── TIC-TAC-TOE (simple vs bot) ──────────────
const tttGames = {};

pnix(
  { command: 'tictactoe', alias: ['ttt'], desc: 'Play Tic-Tac-Toe against bot. Start: .tictactoe | Move: .ttt <1-9>', type: 'fun' },
  async (m, args, client) => {
    const key = m.chat + ':' + m.sender;

    if (!tttGames[key] || args.trim() === 'new') {
      tttGames[key] = Array(9).fill('·');
      const board = tttGames[key];
      return m.reply(
        `*🎮 Tic-Tac-Toe — You (X) vs Bot (O)*\n\n` +
        `${board[0]}|${board[1]}|${board[2]}  1|2|3\n` +
        `${board[3]}|${board[4]}|${board[5]}  4|5|6\n` +
        `${board[6]}|${board[7]}|${board[8]}  7|8|9\n\n` +
        `Your turn! Reply *.ttt <1-9>* to place X.`
      );
    }

    const pos = parseInt(args.trim()) - 1;
    if (isNaN(pos) || pos < 0 || pos > 8) return m.reply('❌ Enter a number 1-9.');

    const board = tttGames[key];
    if (board[pos] !== '·') return m.reply('❌ That spot is taken!');

    board[pos] = 'X';
    const checkWinner = (b) => {
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for (const [a, c, d] of lines) if (b[a] !== '·' && b[a] === b[c] && b[a] === b[d]) return b[a];
      if (b.every(c => c !== '·')) return 'draw';
      return null;
    };

    if (checkWinner(board) === 'X') {
      delete tttGames[key];
      return m.reply(`${board[0]}|${board[1]}|${board[2]}\n${board[3]}|${board[4]}|${board[5]}\n${board[6]}|${board[7]}|${board[8]}\n\n🎉 *You Win!* Well played! Type *.ttt new* to play again.`);
    }

    // Bot plays (random available)
    const empty = board.map((v, i) => v === '·' ? i : -1).filter(i => i !== -1);
    if (empty.length) board[empty[Math.floor(Math.random() * empty.length)]] = 'O';

    const result = checkWinner(board);
    const display = `${board[0]}|${board[1]}|${board[2]}\n${board[3]}|${board[4]}|${board[5]}\n${board[6]}|${board[7]}|${board[8]}`;

    if (result === 'O') { delete tttGames[key]; return m.reply(`${display}\n\n🤖 *Bot Wins!* Better luck next time. Type *.ttt new* to play again.`); }
    if (result === 'draw') { delete tttGames[key]; return m.reply(`${display}\n\n🤝 *It's a Draw!* Type *.ttt new* to play again.`); }

    return m.reply(`${display}\n\nYour turn! Type *.ttt <1-9>* to move.`);
  }
);
