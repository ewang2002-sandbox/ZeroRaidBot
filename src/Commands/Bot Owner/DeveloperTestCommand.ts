import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message } from "discord.js";

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
		args: string[]
	): Promise<void> {
		/*
		const resp: AxiosResponse<string> = await Zero.AxiosClient.post(`https://localhost:5001/api/dungeoneer/parse`, {
			image: msg.content
		}, {});

		msg.channel.send(resp.data);*/
	}
}