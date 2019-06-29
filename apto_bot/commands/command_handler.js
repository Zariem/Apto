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
            let argument = content[1];
            if (argument === "help") {
                message.channel.send("Usage: `" + config.prefix + "importServer https://url.to.your/server.json`\n" +
                                     "Alternatively, use one of our templates:\n" +
                                     "`" + config.prefix + "importServer gameCompany` *for Game Company Discord Servers*\n" +
                                     "`" + config.prefix + "importServer artCommunity` *for Art Community Servers*\n" +
                                     "`" + config.prefix + "importServer streamer` *for YouTube or Twitch streamers' Discord Servers*")
                message.channel.send("*To use your own template, use the `!save` command in one of your servers, right click the file and select `Copy Link`.\n\n*" +
                                     "Be aware that this command is a work in progress. Additive import works, but there are several things about this command that ashame me." +
                                     "I just couldn't fix and/or implement them in the given timeframe.")
            } else if (argument === "gameCompany") {
                argument = "https://cdn.discordapp.com/attachments/593770598841188352/594250014721835008/server_game_company.json";
            } else if (argument === "artCommunity") {
                argument = "https://cdn.discordapp.com/attachments/593770598841188352/594286432617758730/server_art_community.json";
            } else if (argument === "streamer") {
                argument = "https://cdn.discordapp.com/attachments/593770598841188352/594286733114474526/server_streamer.json";
            }
            serverLayout.initImport(bot, message, argument);
        }

        if (command === "save") {
            if (!hasAdminPermissions) return message.channel.send("Only Admins can do that. Try it on your own server!");
            serverLayout.save(bot, message);
        }

        if (command === "tempBan") {
            if (!hasAdminPermissions) return message.channel.send("Only Admins can do that. Try it on your own server!");
            if (!content[1] || content[1] === "help") {
                return message.channel.send("Usage: `" + config.prefix + "tempban [userID|@user] 1 [d|day|days] 1 [h|hrs|hour|hours] 1 [m|min|minute|minutes]`");
            }
            moderation.tempBan(bot, message, content);
        }

        if (command === "unban") {
            if (!hasAdminPermissions) return message.channel.send("Only Admins can do that. Try it on your own server!");
            if (!content[1] || content[1] === "help") {
                return message.channel.send("Usage: `" + config.prefix + "unban [userID|@user]`");
            }
            moderation.unban(bot, message, content);
        }

        if (command === "clone") {
            if (!hasAdminPermissions) return message.channel.send("Only Admins can do that. Try it on your own server!");
            if (!content[1] || content[1] === "help") {
                return message.channel.send("Usage: `" + config.prefix + "clone (@role_mention|role_name|roleID|#channel_hashtag|channel_name|channelID)`");
            }
            let query = content.slice(1).join(" ");
            cloner.clone(bot, message, query);
        }

        if (command === "ping") {
            message.channel.send("Pong!");
        }

        if (command === "credits") {
            help.credits(bot, message);
        }

        if (command === "aptomoji") { // help page is handled in there ;)
            let emojiName = content[1];
            if (!emojiName) emojiName = "";
            aptoMoji.sendEmoji(bot, message, emojiName);
        }
    }

}

// make sure other files can access this function from outside
module.exports.executeCommand = executeCommand;
