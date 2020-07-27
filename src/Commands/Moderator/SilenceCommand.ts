import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, Guild, GuildMember, TextChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { UserHandler } from "../../Helpers/UserHandler";
import { SilencedUsers } from "../../Events/MessageEvent";

export class SilenceCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Silence Command",
				"silence",
				["zipit"],
				"Silences or un-silences a person... This is a joke command but it could be useful.",
				["silence <@Mention | ID | IGN> <Reason>"],
				["silence @User#0001 Test"],
				2
			),
			new CommandPermission(
				[],
				[],
				["officer"],
				[],
				true
			),
			true,
			false,
			false
		);
	}

	public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
		const guild: Guild = msg.guild as Guild;
		let target: GuildMember | null = await UserHandler.resolveMember(msg, guildData);

		if (target === null) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_MEMBER_FOUND", null), msg.channel);
			return;
		}

		if (target.id === msg.author.id) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "SAME_PERSON_AS_AUTHOR", null), msg.channel);
			return;
		}

		// remove member
		args.shift();

		// get other arguments
		const reason: string = args.join(" ");

		const moderationChannel: TextChannel | undefined = guild.channels.cache.get(guildData.generalChannels.logging.moderationLogs) as TextChannel | undefined;
		const embed: MessageEmbed = new MessageEmbed()
			.setAuthor(target.user.tag, target.user.displayAvatarURL())
			.setTimestamp()
			.setFooter("Silence Command Executed At");

		if (SilencedUsers.has(guild.id) && (SilencedUsers.get(guild.id) as string[]).includes(msg.author.id)) {
			await MessageUtil.send({ content: `${target} has been un-silenced successfully.` }, msg.channel).catch(() => { });
			embed.setTitle("😄 User Un-Silenced")
				.setDescription(`⇒ Un-Silenced Member: ${target} (${target.displayName})\n⇒ Moderator: ${msg.member as GuildMember} (${(msg.member as GuildMember).displayName})\n⇒ Reason: ${reason}`)
				.setColor("GREEN");
			(SilencedUsers.get(guild.id) as string[]).splice((SilencedUsers.get(guild.id) as string[]).indexOf(msg.author.id), 1);
		}
		else {
			await MessageUtil.send({ content: `${target} has been silenced successfully.` }, msg.channel).catch(() => { });
			embed.setTitle("🤐 User Silenced")
				.setDescription(`⇒ Silenced Member: ${target} (${target.displayName})\n⇒ Moderator: ${msg.member as GuildMember} (${(msg.member as GuildMember).displayName})\n⇒ Reason: ${reason}`)
				.setColor("RED");
			if (SilencedUsers.has(guild.id)) {
				(SilencedUsers.get(guild.id) as string[]).push(msg.author.id);
			}
			else {
				SilencedUsers.set(guild.id, [msg.author.id]);
			}
		}

		if (typeof moderationChannel !== "undefined") {
			await moderationChannel.send(embed).catch(() => { });
		}
	}
}