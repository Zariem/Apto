const Discord = require('discord.js');
const config = require('../config.json');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const fs = require('fs');
var uniqid = require('uniqid');

// transforms the global channel IDs or role IDs into local representations
// these are used to create relationships between channels and roles
// e.g. category channels and their child channels, or channels and role permissions
const getLocalID = (globalID, idMap) => {
    let localID = idMap[globalID]; // look up
    if (!localID) {
        localID = uniqid(); // if not found, generate
        idMap[globalID] = localID;
    }
    return localID;
}

module.exports.getChannelData = (channel, guild, idMap, notUsedForExport) => {
    let channelObject = {
        id: getLocalID(channel.id, idMap), // not yet set, will be set if we store several channels
        type: channel.type,
        name: channel.name,
        position: channel.position
    };

    // additional fields for all channels
    channelObject.isDefault = (channel.id === guild.defaultChannelID);
    if (channel.parentID) {
        channelObject.parent = notUsedForExport ? channel.parentID : getLocalID(channel.parentID, idMap);
    }
    if (guild.afkChannelID) channelObject.isAFKChannel = (channel.id === guild.afkChannelID);
    if (guild.systemChannelID) channelObject.isSystemChannel = (channel.id === guild.systemChannelID);
    // TODO: handle this outside this function
    //if (guildEmbedChannelID) channelObject.isEmbedChannel = (channel.id === guildEmbedChannelID);

    // additional fields for text channels
    if (channel.type === "text") {
        channelObject.nsfw = channel.nsfw;
        channelObject.topic = channel.topic;
        channelObject.rateLimitPerUser = channel.rateLimitPerUser;
    } else if (channel.type === "news") {
        channelObject.nsfw = channel.nsfw;
        channelObject.topic = channel.topic;
    } else if (channel.type === "store") {
        channelObject.nsfw = channel.nsfw;
    } else if (channel.type === "voice") {
        channelObject.bitrate = channel.bitrate * 1000; // because we get it in kbps but the system wants it in bps
        channelObject.userLimit = channel.userLimit;
    } else if (channel.type === "category") {
        let children = channel.children;
        channelObject.children = [];
        for (let child of children) {
            channelObject.children.push(getLocalID(child[0], idMap));
        }
    }

    // add permission overwrites
    let overwrites = channel.permissionOverwrites;
    let overwriteArray = [];
    for (let overwrite of overwrites) {
        overwrite = overwrite[1];
        let isRole =  (overwrite.type === 'role');
        let overwriteID = (notUsedForExport || !isRole) ? overwrite.id : getLocalID(overwrite.id, idMap);
        if (overwriteID) {
            let overwriteObject = {
                id: overwriteID, // userid or (local) roleid
                type: overwrite.type, // 'member' or 'role'
                allow: overwrite.allow, // bitfield of all allowed permissions
                deny: overwrite.deny // bitfield of all denied permissions
            };
            overwriteArray.push(overwriteObject);
        } else {
            if (verbose) message.channel.send("--- skipping over special permission overwrites of another bot's role in channel " + channel.name);
        }
    }
    channelObject.permissionOverwrites = overwriteArray;

    return channelObject;
}

module.exports.createChannel = async (channelData, guild, reverseIDMap) => {
    let options = channelData;
    options['reason'] = "Channel clone.";
    console.log(channelData)
    let parentID = reverseIDMap[channelData.parent];
    console.log(parentID)
    if (parentID) options['parent'] = parentID;
    let createdChannel = await guild.channels.create(channelData.name + " (copy)", options);
}
