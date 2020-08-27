import { Guild } from "discord.js";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { BotConfiguration } from "../Configuration/Config";

export async function onGuildCreate(guild: Guild): Promise<void> {
	if (BotConfiguration.exemptGuild.includes(guild.id)) {
        return;
    }
	const mdHandler: MongoDbHelper.MongoDbGuildManager = new MongoDbHelper.MongoDbGuildManager(guild.id);
	await mdHandler.findOrCreateGuildDb();
}