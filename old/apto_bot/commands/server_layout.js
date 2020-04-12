const Discord = require('discord.js');
const fs = require('fs');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const config = require('../config.json');

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
            channelObject.bitrate = channel.bitrate * 1000; // because we get it in kbps but the system wants it in bps
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

const embedBaseColor = 0x84c3e0;

const initImport = async (bot, message, url) => {
    let embed = new Discord.RichEmbed()
                           .setTitle("Importing Server Data")
                           .setColor(embedBaseColor)
                           .setDescription("Attempting to open the linked .json file...")
    let sentMessage = await message.channel.send(embed)
    loadServerLayout(bot, message, url, embed, sentMessage);
}

const loadServerLayout = async (bot, message, url, embed, sentMessage) => {
    // load a .json file from an url
    if (!url || !(url.substr(url.length - 5) === ".json")) {
        embed.setDescription(embed.description + "\n\n⚠️No .json file found to open!⚠️\n" +
                             "*Please ensure that you provide a link to a valid server.json file that I created upon exporting a server.*\n\n" +
                             "Usage: `" + config.prefix + "importServer https://url-to.your/server.json`\n*(This link is just an example)*\n" +
                             "For more info and templates, check out `" + config.prefix + "importServer help`")
             .addField("💡Tip:💡", "You can right-click the server file that I sent you upon exporting, and then click `Copy Link` to quickly get access to the link. " +
                                 "If you uploaded your own server.json file, you can also right click it and select `Copy Link` to get the link to the file.\n" +
                                 "Discord stores all uploaded files internally, it's quite useful.")
        await sentMessage.edit(embed);
        return;
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
            buildServer(bot, message, json, embed, sentMessage);
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

const clearChannels = async (bot, message) => {
    let channels = message.guild.channels;
    for (let channel of channels) {
        channel = channel[1];
        if (!(channel.id === message.channel.id)) {
            console.log("deleting channel " + channel.name);
            await channel.delete().catch(e => {console.log("could not delete channel " + channel.name); console.log(e)});
        }
    }
}

const getRoleListOfThisServer = (bot, message) => {
    let roles = message.guild.roles;
    let roleList = [];
    for (let role of roles) {
        role = role[1];
        if (!role.managed && !(role.id === message.guild.defaultRole.id)) { // ignore integrated bot roles and @everyone
            roleList.push("<@&" + role.id + ">"); // works even if role not mentionable, and in embeds it does not ping
        }
    }
    return roleList;
}

const getRoleListOfImport = (guildData) => {
    let roles = guildData.roles;
    let roleList = [];
    for (let role of roles) {
        if (role.id > 0) { // ignore Apto's role and @everyone
          let roleName = role.name;
            if (roleName.length > 24) {
                roleName = roleName.substring(0,21) + "...";
            }
            roleList.push(roleName);
        }
    }
    return roleList;
}

const rolesToText = (roleNames, max) => {
    let rolesText = "";
    let numRoles = roleNames.length;
    if (numRoles > 0) {
        let additionalText = "";
        let cutoff = numRoles;
        if (numRoles > max) {
            cutoff = max;
            additionalText += "\nand " + (numRoles - cutoff) + " more.";
        }
        for (let i = 0; i < cutoff; i++) {
            if (i > 0) rolesText += "\n";
            rolesText += roleNames[i];
        }
        rolesText += additionalText;
    } else {
        rolesText = "*none*";
    }
    return rolesText;
}

const comparison = (a, b) => {
    if (a.position > b.position) return 1;
    else if (a.position < b.position) return -1;
    else return 0;
}

const getChannelListOfImport = (guildData) => {
    let channels = guildData.channels;
    let channelCategories = [{id:-1, name:"(Channels Outside Categories)", children:[]}];
    let numChannels = channels.length;

    for (let i = 0; i < numChannels; i++) {
        let channel = channels[i];
        if (channel.type === "category") {
            channelCategories.push({id:channel.id, name:channel.name, arrayIndex:i, position:channel.position, children:[]});
        }
    }

    for (let i = 0; i < numChannels; i++) {
        let channel = channels[i];
        if (!(channel.type === "category")) {
            for (let category of channelCategories) {
                if (category.id == channel.parentID) category.children.push({name:channel.name, position:channel.position, arrayIndex:i, isDefault:channel.isSystemChannel});
            }
        }
    }

    for (let category of channelCategories) {
        category.children.sort(comparison);
    }
    channelCategories.sort(comparison);
    return channelCategories;
}

const getChannelCategoryChildrenText = (categoryChildren) => {
    let text = "";
    for (let channel of categoryChildren) {
        if (channel.isDefault) text += "__#" + channel.name + "__\n";
        else text += "#" + channel.name + "\n";
    }
    return text;
}

const channelListToEmbedText = async (channelList, embed, sentMessage) => {
    embed.fields = [];
    for (let category of channelList) {
        let text = getChannelCategoryChildrenText(category.children);
        if (category.id == -1) {
            embed.setDescription(embed.description + "\n\n" + text);
        } else {
            embed.addField(category.name, text, false);
        }
    }
    embed.setFooter("The underlined channel is the default/system channel where welcome messages get posted.")
    await sentMessage.edit(embed);
}

const waitToContinue = async (bot, message, embed, sentMessage) => {
    await sentMessage.clearReactions();
    embed.addField("To continue, press:", "✅");
    await sentMessage.edit(embed);
    await sentMessage.react("✅");
    await sentMessage.awaitReactions((reaction, user) => (user.id === message.author.id) && (reaction.emoji.name === "✅"), {max: 1, time: 300000});
    await sentMessage.clearReactions();
    embed.fields = [];
    await sentMessage.edit(embed);
}

const buildServer = async (bot, message, guildData, embed, sentMessage) => {
    console.log(guildData);
    embed.setDescription(embed.description + "\nSuccess!\n\nChecking if the file is valid...");
    await sentMessage.edit(embed);
    let isValid = checkDataValidity(guildData);
    if (!isValid) {
        embed.setDescription(embed.description + "\n\n😱 Oh no! Looks like something went wrong with the file! I am sorry, I cannot parse it. 😓");
        await sentMessage.edit(embed);
        return;
    }
    embed.setDescription(embed.description + "\n\n👍 All in order!");

    await waitToContinue(bot, message, embed, sentMessage);

    embed.setDescription("Importing the main server data!");
    await sentMessage.edit(embed);
    console.log("calling buildServer")
    await importBaseServerInfo(bot, message, guildData, embed, sentMessage);

    await waitToContinue(bot, message, embed, sentMessage);

    embed.setDescription("Importing roles!");
    embed.fields = [];
    let existingRoles = getRoleListOfThisServer(bot, message);
    let existingRolesText = rolesToText(existingRoles, 40);
    embed.addField("Current Roles:", existingRolesText, true);
    let importingRoles = getRoleListOfImport(guildData);
    let importingRolesText = rolesToText(importingRoles, 40);
    embed.addField("Roles to Import:", importingRolesText, true);

    await sentMessage.react(additive_import_emoji);
    await sentMessage.react(selective_import_emoji);
    await sentMessage.react(overwriting_import_emoji);

    let importType = await awaitImportTypeSelection(bot, message, "Choose an Import Mode",
                                                     "Additive: Keep existing roles and add the new roles.",
                                                     "Specify: For each role, select whether to edit another role or just add it.",
                                                     "Overwrite: Delete all current roles and import the new ones.", embed, sentMessage, "", false);

    let selectForEachRole = false;
    if (importType === 'select') {
        selectForEachRole = true;
    } else if (importType === 'overwrite') {
        console.log("clearing roles")
        await clearRoles(bot, message);
    }
    console.log("calling importRoles")
    let resultingRoles = await importRoles(bot, message, guildData.roles, embed, sentMessage, selectForEachRole);

    await waitToContinue(bot, message, embed, sentMessage);

    // TODO: add handling if server templates are too large to fit a single embed!
    embed.setDescription("Importing channels! WORK IN PROGRESS (selective/merging input is still buggy.)");

    await sentMessage.react(additive_import_emoji);
    await sentMessage.react(selective_import_emoji);
    await sentMessage.react(overwriting_import_emoji);

    let channelList = getChannelListOfImport(guildData);
    await channelListToEmbedText(channelList, embed, sentMessage);
    importType = await awaitImportTypeSelection(bot, message, "Choose an Import Mode",
                                                    "Additive: Keep existing channels and add the new ones.",
                                                    "Specify: For each channel, select whether to edit another channel or just add it.",
                                                    "Overwrite: Delete all current channels (except for the one we are in) and import the new ones.",
                                                    embed, sentMessage, "- Be aware that deleting the channels will result in loss of their contents.\n" +
                                                    "- If you did not import all roles, channels might not work out the way they were intended to.", false)
    let selectForEachChannel = false;
    if (importType === 'select') {
        selectForEachChannel = true;
    } else if (importType === 'overwrite') {
        console.log("clearing channels")
        await clearChannels(bot, message);
    }
    console.log("calling importChannels")
    let resultingChannels = await importChannels(bot, message, guildData.channels, channelList, resultingRoles, embed, sentMessage, selectForEachChannel);

    await waitToContinue(bot, message, embed, sentMessage);

    embed.setDescription("Importing emojis!");

    await sentMessage.clearReactions();
    await sentMessage.react(import_emoji);
    await sentMessage.react(keep_emoji);

    let importing = await awaitKeepVsImport(bot, message, "Server Emojis:",
                                             "Import the other server's emojis (if any). (Additive Import!)",
                                             "Do not import emojis.", embed, sentMessage,
                                             "*Note: Bots cannot delete emojis, so if you add them every time you test a thing, you'll have many duplicates of the same emoji in there.*");
    if (importing) {
        console.log("calling importEmojis")
        await importEmojis(bot, message, guildData.emojis, resultingRoles);
    }

    await waitToContinue(bot, message, embed, sentMessage);

    embed.setDescription("Importing bans!");
    await sentMessage.react(import_emoji);
    await sentMessage.react(keep_emoji);

    importing = await awaitKeepVsImport(bot, message, "Ban Data:",
                                             "Import the other server's ban list?",
                                             "Do not import the other server's ban list.", embed, sentMessage,
                                             "*Note: Basically only useful if you wish to copy and/or backup your own servers.*");
    if (importing) {
        console.log("importing bans")
        await importBans(bot, message, guildData.bans);
    }

    message.channel.send("All done!");
}

const hasKeys = (obj, keys) => {
    // keys is an array of strings
    for (let key of keys) {
        if (obj[key] == undefined) {
            console.log("Object invalid, could not find key: " + key);
            return false;
        }
    }
    return true;
}

const checkDataValidity = (guildData) => {
    // check validity of base info
    let result = hasKeys(guildData, ["name", "region", "defaultMessageNotifications", "explicitContentFilter", "verificationLevel",
                                     "features", "roles", "channels", "emojis", "bans"]);
    if (!result) {
        console.log("Invalid file. Guild base data corrupt.");
        return result;
    }
    let numRoles = guildData.roles.length;
    let numChannels = guildData.channels.length;
    let numEmojis = guildData.emojis.length;
    let numBans = guildData.bans.length;

    // check validity of role info
    for (let role of guildData.roles) {
        result = result && hasKeys(role, ["id", "name", "hexColor", "mentionable", "permissions", "hoist", "position"]);
    }
    if (!result) {
        console.log("Invalid file. Role data corrupt.");
        return result;
    }

    // check validity of channel info
    for (let channel of guildData.channels) {
        result = result && hasKeys(channel, ["id", "type", "name", "position", "isDefault"]);
    }
    if (!result) {
        console.log("Invalid file. Channel data corrupt.");
        return result;
    }

    // check validity of emoji info
    for (let emoji of guildData.emojis) {
        result = result && hasKeys(emoji, ["animated", "name", "url", "roles"]);
    }
    if (!result) {
        console.log("Invalid file. Emoji data corrupt.");
        return result;
    }

    // check validity of ban info
    for (let ban of guildData.bans) {
        result = result && hasKeys(ban, ["userID", "username", "discriminator", "isBot", "reason"]);
    }
    if (!result) {
        console.log("Invalid file. Ban data corrupt.");
        return result;
    }
    return result;
}

const import_emoji = "⬇";
const keep_emoji = "⛔"
const additive_import_emoji = "✳";
const overwriting_import_emoji = "⚠";
const selective_import_emoji = "↔";

// returns true if we want to import, false if we keep
const awaitKeepVsImport = async (bot, message, title, import_text, keep_text, embed, sentMessage, additional_text = "", clearFields = true) => {
    let importing = false;
    if (clearFields) embed.fields = [];
    let text = import_emoji + ": " + import_text + "\n" + keep_emoji + ": " + keep_text;
    if (!(additional_text === "")) text += "\n\n" + additional_text;
    embed.addField(title, text);
    await sentMessage.edit(embed);
    const collectedReaction = await sentMessage.awaitReactions((reaction, user) =>
                                                                (user.id === message.author.id) &&
                                                                (reaction.emoji.name === import_emoji || reaction.emoji.name === keep_emoji),
                                                            {max: 1, time: 300000});
    let reaction = collectedReaction.first();
    if (reaction.emoji.name === import_emoji) {
        importing = true;
    }
    await reaction.remove(message.author.id);
    return importing;
}

// returns 'add', 'select' or 'overwrite' depending on which mode we selected
const awaitImportTypeSelection = async (bot, message, title, additive_text, specify_text, overwrite_text, embed, sentMessage, additional_text = "", clearFields = true) => {
    let import_type = 'add';
    if (clearFields) embed.fields = [];
    let text = additive_import_emoji + ": " + additive_text + "\n" + selective_import_emoji + ": " + specify_text + "\n" + overwriting_import_emoji + ": " + overwrite_text;
    if (!(additional_text === "")) text += "\n\n" + additional_text;
    embed.addField(title, text);
    await sentMessage.edit(embed);
    const collectedReaction = await sentMessage.awaitReactions((reaction, user) =>
                                                                (user.id === message.author.id) &&
                                                                (reaction.emoji.name === additive_import_emoji ||
                                                                 reaction.emoji.name === selective_import_emoji ||
                                                                 reaction.emoji.name === overwriting_import_emoji),
                                                            {max: 1, time: 300000});
    let reaction = collectedReaction.first();
    if (reaction.emoji.name === selective_import_emoji) {
        import_type = 'select';
    } else if (reaction.emoji.name === overwriting_import_emoji) {
        import_type = 'overwrite';
    }
    await reaction.remove(message.author.id);
    return import_type;
}

const awaitRoleOrChannelSelection = async (bot, message, isRoleSelection=true, retrying=false, isCategoryChannel=false, isVoiceChannel=false, selectingParent=false) => {
    let embed2 = new Discord.RichEmbed()
    if (isRoleSelection) {
        // TODO: add pages if more than 40 roles
        let existingRoles = getRoleListOfThisServer(bot, message);
        let existingRolesText = rolesToText(existingRoles, 40);
        if (retrying) {
            embed2.setDescription("⚠️ Could not find the specified role, please retry! ⚠️");
        }
        embed2.addField("Please select a role which to overwrite by typing its name, linking the role, or posting the role's ID:", existingRolesText)
    } else {
        let label = (isCategoryChannel) ? "category" : "channel";
        label = (isVoiceChannel) ? "voice channel" : label;
        if (retrying) embed2.setDescription("⚠️ Could not find the specified " + label + ", please retry! ⚠️");
        let addOn = (selectingParent) ? "" : " which to overwrite";
        let embedText = "Please select a " + label + addOn + " by typing its name, linking the " + label + ", or posting the " + label + "'s ID:"
        embed2.addField(embedText, "*(look at your channels for a selection)*")
    }
    let footerText = "Type 'exit' or 'cancel' to quit this menu and ";
    footerText += (selectingParent) ? "leave the channels unassigned to any section." : "simply add it. (Additive Import).";
    embed2.setFooter(footerText);
    let sentMessage2 = await message.channel.send(embed2);
    let reply = await message.channel.awaitMessages((response) => (response.author.id === message.author.id), {max: 1, time: 300000});
    reply = reply.first();
    let repliedMessage = reply.content.toLowerCase();
    reply.delete(100);

    if (repliedMessage === 'exit' || repliedMessage === 'cancel') {
        return undefined;
    }

    // parse the reply
    const numberRegexp = /(\d+)/g;
    let match = numberRegexp.exec(repliedMessage); // check if the message has a number
    let value = "";
    let result = undefined; // our channel or role
    if (match) { // found a number
        value = match[1].toString(); // take the first number we found
        if (isRoleSelection) {
            result = message.guild.roles.get(value);
        } else {
            result = message.guild.channels.get(value);
        }
    }
    if (!result) {
        // found no valid role or channel id
        if (isRoleSelection) {
            result = message.guild.roles.find(role => role.name.toLowerCase() === repliedMessage);
            console.log("Looking for a role of name " + repliedMessage + ", found:")
            console.log(result)
        } else {
            if (!isCategoryChannel) repliedMessage = repliedMessage.replace(/\s+/g, '-'); // replace whitespace with dashes
            result = message.guild.channels.find(channel => channel.name.toLowerCase() === repliedMessage);
            console.log("Looking for a channel of name " + repliedMessage + ", found:")
            console.log(result)
            if (result) {
                if (!(isCategoryChannel == (result.type === 'category'))) { // types don't match!
                    result = undefined; // retry
                }
                if (!(isVoiceChannel == (result.type === 'voice'))) {
                    result = undefined; // retry
                }
            }
        }
    }
    await sentMessage2.delete();
    if (!result) {
        // still nothing found
        return await awaitRoleOrChannelSelection(bot, message, isRoleSelection, true);
    }
    return result;
}

const importBaseServerInfo = async (bot, message, guildData, embed, sentMessage) => {
    console.log("importing base server info")
    const reason = "Apto Server Layout Import - WORK IN PROGRESS";
    let guild = message.guild;
    embed.setDescription(embed.description + "\n\n*Please react to this message to decide whether to import or not import the following:*")
    await sentMessage.react(import_emoji);
    await sentMessage.react(keep_emoji);

    if (!(guild.name === guildData.name)) {
        let importing = await awaitKeepVsImport(bot, message, "Server Name:",
                                                 "Import new name: ***" + guildData.name + "***",
                                                 "Keep old name: ***" + guild.name + "***", embed, sentMessage);
        if (importing) {
            console.log("\t- setting server name")
            await guild.setName(guildData.name, reason);
        }
    }
    if (!(guild.region === guildData.region)) {
        let importing = await awaitKeepVsImport(bot, message, "Server Region:",
                                                 "Switch server region to: ***" + guildData.region + "***",
                                                 "Stay in this server's region: ***" + guild.region + "***", embed, sentMessage,
                                                 "*Concerning the voice channels.*");
        if (importing) {
            console.log("\t- setting server region")
            await guild.setRegion(guildData.region, reason);
        }
    }
    if (!(guild.defaultMessageNotifications === guildData.defaultMessageNotifications)) {
        let importing = await awaitKeepVsImport(bot, message, "Default Message Notifications:",
                                                 "Import: ***" + guildData.defaultMessageNotifications + "***",
                                                 "Keep: ***" + guild.defaultMessageNotifications + "***", embed, sentMessage,
                                                 "*ALL = all messages will notify users\nMENTIONS = only @mentions will ping users*");
        if (importing) {
            console.log("\t- setting server notifications")
            await guild.setDefaultMessageNotifications(guildData.defaultMessageNotifications, reason);
        }
    }
    if (!(guild.explicitContentFilter == guildData.explicitContentFilter)) {
        let importing = await awaitKeepVsImport(bot, message, "Explicit Content Filter:",
                                                 "Import: ***" + guildData.explicitContentFilter + "***",
                                                 "Keep: ***" + guild.explicitContentFilter + "***", embed, sentMessage,
                                                 "*Will scan all messages of a given user group and automatically delete those with explicit content;" +
                                                 "\nDISABLED = don't scan any\nMEMBERS_WITHOUT_ROLES = only filter messages from members without roles\nALL = scan all messages*");
        if (importing) {
            console.log("\t- setting server content filter")
            await guild.setExplicitContentFilter(guildData.explicitContentFilter, reason);
        }
    }
    if (!(guild.verificationLevel == guildData.verificationLevel)) {
        let importing = await awaitKeepVsImport(bot, message, "Verification Level:",
                                                 "Import: ***" + guildData.verificationLevel + "***",
                                                 "Keep: ***" + guild.verificationLevel + "***", embed, sentMessage,
                                                 "*Members must meet the following criteria before they can send messages to other server members " +
                                                 "or in text channels. Does not apply if these members have an assigned role." +
                                                 "\NONE = unrestricted\LOW = must have a verified email\MEDIUM = verified email and on Discord for longer than 5 minutes" +
                                                 "\nHIGH = verified email and on this Server for longer than 10 minutes\nVERY HIGH = must have a verified phone*");
        if (importing) {
            console.log("\t- setting server verification level")
            await guild.setVerificationLevel(guildData.verificationLevel, reason);
        }
    }

    console.log("\t- setting server features")
    guild.features = guildData.features;

    if (guildData.afkTimeout && (!(guildData.afkTimeout === guild.afkTimeout))) {
        let importing = await awaitKeepVsImport(bot, message, "AFK Timeout (in minutes):",
                                                 "Import: ***" + (guildData.afkTimeout / 60) + " mins***",
                                                 "Keep: ***" + (guild.afkTimeout / 60) + " mins***", embed, sentMessage,
                                                 "*After how many minutes a user gets kicked from voice chat into an AFK channel, if one is specified.*");
        if (importing) {
            console.log("\t- setting server afk timeout")
            await guild.setAFKTimeout(guildData.afkTimeout, reason);
        }
    }
    // the following two can time out, therefore we only try to do them if we must
    if (guildData.iconURL && (!(guildData.iconURL === guild.iconURL))) {
        embed.setThumbnail(guildData.iconURL);
        let importing = await awaitKeepVsImport(bot, message, "Server Icon:",
                                                 "Import: ***" + guildData.iconURL + "***",
                                                 "Keep current icon.", embed, sentMessage,
                                                 "*Note: if you and me change the icon too often, we get a timer on it. If I get stuck here, that's why.*");
        embed.setThumbnail(undefined);
        await sentMessage.edit(embed);
        if (importing) {
            console.log("\t- setting server icon")
            await guild.setIcon(guildData.iconURL, reason);
        }
    }
    if (guildData.splashURL && (!(guildData.splashURL === guild.splashURL))) {
        embed.setThumbnail(guildData.splashURL);
        let importing = await awaitKeepVsImport(bot, message, "Server Splash Screen:",
                                                 "Import: ***" + guildData.splashURL + "***",
                                                 "Keep current splash screen.", embed, sentMessage,
                                                 "*Note: Splash screens only show for Nitro boosted servers on Nitro level 1.\nThey are the background of your custom server invite link.*");
        if (importing) {
            console.log("\t- setting server splash screen")
            await guild.setSplash(guildData.splashURL, reason);
        }
    }
}

// TODO: role positioning if other roles already exist
const importRoles = async (bot, message, guildRoleData, embed, sentMessage, selectImportType=false) => {
    // guildRoleData is guildData.roles, an array of objects that describe roles
    const reason = "Apto Role Import";
    let guild = message.guild;
    let resultingRoles = {}; // map internal role ID to the role IDs of created roles
    for (let role of guildRoleData) {

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
            let actionDone = "";
            let extraNotif = "";
            let importType = 'add';
            let roleToOverwrite = undefined;
            if (selectImportType) {
                embed.setColor(role.hexColor);
                importType = await awaitImportTypeSelection(bot, message, "Choose how to add role:\n\t**" + role.name + "**\n** **",
                                                                "Additive: Simply add the role.",
                                                                "Edit: Choose an existing role to edit.",
                                                                "Ignore: Do not add this role, but **be aware that some functionality might get lost**. *(Not advised)*",
                                                                embed, sentMessage, "", true);
                if (importType === 'select') {
                    roleToOverwrite = await awaitRoleOrChannelSelection(bot, message, true, false);
                }
            }
            if (!(importType === 'overwrite')) { // bad naming there, but in our case 'overwrite' would mean "do not add this role"
                let roleData = {
                                name: role.name,
                                color: role.hexColor,
                                hoist: role.hoist,
                                mentionable: role.mentionable
                               }
                let discordRole;
                if (roleToOverwrite) {
                    let oldRoleName = roleToOverwrite.name;
                    console.log("editing role " + oldRoleName + " with data of imported role " + role.name);
                    actionDone = "\n✅Sucessfully overwritten role *" + oldRoleName + "* with imported role *" + role.name + "*";
                    discordRole = await roleToOverwrite.edit(roleData, reason).catch(e => {
                        console.log("error on editing role! switching to additive import!");
                        console.log(e);
                        extraNotif = "⚠️Could not edit role *" + oldRoleName + "*, please make sure I have the permission to do so. Using additive import instead.";
                    })
                }
                if (!discordRole) {
                    console.log("creating role " + role.name)
                    actionDone = "\n✅Sucessfully created role *" + role.name + "*";
                    //let discordRole = await guild.createRole(roleData, reason);
                    discordRole = await guild.createRole(roleData, reason)
                                                             .catch(e => {
                                                                 console.log("error on creating role!");
                                                                 console.log(e);
                                                                 actionDone = "\n⚠️Failed to create role *" + role.name + "*. Issue: Role limit (250) reached or missing permissions.";
                                                              });
                }
                if (discordRole) {
                    console.log("\tcreation/edit successful!")
                    resultingRoles[role.id] = discordRole.id;
                    console.log("\t- setting role permissions")
                    await discordRole.setPermissions(role.permissions)
                        .catch(e => {
                            console.log("error on setting permissions!");
                            console.log(e);
                            actionDone = "\n⚠️Created role *" + role.name + "* but could not set role permissions. Please check these permissions yourself.";
                        });
                    console.log("\t- setting role position to " + role.position)
                    await discordRole.setPosition(role.position)
                        .catch(e => {
                            console.log("error on setting position!");
                            console.log(e);
                            actionDone = "\n⚠️Created role *" + role.name + "* but could not set role position. Please go to Server Settings -> Roles to ensure that the roles are in the correct order.";
                        });
                    console.log("\t--- DONE")
                }
            } else {
                actionDone = "\n❌Skipped the import of role *" + role.name + "*";
            }
            if (embed.description.length > 1900) {
                // TODO: log all!
                embed.setDescription("Importing Roles!")
            }
            embed.setColor(embedBaseColor);
            embed.setDescription(embed.description + actionDone);
            await sentMessage.edit(embed);
        }
    }
    return resultingRoles;
}

const buildChannelData = (bot, message, channelInfo, roleIDMap, resultingChannels, channelsWithoutParent) => {
    let channelData = {
        type: channelInfo.type,
        position: channelInfo.position,
    }
    if (!(channelInfo.topic == undefined)) channelData.topic = channelInfo.topic;
    if (!(channelInfo.nsfw == undefined)) channelData.nsfw = channelInfo.nsfw;
    if (!(channelInfo.bitrate == undefined)) channelData.bitrate = channelInfo.bitrate;
    if (!(channelInfo.userLimit == undefined)) channelData.userLimit = channelInfo.userLimit;
    if (!(channelInfo.rateLimitPerUser == undefined)) channelData.rateLimitPerUser = channelInfo.rateLimitPerUser;
    if (!(channelInfo.parentID == undefined)) {
        if (resultingChannels[channelInfo.parentID]) {
            // parent channel has already been created (should normally be the case)
            channelData.parent = resultingChannels[channelInfo.parentID];
        } else {
            channelsWithoutParent.push(channelInfo.id);
        }
    }
    // add permission overwrites
    // if roleIDMap is not specified, don't add role permissions
    // in any case, add user permissions (TODO: check if it works even if these users are not (yet) on that server)
    let permissions = [];
    for (let overwrite of channelInfo.permissionOverwrites) {
        let key = undefined;
        if (overwrite.type === 'member') {
            key = overwrite.id;
            let member = message.guild.members.get(key);
            if (!member) {
                message.channel.send("Could not add permission overwrites for a user in channel " +
                                     channelInfo.name + " because this user is not in this server.");
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
    return channelData;
}

const importChannels = async (bot, message, guildChannelData, channelList, roleIDMap, embed, sentMessage, selectImportType=false) => {
    // guildChannelData is guildData.channels, an array of objects that describe channels
    // channelList lists all channels in the right order
    // if roleIDMap is undefined we will not import channel permissions
    const reason = "Apto Channel Import";
    let guild = message.guild;
    let resultingChannels = {}; // a map from local channel IDs to the server's channel Snowflakes
    let channelsWithoutParent = []; // a list of all local channel's ids which have not yet assigned their parent

    for (let section of channelList) {
        if (section.id != -1) { // skip section-less channels for now

            let categoryChannel = guildChannelData[section.arrayIndex];
            let importType = 'add'
            if (selectImportType) {
                let topicText = (categoryChannel.topic == undefined) ? "" : categoryChannel.topic;
                //let typeName = (categoryChannel)
                embed.fields = [];
                embed.addField(categoryChannel.name, getChannelCategoryChildrenText(categoryChannel.children), false);
                importType = await awaitImportTypeSelection(bot, message, "Choose how to add category:\n\t**" + categoryChannel.name + "**\n** **",
                                                                    "Additive: Simply add it.",
                                                                    "Merge: Choose an existing category to merge this one with.",
                                                                    "Ignore: Do not add this category. *(If you keep the channels, their permissions might not get imported properly!)*",
                                                                    embed, sentMessage, topicText + "\n\n*Note: you can decide over this category's channels next.*", false);
            }
            if (!(importType === 'overwrite')) { // actually, bad naming, this 'overwrite' option is actually the 'ignore' option, but I'm too tired to fix that right now
                let channelData = buildChannelData(bot, message, categoryChannel, roleIDMap, resultingChannels, channelsWithoutParent);
                if (importType === 'select') { // select a category channel and merge this one with it
                    let selectedChannel = await awaitRoleOrChannelSelection(bot, message, false, false, true, false);
                    if (selectedChannel) {
                        await selectedChannel.edit(channelData, reason);
                        resultingChannels[categoryChannel.id] = selectedChannel.id;
                    } else {
                        importType = 'add';
                    }
                }
                if (importType === 'add') {
                    let discordChannel = await guild.createChannel(categoryChannel.name, channelData, reason);
                    resultingChannels[categoryChannel.id] = discordChannel.id;

                    // TODO: enable setting this separately as well
                    if (categoryChannel.isEmbedChannel) {
                        await guild.setEmbed({enabled: true, channel:discordChannel.id}, reason)
                    }
                }
            }

            // ask what to do with the channel's children
            let additiveText = (importType === 'overwrite') ? "Additive: Specify a new category to add all channels to. *(Might not import permissions properly)*" :
                                                              (importType === 'select') ? "Additive: Add all channels to the merged category." : "Additive: Add all channels to the imported section.";
            let selectiveText = "Selective: Select where to place each channel of this category separately. *(Allows for channel merging, which allows keeping " +
                                "channel content while changing permissions, but also might not import permissions properly if you choose a channel in a different category)*";
            let overwriteText = "Ignore: Discard all channels in this section.";

            let childrenImportType = 'add';
            embed.fields = [];
            embed.addField(categoryChannel.name, getChannelCategoryChildrenText(categoryChannel.children), false);
            childrenImportType = await awaitImportTypeSelection(bot, message, "Choose how to add the channels in category:\n\t**" + categoryChannel.name + "**\n** **",
                                                                additiveText, selectiveText, overwriteText, embed, sentMessage, "", false);

            if (childrenImportType === 'add') {
                let categoryChannelID = undefined;
                if (!(importType === 'overwrite')) {
                    categoryChannelID = resultingChannels[categoryChannel.id]; // take the category channel which we just created or merged
                } else {
                    // specify a new category channel to add all to
                    let selectedChannel = await awaitRoleOrChannelSelection(bot, message, false, false, true, false, true);
                    if (selectedChannel) categoryChannelID = selectedChannel.id;
                }
                // add all channels!
                for (let channelInfo of section.children) { // add all of them to the category channel
                    let channel = guildChannelData[channelInfo.arrayIndex];
                    let channelData = buildChannelData(bot, message, channel, roleIDMap, resultingChannels, channelsWithoutParent);
                    let discordChannel = await guild.createChannel(channel.name, channelData, reason);
                    if (categoryChannelID) discordChannel.setParent(categoryChannelID); // if parent not specified
                    resultingChannels[channel.id] = discordChannel.id;

                    // TODO: enable choosing whether to set these channels differently as well
                    if (channel.isSystemChannel) {
                        await guild.setSystemChannel(discordChannel.id, reason);
                    }
                    if (channel.isEmbedChannel) {
                        await guild.setEmbed({enabled: true, channel:discordChannel.id}, reason)
                    }
                }
            } else if (childrenImportType === 'select') {
                for (let channelInfo of section.children) {
                    let channel = guildChannelData[channelInfo.arrayIndex];
                    console.log("looking at channel " + channel.name);

                    let channelImportType = 'add';
                    embed.fields = [];
                    embed.addField(categoryChannel.name, getChannelCategoryChildrenText(categoryChannel.children), false);
                    channelImportType = await awaitImportTypeSelection(bot, message, "Choose how to add channel:\n\t**" + channel.name + "**\n** **",
                                                                        "Additive: Choose a category and add it to that category.",
                                                                        "Merging: Choose another channel and overwrite its permissions and name. (Allows keeping channel contents!)",
                                                                        "Discard: Do not import this channel.", embed, sentMessage,
                                                                        "*Note:  If the channel is not placed in the imported category, permissions might not get imported correctly.*", false);

                    console.log("channel selection was " + channelImportType)
                    if (!(channelImportType === 'overwrite')) {
                        let discordChannel = undefined;
                        let channelData;
                        console.log("building channel data")
                        channelData = buildChannelData(bot, message, channel, roleIDMap, resultingChannels, channelsWithoutParent);

                        let success = false;
                        if (channelImportType === 'select') {
                            let isVoice = (channel.type === 'voice');
                            let discordChannel = await awaitRoleOrChannelSelection(bot, message, false, false, false, isVoice, false);
                            if (discordChannel) {
                                console.log("selected channel " + discordChannel.name + " to merge with")
                                console.log("editing channel ")
                                console.log(discordChannel)
                                discordChannel = await discordChannel.edit(channelData, reason);
                                console.log("edited channel is --------------------------")
                                console.log(discordChannel)
                                resultingChannels[channel.id] = discordChannel.id;
                                success = true;
                            }
                            else console.log("didn't select a channel to merge with")
                        }
                        if (!success) {
                            console.log("selecting channel category")
                            let categoryChannel = await awaitRoleOrChannelSelection(bot, message, false, false, true, false, true);
                            if (categoryChannel) console.log("found category channel " + categoryChannel.name)
                            else console.log("didn't select a category channel")
                            console.log("creating channel")
                            discordChannel = await guild.createChannel(channel.name, channelData, reason);
                            if (categoryChannel) discordChannel.setParent(categoryChannel.id);
                            resultingChannels[channel.id] = discordChannel.id;
                        }

                        // TODO: enable choosing whether to set these channels differently as well
                        if (channel.isSystemChannel) {
                            await guild.setSystemChannel(discordChannel.id, reason);
                        }
                        if (channel.isEmbedChannel) {
                            await guild.setEmbed({enabled: true, channel:discordChannel.id}, reason)
                        }

                    }

                }
            }

        }

    }

    console.log("getting to categoryless channels --------------")

    for (let section of channelList) {
        if (section.id == -1) { // now import the section-less channels
            // TODO: offer the same selection as above!
            // I have been coding for 13+ hours straight now, I don't have the nerves for this one as well. I shall implement it somewhen...
            // add all channels!
            for (let channelInfo of section.children) { // add all of them to the category channel
                let channel = guildChannelData[channelInfo.arrayIndex];
                let channelData = buildChannelData(bot, message, channel, roleIDMap, resultingChannels, channelsWithoutParent);
                let discordChannel = await guild.createChannel(channel.name, channelData, reason);
                resultingChannels[channel.id] = discordChannel.id;

                // TODO: enable choosing whether to set these channels differently as well
                if (channel.isSystemChannel) {
                    await guild.setSystemChannel(discordChannel.id, reason);
                }
                if (channel.isEmbedChannel) {
                    await guild.setEmbed({enabled: true, channel:discordChannel.id}, reason)
                }
            }

            break;
        }
    }

    console.log("getting to channels without parents ------------------")

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

const importEmojis = async (bot, message, guildEmojiData, roleIDMap=undefined) => {
    let reason = "Apto Emoji Import"
    for (let emojiData of guildEmojiData) {
        console.log("Adding emoji " + emojiData.name);
        let rolesThatCanUseIt = [];
        if (roleIDMap) {
            for (let localRoleID of emojiData.roles) {
                let guildRoleID = roleIDMap[localRoleID];
                let role = message.guild.roles.get(guildRoleID);
                if (role) {
                    rolesThatCanUseIt.push(role);
                }
            }
        }
        await message.guild.createEmoji(emojiData.url, emojiData.name, rolesThatCanUseIt, reason);
    }
}

const importBans = async (bot, message, guildBanData) => {
    for (let banData of guildBanData) {
        console.log("Banning user " + banData.username + "#" + banData.discriminator);
        message.guild.ban(banData.userID, "Apto Ban Import; Reason = " + banData.reason);
    }
}

module.exports.initImport = initImport;
module.exports.save = saveServerLayout;
module.exports.load = loadServerLayout;
module.exports.clearRoles = clearRoles;
