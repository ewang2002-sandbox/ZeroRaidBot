import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, ClientUser, MessageEmbed, Guild, GuildMember } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { IRaidBot } from "../../Templates/IRaidBot";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { INetworkBlacklistedUser, IBlacklistedUser } from "../../Definitions/IBlacklistedUser";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { IRaidUser } from "../../Templates/IRaidUser";
import { DateUtil } from "../../Utility/DateUtil";
import { UserHandler } from "../../Helpers/UserHandler";
import { MessageUtil } from "../../Utility/MessageUtil";

export class CheckModmailBlacklistCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Check Modmail Blacklist.",
				"checkmodmailblacklist",
				["cmbl", "smbl", "scanmodmailblacklist"],
				"Checks and sees if someone has been blacklisted from using modmail.",
				["checkmodmailblacklist <ID | @Mention>"],
				["checkmodmailblacklist Deatttthhh"],
				1
			),
			new CommandPermission(
				[],
				["EMBED_LINKS"],
				["support"],
				[],
				true
			),
			true, // guild-only command. 
			false,
			false
		);
	}

	/**
	 * @inheritdoc
	 */
	public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
		const memberToLookFor: GuildMember | null = await UserHandler.resolveMember(msg, guildData);
		const guild: Guild = msg.guild as Guild;
		if (memberToLookFor === null) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_MEMBER_FOUND", null), msg.channel);
			return;
		}

		if (memberToLookFor.id === msg.author.id) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "SAME_PERSON_AS_AUTHOR", null), msg.channel);
			return;
		}

		const index: number = guildData.moderation.blacklistedModMailUsers.findIndex(x => x.id === memberToLookFor.id);
		if (index === -1) {
			MessageUtil.send({ content: `${memberToLookFor} wasn't found in the modmail blacklist. Please try again. `}, msg.channel);
			return;
		}

		const embed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
			.setTitle("User Blacklisted From Modmail")
			.setDescription(`⇒ **Moderator:** ${guildData.moderation.blacklistedModMailUsers[index].mod}\n⇒ **Time:** ${DateUtil.getTime(guildData.moderation.blacklistedModMailUsers[index].time)}`)
			.addField("⇒ Reason", guildData.moderation.blacklistedModMailUsers[index].reason)
			.setFooter("Blacklisted from Modmail");
		await msg.channel.send(embed).catch(e => { });
	}
}