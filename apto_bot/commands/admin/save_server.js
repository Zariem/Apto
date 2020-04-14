const Discord = require('discord.js');
const layout = require('../../util/server_layout.js')

module.exports.info = {
    name: "save",
    aliases: ['export'],
    description: "Saves a snapshot of this server, including all channels, roles, permissions.\n" +
                 "Provides a file for you with all this data. The data is not stored on the bot, " +
                 "so this file is needed to import a server layout again."
}

module.exports.run = async (bot, message, args) => {
    message.channel.send("Saving!");
    console.log(layout.getChannelData(message.channel, message.guild, {}));
}
