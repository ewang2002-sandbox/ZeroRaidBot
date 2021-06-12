import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, Collection, TextChannel, ChannelLogsQueryOptions, MessageEmbed, MessageAttachment, GuildChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { OtherUtil } from "../../Utility/OtherUtil";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { DateUtil } from "../../Utility/DateUtil";

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

		// because we also deleted our own msg
		num++; 

		const channel: GuildChannel = msg.channel as GuildChannel;
		if (!channel.isText())
			return; 

		if (!(channel instanceof TextChannel))
			return; 
			
		const clearPins: boolean = args.includes("pins");
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

			let msgs: Collection<string, Message> = await channel.messages.fetch(q);


			if (!clearPins) {
				msgs = msgs.filter(x => !x.pinned);
			}

			if (msgs.size === 0) {
				break;
			}

			try {
				await channel.bulkDelete(msgs);
			}
			catch (e) {
				console.error(e); 
				break;
			}

			await OtherUtil.waitFor(3000);
		}
	}
}