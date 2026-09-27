require('dotenv').config();
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const path = require("path");
const express = require("express");
const got = require("got");
const axios = require("axios");
const fs = require("fs");
const {
  getJson,
  getBot,
  config,
  getPlatform,
  parsedJid,
  getDeployments,
  sleep,
  decodeJid,
} = require("./lib");
const event = require("./lib/commands");
const { PluginDB } = require("./lib/database/plugins");
const sessionManager = require("./lib/sessionManager");
const setupWebServer = require("./lib/webServer").setupWebServer || require("./lib/webServer");

const app = express();
const PORT = process.env.PORT || 3000;

process.on("SIGTERM", () => {
  console.log("Process killed");
  process.exit(0);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED PROMISE:", err);
});

// Pre-load all plugins at startup
function loadPlugins() {
  const pluginsDir = path.resolve(__dirname, "./plugins");
  if (fs.existsSync(pluginsDir)) {
    const files = fs.readdirSync(pluginsDir);
    for (const file of files) {
      if (file.endsWith(".js")) {
        try {
          require("./plugins/" + file);
        } catch (err) {
          console.error(`❌ Plugin Load Failed: ${file}`, err.message);
        }
      }
    }
    console.log(`✅ Loaded ${event.commands?.length || 0} commands from plugins.`);
  }
}
loadPlugins();

