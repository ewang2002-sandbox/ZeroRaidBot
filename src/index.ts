import { Zero } from "./Zero";
import { Credentials } from "./Configuration/Config";
import { DateUtil } from "./Utility/DateUtil";
import { MessageEmbed } from "discord.js";

const bot: Zero = new Zero(Credentials.token);
bot.login();

process.on("uncaughtException", (error) => {
    console.error(`ERROR OCCURRED AT: ${DateUtil.getTime()}`);
    console.error(error);
    console.log("=====================");
});

process.on("unhandledRejection", (error) => {
    console.error(`ERROR OCCURRED AT: ${DateUtil.getTime()}`);
    console.error(error);
    console.log("=====================");
});