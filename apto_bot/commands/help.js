const Discord = require('discord.js');

module.exports.info = {
    name: "help",
    aliases: ['?'],
    description: "Opens the help page."
}

module.exports.run = async (bot, message, args) => {
    message.channel.send("Help will come.");
}
