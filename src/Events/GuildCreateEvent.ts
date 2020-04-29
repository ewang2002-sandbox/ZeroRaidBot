import { Client, Guild } from "discord.js";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";

export async function onGuildCreate(guild: Guild): Promise<void> {
	const mdHandler: MongoDbHelper.MongoDbGuildManager = new MongoDbHelper.MongoDbGuildManager(guild.id);
	await mdHandler.findOrCreateGuildDb();
}