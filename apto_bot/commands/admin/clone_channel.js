const Discord = require('discord.js');
const layout = require('../../util/server_layout.js')

module.exports.info = {
    name: "clone",
    aliases: ['duplicate'],
    description: "Clones a channel of this server."
}

module.exports.run = async (bot, message, args) => {
    message.channel.send("Cloning!");
    layout.createChannel(layout.getChannelData(message.channel, message.guild, {}, true),
                        message.guild, {});
}
