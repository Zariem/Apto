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
        if ((!role.managed) || (role.members.get(bot.user.id))) { // don't clone integrated bot roles unless it's Apto's
            let tempID = (role.managed) ? -1 : localRoleID; // id is -1 for Apto, and the current local role id for the rest
            if (verbose) message.channel.send("- adding role: " + role.name);
            roleIDToLocalID[role.id] = tempID;
            let roleObject = {
                id: tempID, // don't store the actual role id
                name: role.name,
                hexColor: role.hexColor,
                mentionable: role.mentionable,
                permissions: role.permissions, // number / permissions bitfield
                hoist: role.hoist, // group them in sidebar? true/false
                position: role.position
            };

            // additional fields
            roleObject.isDefault = (role.id === guild.defaultRole.id);

            guildObject.roles.push(roleObject);
            if (!role.managed) localRoleID++; // only increment if it was not Apto's role
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
            let overwriteID = (isRole) ? roleIDToLocalID[overwrite.id] : overwrite.id;
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
            buildServer(bot, message, json, verbose);
        }
    };

    xhr.send();
}

const clearRoles = async (bot, message) => {
    let roles = message.guild.roles;
    for (let role of roles) {
        role = role[1];
        console.log("deleting role " + role.name);
        await role.delete().catch(e => {console.log("could not delete role " + role.name); console.log(e)});
    }
}

const buildServer = async (bot, message, guildData, verbose=false) => {
    // TODO
    // TODO: add validity check of data
    //console.log("calling buildServer")
    //await importBaseServerInfo(bot, message, guildData, verbose);
    console.log("calling importRoles")
    let resultingRoles = await importRoles(bot, message, guildData.roles, verbose);
    console.log("all roles imported")
    //let resultingChannels = await importChannels(bot, message, guildData.channels, resultingRoles, verbose)
}

// TODO: check for what data we overwrite and change
const importBaseServerInfo = async (bot, message, guildData, verbose=false) => {
    console.log("importing base server info")
    const reason = "Apto Server Layout Import";
    let guild = message.guild;
    if (!(guild.name === guildData.name)) {
        console.log("\t- setting server name")
        await guild.setName(guildData.name, reason);
    }
    if (!(guild.region === guildData.region)) {
        console.log("\t- setting server region")
        await guild.setRegion(guildData.region, reason);
    }
    if (!(guild.defaultMessageNotifications === guildData.defaultMessageNotifications)) {
        console.log("\t- setting server notifications")
        await guild.setDefaultMessageNotifications(guildData.defaultMessageNotifications, reason);
    }
    if (!(guild.explicitContentFilter == guildData.explicitContentFilter)) {
        console.log("\t- setting server content filter")
        await guild.setExplicitContentFilter(guildData.explicitContentFilter, reason);
    }
    if (!(guild.verificationLevel == guildData.verificationLevel)) {
        console.log("\t- setting server verification level")
        await guild.setVerificationLevel(guildData.verificationLevel, reason);
    }
    if (!(guild.mfaLevel == guildData.mfaLevel)) {
        console.log("\t- setting server MFA level")
        guild.mfaLevel = guildData.mfaLevel;
    }

    console.log("\t- setting server features")
    guild.features = guildData.features;

    if (guildData.afkTimeout) {
        console.log("\t- setting server afk timeout")
        await guild.setAFKTimeout(guildData.afkTimeout, reason);
    }
    // the following two can time out, therefore we only try to do them if we must
    if (guildData.iconURL && (!(guildData.iconURL === guild.iconURL))) {
        console.log("\t- setting server icon")
        await guild.setIcon(guildData.iconURL, reason);
    }
    if (guildData.splashURL && (!(guildData.splashURL === guild.splashURL))) {
        console.log("\t- setting server splash screen")
        await guild.setSplash(guildData.splashURL, reason);
    }

    // TODO: guild embed can only be imported once the channels are imported
}

// TODO: role positioning if other roles already exist
const importRoles = async (bot, message, guildRoleData, verbose=false) => {
    // guildRoleData is guildData.roles, an array of objects that describe roles
    const reason = "Apto Role Import";
    let updateMessage = await message.channel.send("Importing roles:");
    let guild = message.guild;
    let resultingRoles = {}; // map internal role ID to the role IDs of created roles
    for (let role of guildRoleData) {
        updateMessage = await updateMessage.edit(updateMessage.content + "\nTrying to add role: " + role.name + "... ");
        if (role.id == -1) {
            // don't import Apto's role data -> we don't have permissions to set them
            let aptoGuildMember = await guild.members.get(bot.user.id);
            let aptoIntegratedRole = await aptoGuildMember.roles.find(r => r.managed);
            resultingRoles[role.id] = aptoIntegratedRole.id;
        } else if (role.isDefault) {
            // merge the @everyone role with this server's @everyone role
            let everyoneRole = guild.defaultRole;
            if (everyoneRole.editable) {
                await everyoneRole.setPermissions(role.permissions);
            } else {
                await message.channel.send("Could not edit the 'everyone' role due to missing permissions.");
            }
            resultingRoles[role.id] = everyoneRole.id;
        } else {
            console.log("creating role " + role.name)
            //let discordRole = await guild.createRole(roleData, reason);
            let discordRole = await guild.createRole({
                                                      name: role.name,
                                                      color: role.hexColor,
                                                      hoist: role.hoist,
                                                      mentionable: role.mentionable
                                                     }, reason)
                                                     .catch(e => {
                                                         console.log("error on creating role!");
                                                         console.log(e);
                                                         message.channel.send("Could not create role *" + role.name + "*, please make sure I have the manage roles permission to do so and that the server did not reach the limit of 250 roles.");
                                                     });
            if (discordRole) {
                console.log("\tcreation successful!")
                resultingRoles[role.id] = discordRole.id;
                console.log("\t- setting role permissions")
                await discordRole.setPermissions(role.permissions)
                    .catch(e => {
                        console.log("error on setting permissions!");
                        console.log(e);
                        message.channel.send("Could not set __permissions__ of role *" + role.name + "*, please check these permissions yourself.");
                    });
                console.log("\t- setting role position to " + role.position)
                await discordRole.setPosition(role.position)
                    .catch(e => {
                        console.log("error on setting position!");
                        console.log(e);
                        message.channel.send("Could not set the __position__ of role *" + role.name + "*, please go to Server Settings -> Roles to ensure that the roles are in the correct order.");
                    });
                console.log("\t--- DONE")
            }
        }
        updateMessage = await updateMessage.edit(updateMessage.content + " Done!");
    }
    return resultingRoles;
}

const importChannels = async (bot, message, guildChannelData, roleIDMap=undefined, verbose=false) => {
    // guildChannelData is guildData.channels, an array of objects that describe channels
    // if roleIDMap is undefined we will not import channel permissions
    const reason = "Apto Channel Import";
    let guild = message.guild;
    let resultingChannels = {}; // a map from local channel IDs to the server's channel Snowflakes
    let channelsWithoutParent = []; // a list of all local channel's ids which have not yet assigned their parent
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
        let discordChannel = await guild.createChannel(channel.name, channelData, reason);
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
    return resultingChannels;
}


module.exports.save = saveServerLayout;
module.exports.load = loadServerLayout;
module.exports.clearRoles = clearRoles;
