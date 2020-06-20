import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, Guild, GuildMember } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { UserHandler } from "../../Helpers/UserHandler";
import { MessageUtil } from "../../Utility/MessageUtil";

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
        const member: GuildMember | null = await UserHandler.resolveMember(msg, guildData);
        if (member === null) {
            MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_MEMBER_FOUND", null), msg.channel);
            return;
        }
    }
}
