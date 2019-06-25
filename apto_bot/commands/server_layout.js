
const saveServerLayout = async (bot, message, verbose=true) => {
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
        embedEnabled: guildEmbed.embedEnabled,
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

    // get info on the guild embed (Server Widget)
    let guildEmbed = await guild.fetchEmbed();
    let guildEmbedChannelID = undefined;
    if (guildEmbed.channel) {
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

    for (let role in roles) {
        if (!role.managed) { // don't clone integrated bot roles
            roleIDToLocalID[role.id] = localRoleID;
            roleObject = {
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
        }
    }

    if (verbose) message.channel.send("Gathering channel infos...");

    let channels = guild.channels;
    let localChannelID = 0;
    let channelIDToLocalID = {}; // look up table

    // fill the lookup table
    for (let channel in channels) {
        channelIDToLocalID[channel.id] = localChannelID;
        localChannelID++;
    }

    for (let channel in channels) {
        if (verbose) message.channel.send("- adding #" + channel.name);
        // channel type is either "text", "voice", "category"
        // if we try to clone a verified server, it might be "news" or "store"
        // "news" is a channel type readable by people that are not on the server
        // other than that it's just a text channel
        // "store" is a channel type to sell games. Both are only available to
        // verified servers e.g. of game companies.
        // TODO: upon importing these, handle special cases of "news" and "store"
        channelObject = {
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
            let childArray = [];
            for (let child in children) {
                childArray.push(channelIDToLocalID[child.id]);
            }
            channelObject.children = childArray;
        }

        // add permission overwrites
        let overwrites = channel.permissionOverwrites;
        let overwriteArray = [];
        for (let overwrite in overwrites) {
            overwriteArray.push({
                id: overwrite.id, // userid or roleid
                type: overwrite.type,
                allow: overwrite.allow, // bitfield of all allowed permissions
                deny: overwrite.deny // bitfield of all denied permissions
            });
        }
        channelObject.permissionOverwrites = overwriteArray;

        guildObject.channels.push(channelObject);
    }
    if (verbose) message.channel.send("Done!");
    console.log(guildObject);

    // emojis

    // bans
    //let bans = await guild.fetchBans(true)
}

module.exports.save = saveServerLayout;
