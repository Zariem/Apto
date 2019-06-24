// Discord library
const Discord = require('discord.js');
// local config file
const config = require('./apto_bot/config.json');
// the upkeep file will help keep our bot running on cool free host sites like glitch.com
const upkeep = require('./apto_bot/upkeep.js');

// our bot client :D
const apto = new Discord.Client();

apto.on('ready', () => {
    console.log("Apto is ready!");
});

// token is in the environment file to keep it hidden
// (environment file is on glitch.com)
apto.login(process.env.TOKEN);
console.log("Apto logged in!");
