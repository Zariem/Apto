const Discord = require('discord.js');
const config = require('../config.json');
const serverLayout = require('./server_layout.js');
const cloner = require('./clone.js');
const aptoMoji = require('./aptomoji.js');
const moderation = require('./moderation.js');
const help = require('../util/help.js');

const executeCommand = async (bot, message) => {

    if (message.channel.type === "dm") {
        // handle direct message commands
        return;
    } else if (message.channel.type === "text") {
        let hasAdminPermissions = false;
        if (message.member) {
            if (message.member.hasPermission(8)) {
                hasAdminPermissions = true;
            }
        }
        // remove prefix, store all arguments separated by " "
        let content = message.content.slice(config.prefix.length).split(" ");
        let command = content[0];

        if (command === "help") {
            help.listCommands(bot, message);
        }

        if (command === "importServer") {
            if (!hasAdminPermissions) return message.channel.send("Only Admins can do that. Try it on your own server!");
            serverLayout.initImport(bot, message, content[1]);
        }

        if (command === "save") {
            if (!hasAdminPermissions) return message.channel.send("Only Admins can do that. Try it on your own server!");
            serverLayout.save(bot, message);
        }

        if (command === "tempBan") {
            if (!hasAdminPermissions) return message.channel.send("Only Admins can do that. Try it on your own server!");
            moderation.tempBan(bot, message, content);
        }

        if (command === "unban") {
            if (!hasAdminPermissions) return message.channel.send("Only Admins can do that. Try it on your own server!");
            moderation.unban(bot, message, content);
        }

        if (command === "clone") {
            if (!hasAdminPermissions) return message.channel.send("Only Admins can do that. Try it on your own server!");
            let query = content.slice(1).join(" ");
            cloner.clone(bot, message, query);
        }

        if (command === "ping") {
            message.channel.send("Pong!");
        }

        if (command === "credits") {
            help.credits(bot, message);
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
