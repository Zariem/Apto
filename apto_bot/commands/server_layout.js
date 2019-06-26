const Discord = require('discord.js');
const fs = require('fs');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const saveServerLayout = async (bot, message, verbose=false) => {
    let guild = message.guild;
    if (!guild) {
        message.channel.send("Error. Please send this message over a text channel on the target server.");
        return {};
    }

    if (verbose) message.channel.send("Gathering server info...");

    let guildObject = {
        name: guild.name,
        region: guild.region,

        defaultMessageNotifications: guild.defaultMessageNotifications, // ALL or MENTIONS
        embedEnabled: false,
        explicitContentFilter: guild.explicitContentFilter,
        mfaLevel: guild.mfaLevel, // NONE or ELEVATED
        verificationLevel: guild.verificationLevel, // NONE up to Verify with phone
        features: guild.features, // TODO: what exactly is that for?

        roles: [],
        channels: [],
        emojis: [],
        bans: []
    };

    // additional fields (can be null, so we omit them to use less space if they're null)
    if (guild.iconURL) guildObject.iconURL = guild.iconURL;
    if (guild.afkTimeout) guildObject.afkTimeout = guild.afkTimeout;
    if (guild.splashURL) guildObject.splashURL = guild.splashURL;

    // TODO: put this after channel export, because the channel id must be a local id.
    // get info on the guild embed (Server Widget)
    let guildEmbed = await guild.fetchEmbed();
    let guildEmbedChannelID = undefined;
    if (guildEmbed.channel) {
        guildObject.embedEnabled = true;
        if (guildEmbed.channel instanceof Discord.Guild) {
            guildEmbedChannelID = guild.defaultChannelID;
        } else if (guildEmbed.channel instanceof Discord.Channel) {
            guildEmbedChannelID = guildEmbed.channel.id;
        } else if (guildEmbed.channel instanceof Discord.Message) {
            guildEmbedChannelID = message.channel.id;
        } else {
            // found a snowflake / id
            let guildEmbedChannel = guild.channels.get(guildEmbed.channel);
            if (guildEmbedChannel) {
                guildEmbedChannelID = guildEmbedChannel.id;
            }
        }
    }

    if (verbose) message.channel.send("Gathering roles...");

    let roles = guild.roles;
    let localRoleID = 0;
    let roleIDToLocalID = {}; // look up table

    for (let role of roles) {
        role = role[1];
        if (!role.managed) { // don't clone integrated bot roles
            if (verbose) message.channel.send("- adding role: " + role.name);
            roleIDToLocalID[role.id] = localRoleID;
            let roleObject = {
                id: localRoleID, // don't store the actual role id
                name: role.name,
                hexColor: role.hexColor,
                mentionable: role.mentionable,
                permissions: role.permissions, // number / permissions bitfield
                hoist: role.hoist, // group them in sidebar? true/false
                calculatedPosition: role.calculatedPosition,
                position: role.position
            };

            // additional fields
            roleObject.isDefault = (role.id === guild.defaultRole.id);

            guildObject.roles.push(roleObject);
            localRoleID++;
        } else {
            if (verbose) message.channel.send("- did not add role " + role.name + ", since it was a bot or integrated role.");
        }
    }

    if (verbose) message.channel.send("Gathering channel infos...");

    let channels = guild.channels;
    let localChannelID = 0;
    let channelIDToLocalID = {}; // look up table

    // fill the lookup table
    for (const channel of channels) {
        channelIDToLocalID[channel[0]] = localChannelID;
        localChannelID++;
    }

    for (let channel of channels) {
        channel = channel[1];
        if (verbose) message.channel.send("- adding #" + channel.name);
        // channel type is either "text", "voice", "category"
        // if we try to clone a verified server, it might be "news" or "store"
        // "news" is a channel type readable by people that are not on the server
        // other than that it's just a text channel
        // "store" is a channel type to sell games. Both are only available to
        // verified servers e.g. of game companies.
        // TODO: upon importing these, handle special cases of "news" and "store"
        let channelObject = {
            id: channelIDToLocalID[channel.id],
            type: channel.type,
            name: channel.name,
            calculatedPosition: channel.calculatedPosition,
            position: channel.position
        };

        // additional fields for all channels
        channelObject.isDefault = (channel.id === guild.defaultChannelID);
        if (channel.parentID) channelObject.parentID = channelIDToLocalID[channel.parentID];
        if (guild.afkChannelID) channelObject.isAFKChannel = (channel.id === guild.afkChannelID);
        if (guild.systemChannelID) channelObject.isSystemChannel = (channel.id === guild.systemChannelID);
        if (guildEmbedChannelID) channelObject.isEmbedChannel = (channel.id === guildEmbedChannelID);

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
            channelObject.bitrate = channel.bitrate;
            channelObject.userLimit = channel.userLimit;
        } else if (channel.type === "category") {
            let children = channel.children;
            channelObject.children = [];
            for (let child of children) {
                channelObject.children.push(channelIDToLocalID[child[0]]);
            }
        }

        // add permission overwrites
        let overwrites = channel.permissionOverwrites;
        let overwriteArray = [];
        for (let overwrite of overwrites) {
            overwrite = overwrite[1];
            let isRole =  (overwrite.type === 'role');
            let overwriteID = (isRole) ? roleIDToLocalID(overwrite.id) : overwrite.id;
            let overwriteObject = {
                id: overwriteID, // userid or (local) roleid
                type: overwrite.type, // 'member' or 'role'
                allow: overwrite.allow, // bitfield of all allowed permissions
                deny: overwrite.deny // bitfield of all denied permissions
            };

            overwriteArray.push(overwriteObject);
        }
        channelObject.permissionOverwrites = overwriteArray;

        guildObject.channels.push(channelObject);
    }

    if (verbose) message.channel.send("Gathering emoji infos...");

    let emojis = guild.emojis;
    for (let emoji of emojis) {
        emoji = emoji[1];
        if (emoji.managed) {
            if (verbose) message.channel.send("- skipping emoji: " + emoji.name + " as it is managed by an external service.");
        } else {
            if (verbose) message.channel.send("- adding emoji: " + emoji.name);
            let emojiObject = {
                animated: emoji.animated,
                name: emoji.name,
                url: emoji.url
            };

            let emojiRoles = emoji.roles; // all roles for which an emoji is active, empty if all
            let emojiRolesArray = [];
            for (let emojiRole of emojiRoles) {
                emojiRolesArray.push(roleIDToLocalID[emojiRole[0]]);
            }
            emojiObject.roles = emojiRolesArray;
            guildObject.emojis.push(emojiObject);
        }
    }

    if (verbose) message.channel.send("Gathering info on bans...");

    let bans = await guild.fetchBans(true);
    for (let ban of bans) {
        ban = ban[1];
        let banObject = {
            userID: ban.user.id,
            username: ban.user.username,
            discriminator: ban.user.discriminator,
            isBot: ban.user.bot,
            reason: ban.reason
        };
        guildObject.bans.push(banObject);
    }

    if (verbose) message.channel.send("Done!");
    var guildData = JSON.stringify(guildObject);
    let filename = 'server_' + guild.id + '.json';
    await fs.writeFile(filename, guildData, (error) => console.log("Error on fs.writefile: " + error));
    message.channel.send("There you go!", {files:[filename]});
}

