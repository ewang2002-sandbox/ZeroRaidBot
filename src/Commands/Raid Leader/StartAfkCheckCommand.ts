import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Command } from "../../Templates/Command/Command";
import { Message, Guild } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { RaidHandler } from "../../Helpers/RaidHandler";

export class StartAfkCheckCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Start AFK Check",
				"startafk",
				["startafkcheck", "sac", "ac", "afk"],
				"Starts an AFK check.",
				["startafk <Location>"],
				["startafk ussw left"],
				1
			),
			new CommandPermission(
				[],
				["MANAGE_CHANNELS", "ADD_REACTIONS", "EMBED_LINKS"],
				["headRaidLeader", "universalRaidLeader", "universalAlmostRaidLeader"],
				["ALL_RL_TYPE"],
				false
			),
			true,
			false,
			false
		);
	}

	public async executeCommand(message: Message, args: string[], guildData: IRaidGuild): Promise<void> {
		RaidHandler.startAfkCheck(message, guildData, message.guild as Guild, args.join(" "));
	}
}