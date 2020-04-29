import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Command } from "../../Templates/Command/Command";
import { Message, Guild } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { RaidHandler } from "../../Handlers/RaidHandler";

export class StartHeadcountCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Start Headcount Command",
				"startheadcount",
				["starthc"],
				"Starts a new headcount.",
				["startheadcount"],
				["startheadcount"],
				0
			),
			new CommandPermission(
				[],
				["headRaidLeader", "raidLeader", "almostRaidLeader", "trialRaidLeader"],
				false
			),
			true,
			false,
			false
		);
	}

	public async executeCommand(message: Message, args: string[], guildData: IRaidGuild): Promise<void> {
		RaidHandler.startHeadCountWizard(message, guildData, message.guild as Guild);
	}
}