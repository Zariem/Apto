
const config = require('../config.json');
const serverLayout = require('./server_layout.js');
const cloner = require('./clone.js');
const aptoMoji = require('./aptomoji.js');
const moderation = require('./moderation.js');

const executeCommand = async (bot, message) => {

    if (message.channel.type === "dm") {
        // handle direct message commands
        return;
    } else if (message.channel.type === "text") {

        // remove prefix, store all arguments separated by " "
        let content = message.content.slice(config.prefix.length).split(" ");
        let command = content[0];

        if (command === "ping") {
            message.channel.send("Pong!");
        }

        if (command === "importServer") {
            serverLayout.initImport(bot, message, content[1]);
        }

        if (command === "clearRoles") {
            serverLayout.clearRoles(bot, message);
        }

        if (command === "tempBan") {
            moderation.tempBan(bot, message, content);
        }

        if (command === "unban") {
            moderation.unban(bot, message, content);
        }

        if (command === "save") {
            serverLayout.save(bot, message);
        }

        if (command === "clone") {
            let query = content.slice(1).join(" ");
            cloner.clone(bot, message, query);
        }

        if (command === "aptomoji") {
            let emojiName = content[1];
            if (!emojiName) emojiName = "";
            aptoMoji.sendEmoji(bot, message, emojiName);
        }
    }

}

// make sure other files can access this function from outside
module.exports.executeCommand = executeCommand;
