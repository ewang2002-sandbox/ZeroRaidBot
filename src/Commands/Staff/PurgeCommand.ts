import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, Collection, Guild, TextChannel, ChannelLogsQueryOptions, User, GuildMember, MessageEmbed, MessageAttachment } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { UserHandler } from "../../Helpers/UserHandler";
import { OtherUtil } from "../../Utility/OtherUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { DateUtil } from "../../Utility/DateUtil";
import { clear } from "console";

export class PurgeCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Purge",
				"purge",
				["clear"],
				"A purge command.",
				["purge <Amount: NUMBER> [pins]"],
				["purge 33", "purge 100", "purge 22 pins"],
				1
			),
			new CommandPermission(
				["MANAGE_MESSAGES", "MANAGE_ROLES"],
				["ADD_REACTIONS", "EMBED_LINKS", "MANAGE_MESSAGES"],
				["officer", "moderator", "headRaidLeader"],
				[],
				false
			),
			true, // guild-only command. 
			false,
			false,
			5
		);
	}

	/**
	 * @inheritdoc
	 */
	public async executeCommand(
		msg: Message,
		args: string[],
		guildDb: IRaidGuild
	): Promise<void> {
		let num: number = Number.parseInt(args[0]);
		if (Number.isNaN(num)) {
			MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_NUMBER_INPUT", null), msg.channel);
			return;
		}

		const clearPins: boolean = args.includes("pins");

		const sb: StringBuilder = new StringBuilder()
			.append(`[PURGE] Purge Command Executed`)
			.appendLine()
			.append(`Time: ${DateUtil.getTime()}`)
			.appendLine()
			.append(`Moderator: ${msg.author.tag} (${msg.author.id})`)
			.appendLine()
			.append(`Keep Pinned? ${clearPins ? "Yes" : "No"}`)
			.appendLine()
			.appendLine()
			.append("============================")
			.appendLine();

		let msgsCleared: number = 0;
		let numToClear: number = 0;
		while (num > 0) {
			if (num > 100) {
				numToClear = 100;
				num -= 100;
			}
			else {
				numToClear = num;
				num = 0;
			}

			const q: ChannelLogsQueryOptions = {
				limit: numToClear
			};

			let msgs: Collection<string, Message> = await msg.channel.messages.fetch(q);
			if (msgs.size === 0) {
				break;
			}

			if (!clearPins) {
				msgs = msgs.filter(x => !x.pinned);
			}

			const deletedMsg: Collection<string, Message> | void = await (msg.channel as TextChannel)
				.bulkDelete(msgs, true).catch(e => { });
			if (typeof deletedMsg !== "undefined") {
				if (deletedMsg.size === 0) {
					break;
				}
				for (const [id, m] of deletedMsg) {
					sb.append(`[${DateUtil.getTime(m.createdAt)}] ${m.author.tag} • ${m.author.id}`)
						.appendLine()
						.append(`Message ID: ${m.id}`)
						.appendLine()
						.appendLine()
						.append(m.content)
						.appendLine()
						.appendLine()
						.append(`Attachments: [${Array.from(m.attachments).map(x => x[1].url).join(", ")}]`)
						.appendLine()
						.append("============================")
						.appendLine();
				}
				msgsCleared += deletedMsg.size;
			}
			await OtherUtil.waitFor(3000);
		}

		const embed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
			.setTitle(`🗑️ ${msgsCleared} Messages Cleared.`)
			.setDescription(`⇒ Moderator: ${msg.author} (${msg.author.id})\n⇒ Clear Pins? ${clearPins ? "Yes" : "No"}`)
			.addField("Note", "Please see the above text file for all purged messages.")
			.setColor("RED")
			.setTimestamp()
			.setFooter("Purge Command Executed At");
		await msg.author.send("=========================", {
			embed: embed,
			files: [new MessageAttachment(Buffer.from(sb.toString(), "utf8"), `${msg.author.id}_purge.txt`)]
		}).catch(() => { });
	}
}