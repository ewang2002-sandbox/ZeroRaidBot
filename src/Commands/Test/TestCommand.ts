import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, TextChannel, GuildMember } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { UserHandler } from "../../Helpers/UserHandler";

export class TestCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Test",
				"test",
				[],
				"A developer-only command.",
				["test"],
				["test"],
				0
			),
			new CommandPermission(
				[],
				[],
				[],
				[],
				false
			),
			false, // guild-only command. 
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