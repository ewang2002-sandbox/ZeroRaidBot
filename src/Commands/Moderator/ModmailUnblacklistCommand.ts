import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildMember, Guild, TextChannel, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { UserHandler } from "../../Helpers/UserHandler";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";

export class ModmailUnblacklistCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Modmail Unblacklist",
				"modmailunblacklist",
				["munbl"],
				"Unblacklists a user from using modmail. The person has to be in the server.",
				["modmailunblacklist <@Mention | ID> <Reason: STRING>"],
				["modmailunblacklist @Test#1111 spamming modmail."],
				2
			),
			new CommandPermission(
				["BAN_MEMBERS"],
				["BAN_MEMBERS", "EMBED_LINKS"],
				["officer", "moderator", "headRaidLeader"],
				[],
				false
			),
			true,
			false,
			false
		);
	}

	// TODO only accept ign
	public async executeCommand(
		msg: Message,
		args: string[],
		guildDb: IRaidGuild
	): Promise<void> {
		const memberToModmailUnbl: GuildMember | null = await UserHandler.resolveMember(msg, guildDb);
		const guild: Guild = msg.guild as Guild;
		if (memberToModmailUnbl === null) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_MEMBER_FOUND", null), msg.channel);
			return;
		}

		if (memberToModmailUnbl.id === msg.author.id) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "SAME_PERSON_AS_AUTHOR", null), msg.channel);
			return;
		}

		// mention/person
		args.shift();

		// "N/A" should not be possible
		const reason: string = args.join(" ") || "N/A";

		if (reason.length > 800) {
			await MessageUtil.send({ content: `The reason you provided is too long; your reasoning is ${reason.length} characters long, and the maximum length is 800 characters.` }, msg.channel);
			return;
		}

		if (guildDb.moderation.blacklistedModMailUsers.findIndex(x => x.id === memberToModmailUnbl.id) === -1) {
			await MessageUtil.send(MessageUtil.generateBlankEmbed(msg.author).setTitle("Not Modmail Blacklisted").setDescription(`${memberToModmailUnbl} is not blacklisted from using modmail. Please try again.`), msg.channel);
			return;
		}

		await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
			$pull: {
				"moderation.blacklistedModMailUsers": {
					id: memberToModmailUnbl.id,
				}
			}
		});

		MessageUtil.send({ content: `${memberToModmailUnbl} has been unblacklisted from modmail successfully.` }, msg.channel);

		const moderationChannel: TextChannel | undefined = guild.channels.cache.get(guildDb.generalChannels.logging.moderationLogs) as TextChannel | undefined;

		if (typeof moderationChannel === "undefined") {
			return;
		}

		const embed: MessageEmbed = new MessageEmbed()
			.setTitle("Modmail Unblacklisted")
			.setDescription(`⇒ **Unblacklisted:** ${memberToModmailUnbl} (${memberToModmailUnbl.id})\n⇒ **Moderator:** ${msg.author} (${msg.author.id})`)
			.addField("⇒ Reason", reason)
			.setColor("RED")
			.setFooter("Unblacklisted at")
			.setTimestamp();
		embed.setAuthor(memberToModmailUnbl.user.tag, memberToModmailUnbl.user.displayAvatarURL());
		await moderationChannel.send(embed).catch(() => { });
	}
}