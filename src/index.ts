// https://github.com/discordjs/discord.js/issues/3665

import { Zero } from "./Zero";
import { BotConfiguration } from "./Configuration/Config";
import { DateUtil } from "./Utility/DateUtil";

const bot: Zero = new Zero(BotConfiguration.token);
bot.login();

process.on("uncaughtException", (error) => {
    console.error(`ERROR OCCURRED AT: ${DateUtil.getTime(new Date(), "America/Los_Angeles")}`);
    console.error(error);
    console.error("=====================");
});

process.on("unhandledRejection", (error) => {
    console.error(`ERROR OCCURRED AT: ${DateUtil.getTime(new Date(), "America/Los_Angeles")}`);
    console.error(error);
    console.error("=====================");
});
