
const config = require('../config.json');
const serverLayout = require('./server_layout.js')

const executeCommand = async (bot, message) => {

    if (message.channel.type === "dm") {
        // handle direct message commands
        return;
    } else if (message.channel.type === "text") {

        // remove prefix, store all arguments separated by " "
        let content = message.content.slice(config.prefix.length).split(" ");
        let command = content[0];

        if (command === "ping") {
            message.channel.send("Pong!");
        }

        if (command === "test") {
            serverLayout.save(bot, message);
        }
    }

}

// make sure other files can access this function from outside
module.exports.executeCommand = executeCommand;
