import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, Guild } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";

export class LogKeysCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Log Keys Command",
				"logkeys",
				["logkey", "keypop", "kp"],
				"Logs keys popped by other people.",
				["logkeys <@Mention | ID | IGN> [Amount: NUMBER]"],
				["logkeys User#0001 4"],
				1
			),
			new CommandPermission(
				[],
				[],
				["headRaidLeader", "universalRaidLeader", "universalAlmostRaidLeader"],
				["ALL_RL_TYPE"],
				false
			),
			true,
			false,
			false
		);
    }
    
    public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
        const guild: Guild = msg.guild as Guild;
        
    }
}
