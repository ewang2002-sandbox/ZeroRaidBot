import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, Guild, TextChannel } from "discord.js";

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
			true
		);
	}

	public async executeCommand(
		msg: Message,
		args: string[]
	): Promise<void> {
        /*
        const guild: Guild = msg.guild as Guild;
        const channel: TextChannel = guild.channels.cache.get("703614830497628210") as TextChannel;
        const message: Message = await channel.messages.fetch("747290398400970833");
        console.log(message.content);*/
    }
}