const loadServerLayout = async (bot, message, url, verbose=false) => {
    // load a .json file from an url
    if (!(url.substr(url.length - 5) === ".json")) {
        message.channel.send("Please provide an URL to a .json file.")
    }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);

    xhr.onreadystatechange = function () {
        console.log("readyState = " + this.readyState + ", status = " + this.status);
        if (this.readyState == 4 && this.status == 200) {
            var result = this.responseText;
            console.log("xhr ------- log")
            console.log(result);
            let json = JSON.parse(result);
            console.log(json);
            buildServer(bot, message, json, verbose);
        }
    };

    xhr.send();
}

const buildServer = async (bot, message, json, verbose=false) => {
    // TODO
    // TODO: add validity check of data
}

// TODO: check for what data we overwrite and change
const importBaseServerInfo = async (bot, message, guildData, verbose=false) => {
    const reason = "Apto Server Layout Import";
    let guild = message.guild;
    await guild.setName(guildData.name, reason);
    await guild.setRegion(guildData.region, reason);
    await guild.setDefaultMessageNotifications(guildData.defaultMessageNotifications, reason);
    await guild.setExplicitContentFilter(guildData.explicitContentFilter, reason);
    await guild.setVerificationLevel(guildData.verificationLevel, reason);
    guild.mfaLevel = guildData.mfaLevel;
    guild.features = guildData.features;

    if (guildData.iconURL) await guild.setIcon(guildData.iconURL, reason);
    if (guildData.afkTimeout) await guild.setAFKTimeout(guildData.afkTimeout, reason);
    if (guildData.splashURL) await guild.setSplash(guildData.splashURL, reason);

    // TODO: guild embed can only be imported once the channels are imported
}

