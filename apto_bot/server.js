// Discord library
const Discord = require('discord.js');
const fs = require('fs'); // file system
// local config file
const config = require('./apto_bot/config.json');
const process = require('./process.json');
// our bot client :D
const apto = new Discord.Client();
apto.commands = new Discord.Collection();

fs.readdir('./apto_bot/commands', (err, files) => {
    if (err) console.log(err);
    let jsfile = files.filter(file => file.split('.').pop() === 'js'); // get all the .js files from the folder
    if (jsfile.length <= 0) {
        console.log("Couldn't find commands.")
        return;
    }
    jsfile.forEach((file, index) => {
        let props = require(`./apto_bot/commands/${file}`);
        console.log(`${file} loaded!`);
        apto.commands.set(props.help.name, props);
    });
});

apto.on('ready', () => {
    let status = "PLAYING"
    let statusMessage = "type " + config.prefix + "help to get started (running locally)"

    console.log(status + ": " + statusMessage);
    apto.user.setPresence({ game: { name: statusMessage, type:status }, status: 'online' }).catch(console.error);
    console.log("Apto is ready!");
});

apto.on('message', message => {
    // ignore messages sent by self or any other bot
    if (message.author.bot) return;


});

// token is in the environment file to keep it hidden
// (environment file is on glitch.com)
apto.login(process.TOKEN);
console.log("Apto logged in!");