async function THARUUX() {
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    proto,
    fetchLatestBaileysVersion,
    Browsers,
    DisconnectReason,
    jidNormalizedUser,
    areJidsSameUser,
    generateWAMessage,
    getAggregateVotesInPollMessage,
    delay,
  } = await import("@whiskeysockets/baileys");

  const botPrefix =
    !config.PREFIX ||
      config.PREFIX.toLowerCase() === "false" ||
      config.PREFIX.toLowerCase() === "null"
      ? ""
      : config.PREFIX.trim();

  const sudoList = (config.SUDO || "")
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const storeFile = "./lib/database/store.json";
  let store = { messages: {}, contacts: {} };
  if (fs.existsSync(storeFile)) {
    try {
      store = JSON.parse(fs.readFileSync(storeFile, "utf8"));
    } catch { }
  }
  setInterval(() => {
    try {
      fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
    } catch { }
  }, 60000);

  try {
    const credsFile = path.join("./lib/session", "creds.json");
    if (!fs.existsSync(credsFile)) {
      if (config.SESSION_ID) {
        if (config.SESSION_ID.startsWith("THARUUX~")) {
          try {
            const raw = Buffer.from(
              config.SESSION_ID.replace(/^(Phoenix|THARUUX)~/, "").trim(),
              "base64"
            ).toString("utf8");
            await fs.promises.writeFile(credsFile, JSON.stringify(JSON.parse(raw), null, 2));
            console.log("✅ Restored session from config.SESSION_ID");
          } catch (e) {
            console.warn("Could not decode base64 SESSION_ID:", e.message);
          }
        } else if (getBot(config.SESSION_ID)) {
          try {
            const sessionUrl =
              config.BASE_URL + "api/session?sessionId=" + config.SESSION_ID;
            const { data } = await axios.get(sessionUrl);
            if (data?.creds) {
              await fs.promises.writeFile(credsFile, JSON.stringify(data.creds, null, 2));
            }
          } catch (e) {
            console.warn("Could not fetch remote session:", e.message);
          }
        }
      }
    }

    if (!fs.existsSync(credsFile)) {
      console.log(
        `ℹ️ No WhatsApp session found. Open the web interface at http://localhost:${PORT} to scan QR or connect with phone number.`
      );
      sessionManager.isBotRunning = false;
      sessionManager.connectionState = "close";
      return;
    }

    await sessionManager.closeActiveSocket();

    const { state, saveCreds } = await useMultiFileAuthState("./lib/session/");
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`ℹ️ Connecting To WhatsApp (Baileys v${version.join(".")}, latest: ${isLatest})...`);
    sessionManager.connectionState = "connecting";

    const client = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.ubuntu("Chrome"),
      getMessage: async (key) => {
        const jid = key.remoteJidAlt || key.remoteJid;
        return store.messages?.[jid]?.[key.id]?.message || null;
      },
    });

    client.store = store;

    client.ev.on("creds.update", saveCreds);

    client.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (!connection) {
        return;
      }

      if (connection === "connecting") {
        console.log("ℹ️ Connecting To WhatsApp...");
        sessionManager.connectionState = "connecting";
      } else if (connection === "reconnecting") {
        console.log("🔄 Reconnecting To WhatsApp...");
        sessionManager.connectionState = "reconnecting";
      } else if (connection === "close") {
        sessionManager.isBotRunning = false;
        sessionManager.connectionState = "close";
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log("⚠️ [THARUUX Bot] Connection closed. StatusCode:", statusCode, "Message:", lastDisconnect?.error?.message || lastDisconnect?.error);

        if (statusCode === DisconnectReason.loggedOut) {
          console.log("Logged out. Delete session and scan again.");
          sessionManager.logout();
          return;
        }
        if (statusCode === DisconnectReason.connectionReplaced) {
          console.log("Session replaced. Another instance is running.");
          return;
        }
        if (!sessionManager.hasSession()) {
          console.log("ℹ️ Session not authenticated. Waiting for login via web interface...");
          return;
        }
        if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
          console.log("🔄 Handshake restart required (515). Reconnecting in 2 seconds...");
          setTimeout(() => THARUUX(), 2000);
          return;
        }
        console.log("Connection lost. Reconnecting in 5 seconds...");
        setTimeout(() => THARUUX(), 5000);
      } else if (connection === "open") {
        console.log("THARUUX-MD Connected To WhatsApp ✅");
        sessionManager.isBotRunning = true;
        sessionManager.connectionState = "open";

        if (client.user) {
          sessionManager.userInfo = {
            id: client.user.id,
            name: client.user.name || "THARUUX User",
            phone: client.user.id.split("@")[0].split(":")[0],
          };

          const userJid = jidNormalizedUser(client.user.id);
          const userPhone = client.user.id.split("@")[0].split(":")[0];
          if (!sudoList.includes(userJid)) sudoList.push(userJid);
          if (!sudoList.includes(userPhone)) sudoList.push(userPhone);
          if (!sudoList.includes(client.user.id)) sudoList.push(client.user.id);
        }

        // Fire-and-forget optional newsletter & group invite
        client.newsletterFollow("120363410293335196@newsletter").catch(() => { });
        client.groupAcceptInvite("BOLb0ICN3sAJ5dloRBw5VD").catch(() => { });

        try {
          await config.DATABASE.sync();
        } catch (dbErr) {
          console.warn("Database sync notice:", dbErr.message);
        }

        // Ensure external database plugins are fetched if configured
        try {
          const customPlugins = await PluginDB.findAll();
          for (const p of customPlugins) {
            const pluginFile = `./plugins/${p.dataValues.name}.js`;
            if (!fs.existsSync(pluginFile)) {
              try {
                const res = await got(p.dataValues.url);
                if (res.statusCode === 200) {
                  fs.writeFileSync(pluginFile, res.body);
                  require(pluginFile);
                }
              } catch (e) {
                console.error(`Failed to install plugin ${p.dataValues.name}:`, e.message);
              }
            }
          }
        } catch (e) { }

        // Reload plugins to ensure everything is registered
        loadPlugins();
        console.log(`Plugins Installed ✅ (${event.commands?.length || 0} commands registered)`);
        console.log("THARUUX-MD By Tharuux 🍀");

        if (config.START_MSG && client.user) {
          const myJid = client.user.id.includes(":")
            ? client.user.id.split(":")[0] + "@s.whatsapp.net"
            : client.user.id;
          client.sendMessage(myJid, {
            text:
              "*ᴛʜᴀʀᴜᴜx-ᴍᴅ ꜱᴛᴀʀᴛᴇᴅ*\n\n*ᴠᴇʀꜱɪᴏɴ:* " +
              require("./package.json").version +
              "\n*ᴘʟᴜɢɪɴꜱ:* " +
              event.commands.length +
              "\n*ᴍᴏᴅᴇ:* " +
              config.MODE +
              "\n*ᴘʀᴇꜰɪx:* " +
              config.PREFIX +
              "\n*ꜱᴜᴅᴏ:* " +
              config.SUDO,
            contextInfo: {
              externalAdReply: {
                title: "ᴛʜᴀʀᴜᴜx-ᴍᴅ",
                body: "ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ",
                thumbnailUrl: "https://md.tharuux.lk/images/logo.png",
                mediaType: 1,
                sourceUrl: "https://md.tharuux.lk",
              },
            },
          }).catch(() => { });
        }
      }
    });

    client.ev.on("call", async (calls) => {
      for (const call of calls) {
        const { status, from, id } = call;
        if (config.AUTO_CALL_REJECT && status === "offer") {
          await client.rejectCall(id, from);
          await client.sendMessage(from, {
            text: "" + config.AUTO_CALL_REJECT_MSG,
            contextInfo: {
              externalAdReply: {
                title: "ᴛʜᴀʀᴜᴜx-ᴍᴅ",
                body: "ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ",
                thumbnailUrl: "https://md.tharuux.lk/images/logo.png",
                mediaType: 1,
                sourceUrl: "https://md.tharuux.lk",
              },
            },
          }).catch(() => { });
        }
      }
    });

    client.ev.on("contacts.update", (contacts) => {
      for (const c of contacts) {
        const id = decodeJid(c.id);
        if (store && store.contacts) {
          store.contacts[id] = { id, name: c.notify };
        }
      }
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

    client.ev.on("messages.upsert", async (msgUpdate) => {
      try {
        if (!msgUpdate || !msgUpdate.messages) return;
        // Accept both "notify" (incoming) and "append" (sent from linked device/phone)
        if (msgUpdate.type !== "notify" && msgUpdate.type !== "append") return;

        for (const rawMsg of msgUpdate.messages) {
          if (!rawMsg || !rawMsg.message) continue;

          const remoteJid = rawMsg.key.remoteJidAlt || rawMsg.key.remoteJid;
          if (!remoteJid) continue;
          if (remoteJid.endsWith("@newsletter")) continue; // Ignore broadcast newsletter channels

          const unwrapped = unwrapMessage(rawMsg.message);
          if (!unwrapped) continue;

          const msgType = Object.keys(unwrapped)[0];
          if (
            msgType === "protocolMessage" ||
            msgType === "senderKeyDistributionMessage" ||
            msgType === "messageContextInfo"
          )
            continue;

          if (!store.messages[remoteJid]) store.messages[remoteJid] = {};
          store.messages[remoteJid][rawMsg.key.id] = rawMsg;

          // Keep last 100 messages in memory per chat
          const storedKeys = Object.keys(store.messages[remoteJid]);
          if (storedKeys.length > 100) {
            delete store.messages[remoteJid][storedKeys[0]];
          }

          if (unwrapped && typeof unwrapped === "object") {
            for (const key of Object.keys(unwrapped)) {
              const ctx = unwrapped[key]?.contextInfo;
              if (ctx?.quotedMessage) {
                ctx.rawQuotedMessage = ctx.quotedMessage;
                ctx.quotedMessage = unwrapMessage(ctx.quotedMessage);
              }
            }
          }

          const normalizedMsg = {
            ...rawMsg,
            message: unwrapped
          };

          const { Message } = require("./lib");
          const m = await new Message(client, normalizedMsg);
          if (m.quoted && typeof m.quoted.then === "function") {
            m.quoted = await m.quoted;
          }
          if (m.quoted && !m.quoted.message) {
            m.quoted.message = m.quoted.data?.message || m.quoted.msg || null;
          }

          // Robust Owner / SUDO check
          const botId = client.user?.id ? client.user.id.split("@")[0].split(":")[0] : "";
          const senderId = m.sender ? m.sender.split("@")[0].split(":")[0] : "";
          const isOwner = Boolean(
            m.fromMe ||
            (botId && senderId && botId === senderId) ||
            sudoList.includes(m.sender) ||
            sudoList.includes(senderId) ||
            (senderId && sudoList.some((s) => typeof s === "string" && s.includes(senderId)))
          );

          console.log(`[🍀 THARUUX-MD Bot Logs] ${new Date().toISOString()}`);
          console.log(`👤 From: ${m.pushName || "Unknown"} (${m.jid ? m.jid.replace("@s.whatsapp.net", "") : senderId})`);
          console.log(`🛡️ Chat: ${m.isGroup ? "Group" : "Private"}`);
          console.log(`💬 Message: ${m.text || m.type}`);

          // Status automation
          const isStatus = Boolean(
            remoteJid === "status@broadcast" ||
            m?.msg?.imageMessage?.contextInfo ||
            m?.msg?.extendedTextMessage?.contextInfo ||
            m?.msg?.videoMessage?.contextInfo?.statusSourceType ||
            m?.msg?.audioMessage?.contextInfo?.statusSourceType
          );
          if (isStatus) {
            if (config.AUTO_STATUS_VIEW) {
              await client.readMessages([rawMsg.key]).catch(() => { });
            }
            if (config.AUTO_STATUS_REPLY) {
              await m.reply(config.AUTO_STATUS_REPLY_MSG).catch(() => { });
            }
            if (config.AUTO_STATUS_REACT) {
              await m.react("🍧").catch(() => { });
            }
          }

          if (config.AUTO_MSG_REACT) {
            try {
              const emo = await getJson(config.BASE_URL + "api/emoji");
              if (emo?.result?.emoji) await m.react(emo.result.emoji).catch(() => { });
            } catch { }
          }

          if (config.AUTO_MSG_READ) {
            await client.readMessages([m.data.key]).catch(() => { });
          }

          if (config.AUTO_ALWAYS_ONLINE && m.jid) {
            await client.sendPresenceUpdate("available", m.jid).catch(() => { });
          }

          // Clean prefix if followed by space e.g. ". ping" -> ".ping"
          if (m.text && botPrefix && m.text.startsWith(botPrefix) && m.text[botPrefix.length] === " ") {
            m.text = m.text.replace(new RegExp("^(" + botPrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + ")\\s+(.+)"), "$1$2");
          }

          const msgText = (m.text || "").trim();
          if (!msgText) continue;

          const msgWord = msgText.toLowerCase().split(/\s+/)[0];

          // Command dispatcher
          const allCommands = event.commands || [];
          let commandMatched = false;

          for (const cmd of allCommands) {
            if (!cmd.command) continue;
            if (!isOwner && cmd.fromMe) continue;

            const aliases = [cmd.command, ...(cmd.alias || [])]
              .filter(Boolean)
              .map((c) => c.toLowerCase());

            for (const alias of aliases) {
              const trigger = (botPrefix + alias).toLowerCase();
              const isMatch = (msgWord === trigger) || (msgWord === alias);

              if (isMatch) {
                commandMatched = true;
                try {
                  if (cmd.onlyGroup && !m.isGroup) {
                    await m.reply("_*ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ ɪꜱ ᴏɴʟʏ ꜰᴏʀ ɢʀᴏᴜᴘꜱ!*_");
                    return;
                  }

                  if (cmd.react) {
                    await client.sendMessage(m.chat, {
                      react: { text: cmd.react, key: m.data.key },
                    }).catch(() => { });
                  }

                  const matchedPrefix = msgWord === trigger ? trigger : alias;
                  const args = msgText.slice(matchedPrefix.length).trim();
                  await cmd.function(m, args, client);
                  return;
                } catch (cmdErr) {
                  console.error(`Command error in ${cmd.command}:`, cmdErr);
                  if (config.ERROR_MSG) {
                    await m.reply(`*Error in command ${cmd.command}:*\n\`\`\`${cmdErr.message}\`\`\``).catch(() => { });
                  }
                  return;
                }
              }
            }
          }

          // If no explicit command matched, trigger listeners (on: 'text', on: 'all')
          if (!commandMatched) {
            for (const cmd of allCommands) {
              if (cmd.on) {
                try {
                  await cmd.function(m, msgText, client);
                } catch (onErr) {
                  console.error(`ON error in ${cmd.command || "unknown"}:`, onErr.message);
                }
              }
            }
          }
        }
      } catch (upsertErr) {
        console.error("messages.upsert crash:", upsertErr);
      }
    });

    client.appenTextMessage = async (text, quoted) => {
      const remote = quoted.key.remoteJidAlt || quoted.key.remoteJid;
      const waMsg = await generateWAMessage(remote, { text }, {});
      waMsg.key.fromMe = quoted.key.fromMe;
      waMsg.pushName = quoted.pushName;
      if (quoted.participant) waMsg.participant = quoted.participant;
      client.ev.emit("messages.upsert", {
        messages: [proto.WebMessageInfo.fromObject(waMsg)],
        type: "notify",
      });
    };
  } catch (initErr) {
    console.error("Error during THARUUX Session initialization:", initErr);
  }
}

