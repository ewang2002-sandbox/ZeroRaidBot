import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildMember, Guild, TextChannel, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { UserHandler } from "../../Helpers/UserHandler";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";

export class ModmailBlacklistCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Modmail Blacklist",
				"modmailblacklist",
				["mbl"],
				"Blacklists a user from using modmail.",
				["modmailblacklist <@Mention | ID> <Reason: STRING>"],
				["modmailblacklist @Test#1111 spamming modmail."],
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
			false,
			5
		);
	}

	// TODO only accept ign
	public async executeCommand(
		msg: Message,
		args: string[],
		guildDb: IRaidGuild
	): Promise<void> {
		const memberToModmailBl: GuildMember | null = await UserHandler.resolveMember(msg, guildDb);
		const guild: Guild = msg.guild as Guild;
		if (memberToModmailBl === null) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_MEMBER_FOUND", null), msg.channel);
			return;
		}

		if (memberToModmailBl.id === msg.author.id) {
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

		if (guildDb.moderation.blacklistedModMailUsers.findIndex(x => x.id === memberToModmailBl.id) !== -1) {
			await MessageUtil.send(MessageUtil.generateBlankEmbed(msg.author).setTitle("Already Modmail Blacklisted").setDescription(`${memberToModmailBl} is already blacklisted from using modmail.`), msg.channel);
			return;
		}

		await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
			$push: {
				"moderation.blacklistedModMailUsers": {
					id: memberToModmailBl.id,
					mod: (msg.member as GuildMember).displayName,
					time: new Date().getTime(),
					reason: reason
				}
			}
		});

		MessageUtil.send({ content: `${memberToModmailBl} has been blacklisted from modmail successfully.` }, msg.channel);		

		const moderationChannel: TextChannel | undefined = guild.channels.cache.get(guildDb.generalChannels.logging.moderationLogs) as TextChannel | undefined;

		if (typeof moderationChannel === "undefined") {
			return;
		}

		const embed: MessageEmbed = new MessageEmbed()
			.setTitle("Modmail Blacklisted")
			.setDescription(`⇒ **Blacklisted:** ${memberToModmailBl} (${memberToModmailBl.id})\n⇒ **Moderator:** ${msg.author} (${msg.author.id})`)
			.addField("⇒ Modmail Blacklist Reason", reason)
			.setColor("RED")
			.setFooter("Blacklisted on")
			.setTimestamp();
		embed.setAuthor(memberToModmailBl.user.tag, memberToModmailBl.user.displayAvatarURL());
		await moderationChannel.send(embed).catch(() => { });
	}
}