import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";

export class MuteCommand extends Command {
	public static currentTimeout: { timeout: NodeJS.Timeout, id: string }[] = [];

	public constructor() {
		super(
			new CommandDetail(
				"Mute",
				"mute",
				[],
				"Mutes a user for a specified duration or for an indefinite period of time. This will prevent them from messaging in channels. If no time argument is given, the mute will be indefinite. NOTE THE USE OF ARGUMENT FLAGS!",
				["mute <@Mention | ID | IGN> [-t Time s | m | h | d] [-r Reason: STRING]"],
				["mute @Test#1234", "mute @Test#1234 -t 5d", "mute @Test#1234 -t 17h -r Toxic.", "mute @Test#1234 -r Testing."],
				1
			),
			new CommandPermission(
				["MUTE_MEMBERS"],
				["MANAGE_CHANNELS", "MANAGE_ROLES", "EMBED_LINKS"],
				["support", "headRaidLeader", "officer", "moderator"],
				[],
				false
			),
			true,
			false,
			false
		);
	}

	public async executeCommand(
		msg: Message,
		args: string[],
		guildDb: IRaidGuild
	): Promise<void> {

    }
}