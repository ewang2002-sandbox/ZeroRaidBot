import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { GuildUtil } from "../../Utility/GuildUtil";
import { ArrayUtil } from "../../Utility/ArrayUtil";

export class DeveloperTestCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Developer Test Command",
				"devtest",
				[],
				"A developer test command..",
				["devtest ...args"],
				["devtest ...args"],
				0
			),
			new CommandPermission(
				[],
				[],
				[],
				[],
				false
			),
			true,
			false,
			true,
			5
		);
	}

	public async executeCommand(
		msg: Message,
		args: string[],
		guildDb: IRaidGuild
	): Promise<void> {
		const allStaff = GuildUtil.getAllStaffMembers(msg.guild!, guildDb);
		const fields = ArrayUtil.arrayToStringFields(allStaff, (i, m) => `${m}\n`);
		const e = new MessageEmbed().setDescription("ok");
		for (const f of fields) e.addField("Staff Test", f);
		msg.channel.send(e);
	}
}