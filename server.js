// Discord library
const Discord = require('discord.js');

// local config file
const config = require('./apto_bot/config.json');
const process = require('./process.json');
const command_handler = require('./apto_bot/util/command_handler.js');


// our bot client :D
const apto = new Discord.Client();

apto.on('ready', () => {
    let status = "PLAYING"
    let statusMessage = "type " + config.prefix + "help to get started (running locally)"

    console.log(status + ": " + statusMessage);
    apto.user.setPresence({ game: { name: statusMessage, type:status }, status: 'online' }).catch(console.error);
    command_handler.load().then(() => {
        console.log("Apto is ready!");
    });
});

apto.on('message', message => {
    // ignore messages sent by self or any other bot
    if (message.author.bot) return;
    command_handler.run(apto, message);
});

// token is in the environment file to keep it hidden
// (environment file is on glitch.com)
apto.login(process.TOKEN);
console.log("Apto logged in!");
