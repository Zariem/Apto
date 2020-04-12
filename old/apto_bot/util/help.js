const config = require('../config.json');
const Discord = require('discord.js');

let commands = [
  {command:"help", descr:"List these commands."},
  {command:"credits", descr:"Who created this bot."},
  {command:"importServer", descr:"Import a server layout either form a template or upload your own server layout.",
     notes:"Work in Progress. Upon importing, the role and channel positioning are off and channel merging does not yet work (CategoryChannel merging works just fine). I am sorry for the inconvenience.\n" +
           "For best impressions, use in complete overwrite mode or complete additive mode.", admin:true},
  {command:"save", descr:"Exports a server layout. Can then be loaded in a different server with the `importServer` command.", admin:true},
  {command:"clone", descr:"Clone a role or channel. This allows for easy setup if you have to create many roles.", admin:true},
  {command:"tempban", descr:"Bans a user for a set amount of time.", admin:true},
  {command:"unban", descr:"Allows unbanning a tempbanned user (or any user, actually, but it removes the tempban entry that would unban that user after his timer expires).", admin:true},
  {command:"ping", descr:"Pong!"},
  {command:"aptomoji", descr:"A collection of over 30 custom emotes for our bot boi! Seriously, check them out, they are adoooorable! (`" + config.prefix + "aptomoji help`)"}
]

const listCommands = (bot, message) => {
    let embed = new Discord.RichEmbed()
                           .setThumbnail("https://cdn.discordapp.com/attachments/592749834079961093/593868119374692389/image0.png")
    for (let command of commands) {
        let additionals = (command.notes) ? "\n*" + command.notes + "*" : "";
        let adminOnly = command.admin ? " (Admin only)" : "";
        embed.addField("💡`" + config.prefix + command.command + "`" + adminOnly, command.descr + additionals);
    }
    message.channel.send(embed);
}

const credits = (bot, message) => {
    let embed = new Discord.RichEmbed()
                           .setTitle("Apto - A Discord Moderation Bot")
                           .setDescription("**Designed and implemented for Discord Hack Week 2019**\n" +
                                           "Work in progress. The product you see here may contain bugs and some unfinished features. The intro video lists features that we have " +
                                           "not found the time to implement. For all available features, use `" + config.prefix + "help`.")
                           .addBlankField()
                           .addField("Programming:", "**Zariem#4244** (team organisation, implementation of all the code, some help on character design)")
                           .addField("Artworks:", "**sakurartsy#1875** (character design, most Aptomojis, Wumpto fanart lines, intro video animation)\n" +
                                                  "**puppetker#5696** (some Aptomojis, Wumpto fanart colours, Apto voiceline script, server templates)")
                           .addField("Layout:", "**GlitchyLink#9904** (github page, appearance, helping out wherever needed)")
                           .addField("Voice Acting:", "**Alexander (lLyxander)#2030** (providing a lovely voice for Apto, some video editing and also creating server templates)")
                           .addBlankField()
                           .addField("Find Apto on Github:", "<https://github.com/Zariem/Apto>")
                           .setThumbnail("https://cdn.discordapp.com/attachments/592749834079961093/594355478599958528/fanart12.png")
    message.channel.send(embed);
}

module.exports.listCommands = listCommands;
module.exports.credits = credits;
