import { Collection } from "discord.js";
import { Command } from "../Templates/Command/Command";
import { TestCommand } from "../Commands/Test/TestCommand";
import { SendEmbedCommand } from "../Commands/Staff/SendEmbedCommand";
import { ConfigureSectionCommand } from "../Commands/Configuration/ConfigureSectionCommand";
import { StartAfkCheckCommand } from "../Commands/Raid Leader/StartAfkCheckCommand";
import { StartHeadcountCommand } from "../Commands/Raid Leader/StartHeadcountCommand";
import { FindUserCommand } from "../Commands/Staff/FindUserCommand";
import { MuteCommand } from "../Commands/Moderator/MuteCommand";
import { UnmuteCommand } from "../Commands/Moderator/UnmuteCommand";
import { SuspendCommand } from "../Commands/Moderator/SuspendCommand";
import { UnsuspendCommand } from "../Commands/Moderator/UnsuspendCommand";
import { CheckBlacklistCommand } from "../Commands/Staff/CheckBlacklistCommand";
import { BlacklistCommand } from "../Commands/Moderator/BlacklistCommand";
import { UnblacklistCommand } from "../Commands/Moderator/UnblacklistCommand";
import { PollCommand } from "../Commands/Staff/PollCommand";
import { HelpCommand } from "../Commands/Public/HelpCommand";
import { ManualVerifyCommand } from "../Commands/Staff/ManualVerifyCommand";

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
			new PollCommand(),
			new CheckBlacklistCommand(),
			new ManualVerifyCommand()
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