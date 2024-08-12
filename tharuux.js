const { BufferJSON, WA_DEFAULT_EPHEMERAL, generateWAMessageFromContent, proto, generateWAMessageContent, generateWAMessage, prepareWAMessageMedia, areJidsSameUser, getContentType } = require("@whiskeysockets/baileys");
const fs = require("fs");
const util = require("util");
const chalk = require("chalk");
const OpenAI = require("openai");
let setting = require("./key.json");
const openai = new OpenAI({ apiKey: setting.keyopenai });
const { prefix, alive_msg, alive_img_url } = require("./config");

// Import youtube-mp3-downloader and path
const YoutubeMp3Downloader = require("youtube-mp3-downloader");
const path = require("path");

// Initialize YoutubeMp3Downloader with options
const YD = new YoutubeMp3Downloader({
    "ffmpegPath": "/usr/local/bin/ffmpeg", // FFmpeg binary location
    "outputPath": "./mp3",                 // Output file location (save in mp3 folder)
    "youtubeVideoQuality": "highestaudio", // Desired audio quality
    "queueParallelism": 2,                 // Download parallelism
    "progressTimeout": 2000,               // Interval in ms for the progress reports
    "allowWebm": false                     // Whether to download WebM audio formats instead of mp3
});

module.exports = sansekai = async (client, m, chatUpdate) => {
    try {
        var body = m.mtype === "conversation" ? m.message.conversation :
            m.mtype == "imageMessage" ? m.message.imageMessage.caption :
            m.mtype == "videoMessage" ? m.message.videoMessage.caption :
            m.mtype == "extendedTextMessage" ? m.message.extendedTextMessage.text :
            m.mtype == "buttonsResponseMessage" ? m.message.buttonsResponseMessage.selectedButtonId :
            m.mtype == "listResponseMessage" ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
            m.mtype == "templateButtonReplyMessage" ? m.message.templateButtonReplyMessage.selectedId :
            m.mtype === "messageContextInfo" ? m.message.buttonsResponseMessage?.selectedButtonId ||
                m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text :
            "";
        if (m.mtype === "viewOnceMessageV2") return
        var budy = typeof m.text == "string" ? m.text : "";
        var prefix = /^[\\/!#.]/gi.test(body) ? body.match(/^[\\/!#.]/gi) : ".";
        const isCmd2 = body.startsWith(prefix);
        const command = body.replace(prefix, "").trim().split(/ +/).shift().toLowerCase();
        const args = body.trim().split(/ +/).slice(1);
        const pushname = m.pushName || "No Name";
        const botNumber = await client.decodeJid(client.user.id);
        const itsMe = m.sender == botNumber ? true : false;
        let text = (q = args.join(" "));
        const arg = budy.trim().substring(budy.indexOf(" ") + 1);
        const arg1 = arg.trim().substring(arg.indexOf(" ") + 1);

        const from = m.chat;
        const reply = m.reply;
        const sender = m.sender;
        const mek = chatUpdate.messages[0];

        const color = (text, color) => {
            return !color ? chalk.green(text) : chalk.keyword(color)(text);
        };

        // Group
        const groupMetadata = m.isGroup ? await client.groupMetadata(m.chat).catch((e) => { }) : "";
        const groupName = m.isGroup ? groupMetadata.subject : "";

        // Push Message To Console
        let argsLog = budy.length > 30 ? `${q.substring(0, 30)}...` : budy;

        if (isCmd2 && !m.isGroup) {
            console.log(chalk.black(chalk.bgWhite("[ LOGS ]")), color(argsLog, "turquoise"), chalk.magenta("From"), chalk.green(pushname), chalk.yellow(`[ ${m.sender.replace("@s.whatsapp.net", "")} ]`));
        } else if (isCmd2 && m.isGroup) {
            console.log(
                chalk.black(chalk.bgWhite("[ LOGS ]")),
                color(argsLog, "turquoise"),
                chalk.magenta("From"),
                chalk.green(pushname),
                chalk.yellow(`[ ${m.sender.replace("@s.whatsapp.net", "")} ]`),
                chalk.blueBright("IN"),
                chalk.green(groupName)
            );
        }

        if (isCmd2) {
            switch (command) {
                case "help": case "menu": case "start": case "info":
                    try {
                        client.sendImage(from, "https://github.com/THARUUX/THARUUX/blob/main/20240509_131601.png?raw=true", alive_msg, mek);
                    } catch (error) {
                        m.reply(error.message);
                    }
                    break;
                case "ai": case "openai": case "chatgpt": case "ask":
                    m.reply(`*OPENAI commands are currently under maintaince.*`);
                    break;
                case "song": case "yt":
                    if (!text) {
                        return m.reply('*Mention a song name as well.* \n\n Ex: `.song FADED` | `.yt FADED`');
                    }
                    try {
                        m.reply("Searching for the song...");

                        // You can use ytdl-core or another method to get the YouTube video ID
                        const videoId = "dQw4w9WgXcQ"; // Replace with actual video ID fetching logic
                        const outputFilePath = path.resolve(__dirname, `./mp3/${text}.mp3`);

                        // Download and convert video to MP3
                        YD.download(videoId, `${text}.mp3`);

                        YD.on("finished", async (err, data) => {
                            if (err) {
                                console.error(err);
                                return m.reply("Failed to download the song.");
                            }

                            console.log(`Finished downloading: ${outputFilePath}`);
                            await client.sendMessage(from, { audio: { url: outputFilePath }, mimetype: "audio/mp4" }, { quoted: m });

                            // Optionally, delete the file after sending
                            fs.unlinkSync(outputFilePath);
                        });

                        YD.on("error", (error) => {
                            console.error(error);
                            m.reply("Failed to download the song.");
                        });

                    } catch (error) {
                        console.error(error);
                        m.reply("Failed to download the song.");
                    }
                    break;

                case "img": case "ai-img": case "image": case "images": case "dall-e": case "dalle":
                    try {
                        if (setting.keyopenai === "ISI_APIKEY_OPENAI_DISINI") return reply("Apikey belum diisi\n\nSilahkan isi terlebih dahulu apikeynya di file key.json\n\nApikeynya bisa dibuat di website: https://beta.openai.com/account/api-keys");
                        if (!text) return reply(`Membuat gambar dari AI.\n\nContoh:\n${prefix}${command} Wooden house on snow mountain`);
                        const image = await openai.images.generate({
                            model: "dall-e-3",
                            prompt: q,
                            n: 1,
                            size: '1024x1024'
                        });
                        client.sendImage(from, image.data[0].url, text, mek);
                    } catch (error) {
                        if (error.response) {
                            console.log(error.response.status);
                            console.log(error.response.data);
                            console.log(`${error.response.status}\n\n${error.response.data}`);
                        } else {
                            console.log(error);
                            m.reply("Maaf, sepertinya ada yang error :" + error.message);
                        }
                    }
                    break;
                case "sc": case "script": case "scbot":
                    m.reply("*THARUUX-MD*  \n\n `tharuux.github.io` \n\n >  Developed by THARUUX");
                    break
                default: {
                    break
                }
            }
        }
    } catch (err) {
        m.reply(util.format(err));
    }
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});
