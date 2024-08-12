const { prefix } = require("./config");

module.exports = (client, message) => {
    const { text, chat } = message;

    if (!text.startsWith(prefix)) return;

    const commandBody = text.slice(prefix.length).trim();
    const command = commandBody.split(" ")[0].toLowerCase();
    const args = commandBody.split(" ").slice(1);

    // Command handling
    switch (command) {
        case "hello":
            client.sendText(chat, "Hello there!");
            break;
        
        case "ping":
            client.sendText(chat, "Pong!");
            break;

        case "echo":
            client.sendText(chat, args.join(" "));
            break;

        // Add more commands here

        default:
            client.sendText(chat, "Unknown command.");
            break;
    }
};
