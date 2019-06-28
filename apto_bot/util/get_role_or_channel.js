
const getRoleOrChannel = (text) => {
    // parse the reply
    const numberRegexp = /(\d+)/g;
    let match = numberRegexp.exec(roleOrChannel); // check if the message has a number
    let value = "";
    let result = undefined; // our channel or role
    if (match) { // found a number
        value = match[1].toString(); // take the first number we found
        result = message.guild.roles.get(value);
        if (result) {
            return {type:"role", value:result};
        } else { // it wasn't a role ID
            result = message.guild.channels.get(value);
            if (result) {
                return {type:"channel", value:result};
            }
        }
    }
    // wasn't a channel ID either
    result = message.guild.roles.find(role => role.name.toLowerCase() === roleOrChannel.toLowerCase());
    if (result) {
        return {type:"role", value:result};
    } else {
        // testing for category channels or channels without spaces
        result = message.guild.channels.find(channel => channel.name.toLowerCase() === roleOrChannel.toLowerCase());
        if (result) {
            return {type:"channel", value:result};
        } else {
            roleOrChannel = roleOrChannel.toLowerCase().replace(/\s+/g, '-'); // replace whitespace with dashes
            result = message.guild.channels.find(channel => channel.name.toLowerCase() === roleOrChannel);
            if (result) {
                return {type:"channel", value:result};
            } else {
                return {type:"none", value:undefined};
            }
        }
    }
}

module.exports = getRoleOrChannel;
