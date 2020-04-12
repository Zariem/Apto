const config = require('../config.json');
const getRoleOrChannel = require('../util/get_role_or_channel.js');

const clone = async (bot, message, roleOrChannel) => {
    let result = getRoleOrChannel(message.guild, roleOrChannel);
    if (result.type === 'role') {
        return await clone_role(bot, message, result.value);
    } else if (result.type === 'channel') {
        return await clone_channel(bot, message, result.value);
    } else {
        message.channel.send("Sorry. I could not find the role or channel you were specifying.\n" +
                             "Usage: `" + config.prefix + "clone (role mention|role name|role id|channel hashtag|channel name|channel id)`")
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
    let clone = await message.guild.createChannel(channel.name + " new", channelData).catch(e => {
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
