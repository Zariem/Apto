const Discord = require('discord.js');
const fs = require('fs'); // file system utility
const config = require('./config.json');

var commands = new Discord.Collection();
var aliases = new Map();

const base_dir = './apto_bot/commands/';
const require_dir = './commands/';

// load the command files from the './commands' folder
module.exports.load = async () => {
    let file_paths = await getFilePaths('');
    console.log("fs.readdir found the following files:");
    console.log(file_paths);
    for (let i = 0; i < file_paths.length; i++) {
        // load the file
        let command_file = require(`${require_dir}${file_paths[i]}`);
        console.log(`Command Handler: Loaded [${i+1}/${file_paths.length}] - '${file_paths[i]}'`);

        // create a collection that maps command name => command data
        commands.set(command_file.info.name, command_file);

        // for all aliases, add them to the alias map
        let command_aliases = command_file.info.aliases;
        if (command_aliases.length > 0) {
            for (let i = 0; i < command_aliases.length; i++) {
                aliases.set(command_aliases[i], command_file.info.name);
            }
        }
    }
    console.log("Command Handler: All commands loaded!");
}

const getFilePaths = async (dir_name) => {
    let found_files = await fs.readdirSync(base_dir + dir_name);
    let actual_files = found_files.filter(file => file.split('.').pop() === 'js');
    if (!actual_files) actual_files = [];
    let subdirectories = found_files.filter(file => fs.lstatSync(base_dir + dir_name + file).isDirectory());
    for (let i = 0; i < subdirectories.length; i++) {
        let subdirectory_files = await getFilePaths(dir_name + subdirectories[i] + '/');
        for (let j = 0; j < subdirectory_files.length; j++) {
            actual_files = actual_files.concat(subdirectories[i] + '/' + subdirectory_files[j]);
        }
    }
    return actual_files;
}

// execute a command
module.exports.run = async (bot, message) => {
    if (!message.content.startsWith(config.prefix)) return;
    let args = message.content.slice(config.prefix.length).split(" ");
    let command = args[0];

    let command_file;
    command_file = commands.get(command);
    if (!command_file) command_file = commands.get(aliases.get(command));
    if (command_file) command_file.run(bot, message, args);
}
