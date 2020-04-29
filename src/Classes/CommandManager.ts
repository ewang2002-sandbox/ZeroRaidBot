import { Collection } from "discord.js";
import { Command } from "../Templates/Command/Command";
import { TestCommand } from "../Modules/Test/TestCommand";
import { SendEmbedCommand } from "../Modules/Staff/SendEmbedCommand";
import { ConfigureSectionCommand } from "../Modules/Configuration/ConfigureSectionCommand";
import { StartAfkCheckCommand } from "../Modules/Raid Leader/StartAfkCheckCommand";
import { StartHeadcountCommand } from "../Modules/Raid Leader/StartHeadcountCommand";
import { FindUserCommand } from "../Modules/Staff/FindUserCommand";
import { MuteCommand } from "../Modules/Moderator/MuteCommand";
import { UnmuteCommand } from "../Modules/Moderator/UnmuteCommand";
import { SuspendCommand } from "../Modules/Moderator/SuspendCommand";
import { UnsuspendCommand } from "../Modules/Moderator/UnsuspendCommand";
import { CheckBlacklistCommand } from "../Modules/Staff/CheckBlacklistCommand";
import { BlacklistCommand } from "../Modules/Moderator/BlacklistCommand";
import { UnblacklistCommand } from "../Modules/Moderator/UnblacklistCommand";
import { PollCommand } from "../Modules/Staff/PollCommand";

/**
 * This class should only be called ONCE. 
 */
export class CommandManager {
	/**
	 * The commands in the bot.
 	 */
	private Commands: Collection<string, Command[]>;

	/**
	 * Whether commands have been loaded or not for this particular object.
	 */
	private hasBeenLoaded: boolean = false;

	/**
	 * The constructor for this method.
	 */
	public constructor() {
		// instantiate collection obj
		this.Commands = new Collection<string, Command[]>();
	}

	/**
	 * Loads all commands. This should only be called once.
	 */
	public loadAllCommands(): void {
		if (this.hasBeenLoaded) {
			return;
		}

		this.Commands.set("Configuration", [
			new ConfigureSectionCommand()
		]);
		this.Commands.set("Raid Leader", [
			new StartAfkCheckCommand(), 
			new StartHeadcountCommand()
		]);
		this.Commands.set("Developer", [
			new TestCommand()
		]);
		this.Commands.set("Staff", [
			new SendEmbedCommand(), 
			new FindUserCommand(),
			new PollCommand()
		]);
		this.Commands.set("Moderation", [
			new MuteCommand(), 
			new UnmuteCommand(), 
			new SuspendCommand(), 
			new UnsuspendCommand(),
			new BlacklistCommand(),
			new UnblacklistCommand()
		]);

		this.hasBeenLoaded = true;
	}

	/**
	 * Looks for a command and returns it.
	 * @param {string} cmd The command name to look for.
	 * @returns {Command | null} The command, if available. 
	 */
	public findCommand(cmd: string): Command | null {
		for (let [, command] of this.Commands) {
			for (let i = 0; i < command.length; i++) {
				if (command[i].getCommandDetails().getMainCommandName().toLowerCase() === cmd.toLowerCase()) {
					return command[i];
				}

				if (command[i].getCommandDetails().getAliases().length > 0) {
					for (let j = 0; j < command[i].getCommandDetails().getAliases().length; j++) {
						if (command[i].getCommandDetails().getAliases()[j].toLowerCase() === cmd.toLowerCase()) {
							return command[i];
						}
					}
				}
			}
		}

		return null;
	}
}