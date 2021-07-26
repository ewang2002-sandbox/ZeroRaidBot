import { Collection } from "discord.js";
import { Command } from "../Templates/Command/Command";
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
import { PingCommand } from "../Commands/Public/PingCommand";
import { RoleInfoCommand } from "../Commands/Server Information/RoleInfoCommand";
import { ServerInfoCommand } from "../Commands/Server Information/ServerInfoCommand";
import { ChannelInfoCommand } from "../Commands/Server Information/ChannelInfoCommand";
import { UserInfoCommand } from "../Commands/Server Information/UserInfoCommand";
import { ViewUserProfileCommand } from "../Commands/User Profile/ViewUserProfileCommand";
import { AddAltAccountCommand } from "../Commands/User Profile/AddAltAccountCommand";
import { ViewServerProfileCommand } from "../Commands/Server Profile/ViewServerProfileCommand";
import { SwitchMainAltAccountCommand } from "../Commands/User Profile/SwitchMainAltAccountCommand";
import { ReconnectDBCommand } from "../Commands/Bot Owner/ReconnectDBCommand";
import { AddToNicknameCommand } from "../Commands/Server Profile/AddToNicknameCommand";
import { RemoveFromNicknameCommand } from "../Commands/Server Profile/RemoveFromNicknameCommand";
import { ServerProfileHelpCommand } from "../Commands/Server Profile/ServerProfileHelpCommand";
import { UserProfileHelpCommand } from "../Commands/User Profile/UserProfileHelpCommand";
import { ConfigurePrefixCommand } from "../Commands/Configuration/ConfigurePrefixCommand";
import { ConfigureVerifSuccessCommand } from "../Commands/Configuration/ConfigureVerifSuccessCommand";
import { LogRunsCommand } from "../Commands/Logging/LogRunsCommand";
import { ResetQuotaCommand } from "../Commands/Moderator/ResetQuotaCommand";
import { CheckQuotaCommand } from "../Commands/Logging/CheckQuotaCommand";
import { UnverifyFromServerCommand } from "../Commands/Server Profile/UnverifyFromServerCommand";
import { LogPoppedKeysCommand } from "../Commands/Logging/LogPoppedKeysCommand";
import { AdminProfileUpdaterCommand } from "../Commands/Bot Owner/AdminProfileUpdaterCommand";
import { LogRuneWCCommand } from "../Commands/Logging/LogRuneWCCommand";
import { LogVialCommand } from "../Commands/Logging/LogVialCommand";
import { NoLoggedRunsCommand } from "../Commands/Moderator/NoLoggedRunsCommand";
import { ModmailBlacklistCommand } from "../Commands/Moderator/ModmailBlacklistCommand";
import { ModmailUnblacklistCommand } from "../Commands/Moderator/ModmailUnblacklistCommand";
import { CheckModmailBlacklistCommand } from "../Commands/Staff/CheckModmailBlacklistCommand";
import { SuggestionCommand } from "../Commands/Public/SuggestionCommand";
import { BlacklistSuggestionUserCommand } from "../Commands/Bot Owner/BlacklistSuggestionUserCommand";
import { UnblacklistSuggestionUserCommand } from "../Commands/Bot Owner/UnblacklistSuggestionUserCommand";
import { EnableDisableSuggestionsCommand } from "../Commands/Bot Owner/EnableDisableSuggestionsCommand";
import { ConfigureApplicationCommand } from "../Commands/Configuration/ConfigureApplicationCommand";
import { SilenceCommand } from "../Commands/Moderator/SilenceCommand";
import { VerifyCommand } from "../Commands/Public/VerifyCommand";
import { ApplyCommand } from "../Commands/Public/ApplyCommand";
import { PurgeCommand } from "../Commands/Staff/PurgeCommand";
import { ConfigureBlockCmdCommand } from "../Commands/Configuration/ConfigureBlockCmdCommand";
import { DeveloperTestCommand } from "../Commands/Bot Owner/DeveloperTestCommand";
import { CloseModmailThreadCommand } from "../Commands/Modmail Management/CloseModmailThreadCommand";
import { ReplyModmailThreadCommand } from "../Commands/Modmail Management/ReplyModmailThreadCommand";
import { StartModmailThreadCommand } from "../Commands/Modmail Management/StartModmailThreadCommand";
import { SpamPingCommand } from "../Commands/Moderator/SpamPingCommand";
import { LeaderboardCommand } from "../Commands/Public/LeaderboardCommand";
import { LeaveServerCommand } from "../Commands/Bot Owner/LeaveServerCommand";
import { QuickLogAssistCommand } from "../Commands/Logging/QuickLogAssistCommand";
import { QuickLogMainRlCommand } from "../Commands/Logging/QuickLogMainRlCommand";
import { QuickLogFailCommand } from "../Commands/Logging/QuickLogFailCommand";
import { ManageTeamCommand } from "../Commands/Moderator/ManageTeamCommand";
import { ParseWhoCommand } from "../Commands/Staff/ParseWhoCommand";
import { ConfigureKeyPoppingRoleCommand } from "../Commands/Configuration/ConfigureKeyPoppingRoleCommand";

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
			new HelpCommand(),
			new PingCommand(),
			new SuggestionCommand(),
			new VerifyCommand(),
			new ApplyCommand(),
			new LeaderboardCommand()
		]);

		this.commands.set("Server Information", [
			new RoleInfoCommand(),
			new ServerInfoCommand(),
			new ChannelInfoCommand(),
			new UserInfoCommand()
		]);

		this.commands.set("Configuration", [
			new ConfigureSectionCommand(),
			new ConfigurePrefixCommand(),
			new ConfigureVerifSuccessCommand(),
			new ConfigureApplicationCommand(),
			new ConfigureKeyPoppingRoleCommand()
		]);

		this.commands.set("Modmail Management", [
			new CloseModmailThreadCommand(),
			new ReplyModmailThreadCommand(),
			new StartModmailThreadCommand()
		]);

		this.commands.set("Raid Leader", [
			new StartAfkCheckCommand(), 
			new StartHeadcountCommand()
		]);

		this.commands.set("Staff", [
			new SendEmbedCommand(), 
			new FindUserCommand(),
			new PollCommand(),
			new CheckBlacklistCommand(),
			new ManualVerifyCommand(),
			new CheckModmailBlacklistCommand(),
			new SilenceCommand(),
			new PurgeCommand(),
			new SpamPingCommand(),
			new ParseWhoCommand()
		]);

		this.commands.set("Moderation", [
			new MuteCommand(), 
			new UnmuteCommand(), 
			new SuspendCommand(), 
			new UnsuspendCommand(),
			new BlacklistCommand(),
			new UnblacklistCommand(),
			new ResetQuotaCommand(),
			new NoLoggedRunsCommand(),
			new ModmailBlacklistCommand(),
			new ModmailUnblacklistCommand(),
			new ConfigureBlockCmdCommand(),
			new ManageTeamCommand()
		]);
		
		this.commands.set("User Profile", [
			new ViewUserProfileCommand(),
			new AddAltAccountCommand(),
			new SwitchMainAltAccountCommand(),
			new UserProfileHelpCommand()
		]);

		this.commands.set("Server Profile", [
			new ViewServerProfileCommand(),
			new AddToNicknameCommand(),
			new RemoveFromNicknameCommand(),
			new ServerProfileHelpCommand(),
			new UnverifyFromServerCommand()
		]);

		this.commands.set("Bot Owner", [
			new ReconnectDBCommand(),
			new AdminProfileUpdaterCommand(),
			new BlacklistSuggestionUserCommand(),
			new UnblacklistSuggestionUserCommand(),
			new EnableDisableSuggestionsCommand(),
			new DeveloperTestCommand(),
			new LeaveServerCommand()
		]);

		this.commands.set("Logging", [
			new LogRunsCommand(),
			new CheckQuotaCommand(),
			new LogPoppedKeysCommand(),
			new LogRuneWCCommand(),
			new LogVialCommand(),
			new QuickLogAssistCommand(),
			new QuickLogMainRlCommand(),
			new QuickLogFailCommand()
		])

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