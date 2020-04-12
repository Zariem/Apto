const db = require('quick.db');

const tempBans = new db.table('tempBans'); // stores detaila about all warnings

const addTempBan = async (bot, message, userID, timeSpecs) => {
    // timeSpecs = {minutes: 0, hours: 0, days: 0}
    let currentTimestamp = Date.now();
    let additionalTime = (timeSpecs.minutes * 60000) + (timeSpecs.hours * 36000000) + (timeSpecs.days * 86400000);
    let timestamp = currentTimestamp + additionalTime;
    let data = {
                userID: userID,
                serverID: message.guild.id,
                unbanTimestamp: timestamp
               };

    tempBans.set(currentTimestamp, data)
    .then(entry => {
        console.log("successfully stored warning at id " + currentTimestamp);
        //console.log(entry);
    });
}

// check if there's any user whose timeout expired and try to unban this user
const checkBans = async (bot) => {
    let entries = await tempBans.fetchAll();
    let timestampNow = Date.now();
    for (let ban of entries) {
        if (ban.data.unbanTimestamp < timestampNow) {
            let guild = await bot.guilds.get(ban.data.serverID);
            if (guild) {
                console.log("unbanned a timed out user!")
                guild.unban(ban.data.userID, "Timeout Expired!");
            }
            tempBans.delete(ban.ID);
        }
    }
}

const removeBan = async (serverID, userID) => {
    let entries = await tempBans.fetchAll();
    for (let ban of entries) {
        if (ban.data.serverID === serverID && ban.data.userID === userID) {
            tempBans.delete(ban.ID);
        }
    }
}

module.exports.addTempBan = addTempBan;
module.exports.checkBans = checkBans;
module.exports.removeBan = removeBan;
