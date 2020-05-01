import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";

export class CheckBlacklistCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Check Blacklist.",
				"checkblacklist",
				["cbl", "sbl", "scanblacklist"],
				"Checks the server's blacklist for a target user.",
				["checkblacklist <Name>"],
				["checkblacklist ConsoleMC"],
				1
			),
			new CommandPermission(
				[],
				["EMBED_LINKS"],
				["support"],
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
		
	}
}