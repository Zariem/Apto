
const saveServerLayout = (bot, message) => {
    let guild = message.guild;
    if (!guild) {
        message.channel.send("Error. Please send this message over a text channel on the target server.");
        return {};
    }

    console.log("Channels:")
    console.log(guild.channels)
}

module.exports.save = saveServerLayout;
