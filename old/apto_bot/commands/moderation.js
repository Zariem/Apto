const config = require('../config.json');
const database = require('../util/database_handler.js');
const getUser = require('../util/get_user.js');

const tempBan = async (bot, message, args) => {
    let userArgument = args[1];
    let user = await getUser(bot, message, userArgument);
    if (!user) {
        message.channel.send("Usage: `" + config.prefix + "tempBan [userID|@user] 1 [d|day|days] 1 [h|hrs|hour|hours] 1 [m|min|minute|minutes]`");
        return;
    }

    let regexp = /(\d*)\s*(?:d|day|days)\s*(\d*)\s*(?:h|hrs|hour|hours)\s*(\d*)\s*(?:m|min|mins|minute|minutes)\s*(\d*)\s*/g

    let timeArgument = args.slice(2).join(" ");
    console.log(timeArgument)
    let match = regexp.exec(timeArgument);
    if (match) {
        let timeInfo = {minutes: match[3], hours: match[2], days: match[1]}
        let tempBanMsg = "Banning user <@" + user.id + "> for " + timeInfo.days + " days, " + timeInfo.hours + " hours and " + timeInfo.minutes + " minutes.";
        let sentMessage = await message.channel.send(tempBanMsg);
        await database.addTempBan(bot, message, user.id, timeInfo);
        await message.guild.ban(user.id, tempBanMsg);
        return;
    }
    message.channel.send("Usage: `" + config.prefix + "tempban [userID|@user] 1 [d|day|days] 1 [h|hrs|hour|hours] 1 [m|min|minute|minutes]`");
}

const listBans = async (bot) => {
    database.checkBans(bot);
}

const unban = async (bot, message, args) => {
    let userArgument = args[1];
    let user = await getUser(bot, message, userArgument);
    if (!user) {
        message.channel.send("Usage: `" + config.prefix + "unban [userID|@user]`");
        return;
    }
    await database.removeBan(message.guild.id, user.id);
    await message.guild.unban(user.id, "Manual Unban by " + message.author.username);
    message.channel.send("User unbanned.");
}

module.exports.tempBan = tempBan;
module.exports.listBans = listBans;
module.exports.unban = unban;
