import { MessageReaction, User, Message, Guild, PartialUser, TextChannel, MessageEmbed, GuildMember } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { ISection } from "../Templates/ISection";
import { GuildUtil } from "../Utility/GuildUtil";
import { MessageUtil } from "../Utility/MessageUtil";
import { DateUtil } from "../Utility/DateUtil";
import { ReactionLoggingHandler } from "../Helpers/ReactionLoggingHandler";

export async function onMessageReactionRemove(
	reaction: MessageReaction,
	user: User | PartialUser
): Promise<void> {
	// PRECHECK AND PRELOAD
	if (reaction.partial) {
		let fetchedReaction: MessageReaction | void = await reaction.fetch().catch(() => { });
		if (typeof fetchedReaction === "undefined") {
			return;
		}
		reaction = fetchedReaction;
	}

	if (reaction.message.partial) {
		let fetchedMessage: Message | void = await reaction.message.fetch().catch(() => { });
		if (typeof fetchedMessage === "undefined") {
			return;
		}
		reaction.message = fetchedMessage;
	}

	if (reaction.message.guild === null) {
		return;
	}

	if (user.bot) {
		return;
	}

	if (reaction.message.type !== "DEFAULT") {
		return;
	}

	try {
		user = await user.fetch();
	}
	catch (e) {
		return;
	}

	const guild: Guild = reaction.message.guild;

	/**
	 * the member that reacted
	 */
	let member: GuildMember;
	try {
		member = await guild.members.fetch(user.id);
	}
	catch (e) {
		console.error(e);
		return;
	}

	// END PRECHECK AND PRELOAD

	const guildDb: IRaidGuild = await (new MongoDbHelper.MongoDbGuildManager(guild.id)).findOrCreateGuildDb();
	const allSections: ISection[] = [GuildUtil.getDefaultSection(guildDb), ...guildDb.sections];

	if (reaction.message.author.bot) {
		ReactionLoggingHandler.reacted(guild, reaction, member, allSections, "UNREACT");
	}
}