
const getRoleOrChannel = (guild, text) => {
    // parse the reply
    const numberRegexp = /(\d+)/g;
    let match = numberRegexp.exec(text); // check if the message has a number
    let value = "";
    let result = undefined; // our channel or role
    if (match) { // found a number
        value = match[1].toString(); // take the first number we found
        result = guild.roles.get(value);
        if (result) {
            return {type:"role", value:result};
        } else { // it wasn't a role ID
            result = guild.channels.get(value);
            if (result) {
                return {type:"channel", value:result};
            }
        }
    }
    // wasn't a channel ID either
    result = guild.roles.find(role => role.name.toLowerCase() === text.toLowerCase());
    if (result) {
        return {type:"role", value:result};
    } else {
        // testing for category channels or channels without spaces
        result = guild.channels.find(channel => channel.name.toLowerCase() === text.toLowerCase());
        if (result) {
            return {type:"channel", value:result};
        } else {
            text = text.toLowerCase().replace(/\s+/g, '-'); // replace whitespace with dashes
            result = guild.channels.find(channel => channel.name.toLowerCase() === text);
            if (result) {
                return {type:"channel", value:result};
            } else {
                return {type:"none", value:undefined};
            }
        }
    }
}

module.exports = getRoleOrChannel;
