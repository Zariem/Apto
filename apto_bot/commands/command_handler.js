
const config = require('../config.json');

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
    }

}

// make sure other files can access this function from outside
module.exports.executeCommand = executeCommand;
