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
import { HelpCommand } from "../Modules/Public/HelpCommand";

/**
 * This class should only be called ONCE. 
 */
export class CommandManager {
	/**
	 * The commands in the bot.
 	 */
	private commands: Collection<string, Command[]>;

	/**
	 * Whether commands have been loaded or not for this particular object.
	 */
	private hasBeenLoaded: boolean = false;

	/**
	 * The constructor for this method.
	 */
	public constructor() {
		// instantiate collection obj
		this.commands = new Collection<string, Command[]>();
	}

	/**
	 * Loads all commands. This should only be called once.
	 */
	public loadAllCommands(): void {
		if (this.hasBeenLoaded) {
			return;
		}

		this.commands.set("Public", [
			new HelpCommand()
		]);

		this.commands.set("Configuration", [
			new ConfigureSectionCommand()
		]);

		this.commands.set("Raid Leader", [
			new StartAfkCheckCommand(), 
			new StartHeadcountCommand()
		]);

		this.commands.set("Developer", [
			new TestCommand()
		]);

		this.commands.set("Staff", [
			new SendEmbedCommand(), 
			new FindUserCommand(),
			new PollCommand()
		]);
		
		this.commands.set("Moderation", [
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
	 * Gets all commands loaded.
	 */
	public getCommands(): Collection<string, Command[]> {
		return this.commands;
	}

	/**
	 * Looks for a command and returns it.
	 * @param {string} cmd The command name to look for.
	 * @returns {Command | null} The command, if available. 
	 */
	public findCommand(cmd: string): Command | null {
		for (let [, command] of this.commands) {
			for (let i = 0; i < command.length; i++) {
				if (command[i].getMainCommandName().toLowerCase() === cmd.toLowerCase()) {
					return command[i];
				}

				if (command[i].getAliases().length > 0) {
					for (let j = 0; j < command[i].getAliases().length; j++) {
						if (command[i].getAliases()[j].toLowerCase() === cmd.toLowerCase()) {
							return command[i];
						}
					}
				}
			}
		}

		return null;
	}
}