// Setup web UI and API
setupWebServer(app);

const serverType = process.env.RENDER_EXTERNAL_URL
  ? "RENDER"
  : process.env.KOYEB_PUBLIC_DOMAIN
    ? "KOYEB"
    : process.env.FLY_APP_NAME
      ? "FLY"
      : null;

const uptimeUrl =
  serverType === "RENDER"
    ? process.env.RENDER_EXTERNAL_URL
    : serverType === "KOYEB"
      ? "https://" + process.env.KOYEB_PUBLIC_DOMAIN
      : serverType === "FLY"
        ? `https://${process.env.FLY_APP_NAME}.fly.dev`
        : null;

app.get("/", (req, res) => {
  res.status(200).send("⚡ THARUUX-MD WhatsApp Bot Engine is Active");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 THARUUX-MD Multi-Tenant Bot Server Online`);
  console.log(`🌐 Server Port: ${PORT}`);
  console.log(`📱 User bots managed dynamically via Supabase & Baileys`);
  console.log(`======================================================\n`);
});

if (uptimeUrl) {
  setInterval(() => {
    axios
      .get(`${uptimeUrl}/health`, {
        timeout: 5000,
        headers: { "User-Agent": "THARUUX-KeepAlive" },
        validateStatus: (status) => status < 500,
      })
      .catch((err) => {
        // silent catch
      });
  }, 120000);
}
