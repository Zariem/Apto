const getRoleOrChannel = require('../util/get_role_or_channel.js');

const getRoleOrChannelInfo = (bot, message, roleOrChannel) => {
    let result = getRoleOrChannel(message.guild, roleOrChannel);
    if (result.type === 'role') {
        return getRoleInfo(bot, message, result.value);
    } else if (result.type === 'channel') {
        return getChannelInfo(bot, message, result.value);
    }
}

const getRoleInfo = (bot, message, role) => {
    let channels = message.guild.channels;
}

const getChannelInfo = (bot, message, role) => {

}
