const config = require('../config.json')

const clone = async (bot, message, roleOrChannel) => {
    // parse the reply
    const numberRegexp = /(\d+)/g;
    let match = numberRegexp.exec(roleOrChannel); // check if the message has a number
    let value = "";
    let result = undefined; // our channel or role
    if (match) { // found a number
        value = match[1].toString(); // take the first number we found
        result = message.guild.roles.get(value);
        if (result) {
            return await clone_role(bot, message, result);
        } else { // it wasn't a role ID
            result = message.guild.channels.get(value);
            if (result) {
                return await clone_channel(bot, message, result);
            }
        }
    }
    // wasn't a channel ID either
    result = message.guild.roles.find(role => role.name.toLowerCase() === roleOrChannel.toLowerCase());
    console.log("Looking for a role of name " + roleOrChannel.toLowerCase() + ", found:")
    console.log(result)
    if (result) {
        return await clone_role(bot, message, result);
    } else {
        // testing for category channels or channels without spaces
        result = message.guild.channels.find(channel => channel.name.toLowerCase() === roleOrChannel.toLowerCase());
        console.log("Looking for a channel of name " + roleOrChannel.toLowerCase() + ", found:")
        console.log(result)
        if (result) {
            return await clone_channel(bot, message, result);
        } else {
            roleOrChannel = roleOrChannel.toLowerCase().replace(/\s+/g, '-'); // replace whitespace with dashes
            result = message.guild.channels.find(channel => channel.name.toLowerCase() === roleOrChannel);
            console.log("Looking for a channel of name " + roleOrChannel + ", found:")
            console.log(result)
            if (result) {
                return await clone_channel(bot, message, result);
            } else {
                message.channel.send("Sorry. I could not find the role or channel you were specifying.\n" +
                                     "Usage: `" + config.prefix + "clone (role mention|role name|role id|channel hashtag|channel name|channel id)`")
            }
        }
    }
}

const clone_channel = async (bot, message, channel) => {
    let channelData = {
        type: channel.type,
        position: channel.position + 1,
        parent: channel.parent,
        topic: channel.topic,
        nsfw: channel.nsfw,
        bitrate: channel.bitrate,
        userLimit: channel.userLimit,
        rateLimitPerUser: channel.rateLimitPerUser
    };
    let clone = await message.guild.createChannel(channel.name + "(new)", channelData).catch(e => {
        message.channel.send("Error on cloning channel " + channel.name + ".");
    });

    if (clone) {
        await clone.replacePermissionOverwrites(channel.permissionOverwrites).catch(e => {
            message.channel.send("Error on setting permissions for channel " + channel.name + ".");
        });
    }
    message.channel.send("Done cloning channel " + channel.name + ".");
}

const clone_role = async (bot, message, role) => {
    let roleData = {
        name: role.name + "(new)",
        color: role.hexColor,
        hoist: role.hoist,
        mentionable: role.mentionable
    };
    let clone = await message.guild.createRole(roleData).catch(e => {
        message.channel.send("Error on cloning role " + role.name + ".");
    });

    if (clone) {
        await clone.setPermissions(role.permissions).catch(e => {
            message.channel.send("Error on setting permissions for role " + role.name + ".");
        });
        await clone.setPosition(role.position + 1).catch(e => {
            message.channel.send("Error on setting position for role " + role.name + ".");
        });
    }
    message.channel.send("Done cloning role " + role.name + ".");
}

module.exports.clone = clone;