// TODO: ensure merging of roles, especially the @everyone role
// TODO: role positioning if other roles already exist
const importRoles = async (bot, nessage, guildRoleData, verbose=false) => {
    // guildRoleData is guildData.roles, an array of objects that describe roles
    const reason = "Apto Role Import";
    let guild = message.guild;
    resultingRoles = {}; // map internal role ID to the role IDs of created roles
    for (let role of guildRoleData) {
        discordRole = await guild.createRole({
                                        name: role.name,
                                        color: role.hexColor,
                                        hoist: role.hoist,
                                        position: role.position,
                                        permissions: role.permissions,
                                        mentionable: role.mentionable
                                    }, reason);
        // TODO: set default role
        resultingRoles[role.id] = discordRole.id;
    }
    return resultingRoles;
}

const importChannels = async (bot, message, guildChannelData, roleIDMap=undefined, verbose=false) => {
    // guildChannelData is guildData.channels, an array of objects that describe channels
    // if roleIDMap is undefined we will not import channel permissions
    const reason = "Apto Channel Import";
    let guild = message.guild;
    resultingChannels = {}; // a map from local channel IDs to the server's channel Snowflakes
    channelsWithoutParent = []; // a list of all local channel's ids which have not yet assigned their parent
    for (let channel of guildChannelData) {

        let channelData = {
            type: channel.type,
            position: channel.position,
        }
        if (!(channel.topic == undefined)) channelData.topic = channel.topic;
        if (!(channel.nsfw == undefined)) channelData.nsfw = channel.nsfw;
        if (!(channel.bitrate == undefined)) channelData.bitrate = channel.bitrate;
        if (!(channel.userLimit == undefined)) channelData.userLimit = channel.userLimit;
        if (!(channel.rateLimitPerUser == undefined)) channelData.rateLimitPerUser = channel.rateLimitPerUser;
        if (!(channel.parentID == undefined)) {
            if (resultingChannels[channel.parentID]) {
                // parent channel has already been created (should normally be the case)
                channelData.parent = resultingChannels[channel.parentID];
            } else {
                channelsWithoutParent.push(channel.id);
            }
        }
        // add permission overwrites
        // if roleIDMap is not specified, don't add role permissions
        // in any case, add user permissions (TODO: check if it works even if these users are not (yet) on that server)
        let permissions = [];
        for (let overwrite of channel.permissionOverwrites) {
            let key = undefined;
            if (overwrite.type === 'member') {
                key = overwrite.id;
                let member = guild.members.get(key);
                if (!member) {
                    message.channel.send("Could not add permission overwrites for a user in channel " +
                                         channel.name + " because this user is not in this server.");
                    key = undefined;
                }
            } else if (roleIDMap) {
                key = roleIDMap[overwrite.id];
            }
            if (key) {
                let overwriteValues = {
                    id: key,
                    allow: overwrite.allow,
                    deny: overwrite.deny
                };
                permissions.push(overwriteValues);
            }
        }
        channelData.permissionOverwrites = permissions;

        // TODO: does this work as intended?
        discordChannel = await guild.createChannel(channel.name, channelData, reason);
        resultingChannels[channel.id] = discordChannel.id;
    }

    if (channelsWithoutParent.length > 0) {
        for (let channel of guildChannelData) {
            if (channelsWithoutParent.includes(channel.id)) {
                let discordChannel = await bot.channels.get(resultingChannels[channel.id]);
                discordChannel.setParent(resultingChannels[channel.parentID]);
            }
        }
    }
}


module.exports.save = saveServerLayout;
module.exports.load = loadServerLayout;
