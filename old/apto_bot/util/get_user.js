
const getUser = async (bot, message, text) => {
    // parse the reply
    const numberRegexp = /(\d+)/g;
    let match = numberRegexp.exec(text); // check if the message has a number
    let value = "";
    let result = undefined; // our user object
    if (match) { // found a number
        value = match[1].toString(); // take the first number we found
        result = await bot.fetchUser(value, true);
        if (result) {
            return result;
        }
    }
    message.channel.send("Couldn't find user. Please use the @ tag or copy and paste the user's ID.\n" +
                         "Go to User `Settings -> Appearance -> Advanced` and ensure that `Developer Mode` is active, so you can " +
                         "get a user's ID by right clicking their name.");
    return undefined;
}



module.exports = getUser;
