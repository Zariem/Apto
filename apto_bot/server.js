// Discord library
const Discord = require('discord.js');
// local config file
const config = require('./config.json');
// the upkeep file will help keep our bot running on cool free host sites like glitch.com
const upkeep = require('./upkeep.js');

// our bot client :D
const apto = new Discord.Client();

bot.on('ready', () => {
    console.log("Apto is ready!");
});

// token is in the environment file to keep it hidden
// (environment file is on glitch.com)
await bot.login(process.env.TOKEN);
console.log("Apto logged in!")
