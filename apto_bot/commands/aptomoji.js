const Discord = require('discord.js');
const config = require('../config.json');

const nameList = ["think", "fear", "cheer", "thumbsup", "fingerguns", "thumbup", "smile", "happy", "content", "explain",
                  "freeze", "warn", "tip", "shush", "fire", "burn", "kimmy", "dab", ":3", "sweat",
                  "ooo", "derp", "guilt", "bleh", "ehh", "shock", "wasntme", "pout", "annoyed", "cry",
                  "sniff", "flirt", "wink", "blush", "grin", "snapto"]

const help = (bot, message) => {
    let emojiNames = "random";
    for (let name of nameList) {
        emojiNames = emojiNames + ", " + name;
    }
    let embed = new Discord.RichEmbed();
    embed.setDescription("Usage: `" + config.prefix + "aptomoji [optional: emojiname]`")
         .addField("Emoji Names:", emojiNames)
    message.channel.send(embed);
}

const postAptomoji = (bot, message, emojiName) => {
    let embed = new Discord.RichEmbed();
    if (emojiName === "") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/593454995584712704/image2.png");
    } else if (emojiName === "help") {
        return help(bot, message);
    } else if (emojiName === "random") {
        let name = nameList[Math.floor(Math.random()*nameList.length)];
        return postAptomoji(bot, message, name);
    } else if (emojiName === "think") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/593868119374692389/image0.png")
    } else if (emojiName === "fear") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/593868120255365136/image1.png")
    } else if (emojiName === "cheer") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/593868120754749477/image2.png")
    } else if (emojiName === "thumbsup") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/593868163943235615/image0.png")
    } else if (emojiName === "fingerguns") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/593868164643946498/image1.png")
    } else if (emojiName === "thumbup") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/593868165419761669/image2.png")
    } else if (emojiName === "smile") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/593875621046779906/image0.png")
    } else if (emojiName === "happy") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/593875622380699659/image2.png")
    } else if (emojiName === "content") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/593875624314142720/image3.png")
    } else if (emojiName === "explain") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/593919045791776779/Aptoexplaining.png")
    } else if (emojiName === "freeze") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/593923463496859658/image0.png")
    } else if (emojiName === "warn") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/593937830703661060/image0.png")
    } else if (emojiName === "tip") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594082860785467393/aptoexclamation.png")
    } else if (emojiName === "shush") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594129361880219650/aptoshhh2.png")
    } else if (emojiName === "fire") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594266364764487684/aptoFIREver3.png")
    } else if (emojiName === "burn") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594266405038456838/aptoFIREver2.png")
    } else if (emojiName === "kimmy") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594266459656421399/aptoFIREver1.png")
    } else if (emojiName === "dab") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594309810330009620/image0.png")
    } else if (emojiName === ":3") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316265724837908/image0.png")
    } else if (emojiName === "sweat") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316266257383424/image1.png")
    } else if (emojiName === "ooo") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316266752180244/image2.png")
    } else if (emojiName === "derp") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316267255758868/image3.png")
    } else if (emojiName === "guilt") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316445362683923/image0.png")
    } else if (emojiName === "bleh") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316446000087054/image1.png")
    } else if (emojiName === "ehh") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316446729764864/image2.png")
    } else if (emojiName === "shock") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316447426281474/image3.png")
    } else if (emojiName === "wasntme") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316581190893578/image0.png")
    } else if (emojiName === "pout") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316581719244812/image1.png")
    } else if (emojiName === "annoyed") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316582252183562/image2.png")
    } else if (emojiName === "cry") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316582809894930/image3.png")
    } else if (emojiName === "sniff") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316780454019082/image0.png")
    } else if (emojiName === "flirt") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316780953010181/image1.png")
    } else if (emojiName === "wink") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316781464584214/image2.png")
    } else if (emojiName === "blush") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316782219821059/image3.png")
    } else if (emojiName === "grin") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594316834187247617/image0.png")
    } else if (emojiName === "snapto") {
        embed.setImage("https://cdn.discordapp.com/attachments/592749834079961093/594323453222453259/snapto.png")
    }
    message.channel.send(embed)
}

module.exports.sendEmoji = postAptomoji;
