import { Zero } from "./Zero";
import { BotConfiguration } from "./Configuration/Config";
import { DateUtil } from "./Utility/DateUtil";

const bot: Zero = new Zero(BotConfiguration.token);
bot.login();

process.on("uncaughtException", (error) => {
    console.error(`ERROR OCCURRED AT: ${DateUtil.getTime()}`);
    console.error(error);
    console.info("=====================");
});

process.on("unhandledRejection", (error) => {
    console.error(`ERROR OCCURRED AT: ${DateUtil.getTime()}`);
    console.error(error);
    console.info("=====================");
});