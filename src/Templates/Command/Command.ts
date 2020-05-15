import { CommandDetail } from "./CommandDetail";
import { CommandPermission } from "./CommandPermission";
import { Message, PermissionResolvable } from "discord.js";
import { IRaidGuild } from "../IRaidGuild";
import { RoleNames, LeaderPermType } from "../../Definitions/Types";

export abstract class Command {
	/**
	 * The details of the command. This is the "backbone" of the `Command` structure.
	 */
	private _commandDetails: CommandDetail;

	/**
	 * Permissions that is required to execute this command.
	 */
	private _commandPermissions: CommandPermission;

	/**
	 * Whether the command can be run in a guild only. 
	 */
	private _guildOnly: boolean;

	/**
	 * Whether the server owner is the only one that can run this command. 
	 */
	private _serverOwnerOnly: boolean;

	/**
	 * Whether the bot owner is the only one that can run this command. 
	 */
	private _botOwnerOnly: boolean;

	/**
	 * This class represents a command, which is essentially a "feature" that a bot is designed to do.
	 * @param {CommandDetail} commandDetails The command details.
	 * @param {CommandPermission} commandPermissions The command permissions.
	 * @param {boolean} guildOnly Whether the command can be run in a guild only. 
	 * @param {boolean} serverOwnerOnly Whether the server owner is the only one that can run this command. 
	 * @param {boolean} botOwnerOnly Whether the bot owner is the only one that can run this command. 
	 */
	protected constructor(
		commandDetails: CommandDetail,
		commandPermissions: CommandPermission,
		guildOnly: boolean,
		serverOwnerOnly: boolean,
		botOwnerOnly: boolean
	) {
		this._commandDetails = commandDetails;
		this._commandPermissions = commandPermissions;
		this._guildOnly = guildOnly;
		this._serverOwnerOnly = serverOwnerOnly;
		this._botOwnerOnly = botOwnerOnly;
	}

	/**
	 * Gets the main command name (in other words, how a user should primarily call this command).
	 * @returns {string} The main command name.
	 */
	public getMainCommandName(): string {
		return this._commandDetails.getMainCommandName();
	}

	/**
	 * Gets the command aliases. If no aliases are defined, this will return an empty array.
	 * @returns {string[]} The aliases for this command.
	 */
	public getAliases(): string[] {
		return this._commandDetails.getAliases();
	}

	/**
	 * Gets the description of the command (information about the command).
	 * @returns {string} The description of the command. 
	 */
	public getDescription(): string {
		return this._commandDetails.getDescription();
	}

	/**
	 * Gets the usages for the command.
	 * @returns {string[]} The command usages. 
	 */
	public getUsage(): string[] {
		return this._commandDetails.getUsage();
	}

	/**
	 * Gets the examples of how to use the command.
	 * @returns {string[]} Examples of command usage. 
	 */
	public getExamples(): string[] {
		return this._commandDetails.getExamples();
	}

	/**
	 * Gets the number of required arguments.
	 * @returns {number} The number of required arguments. 
	 */
	public getArgumentLength(): number {
		return this._commandDetails.getArgumentLength();
	}

	/**
	 * Returns the formal, human-readable, command name.
	 * @returns {string} The formal, human-readable, command name.
	 */
	public getFormalCommandName(): string {
		return this._commandDetails.getFormalCommandName();
	}

	/**
	 * Returns the general permissions that the user has to have in order to execute the command. This will take priority over `rolePermissions`. 
	 * @returns {PermissionResolvable[]} The general permissions that the user has to have in order to execute the command. 
	 */
	public getGeneralPermissions(): PermissionResolvable[] {
		return this._commandPermissions.getGeneralPermissions();
	}

	/**
	 * Returns the permissions that the bot must have in order to execute the command. 
	 * @returns {PermissionResolvable[]} The permissions that the bot must have in order to execute the command. 
	 */
	public getBotPermissions(): PermissionResolvable[] {
		return this._commandPermissions.getBotPermissions();
	}

	/**
	 * Returns the list of roles that can use this command.
	 * @returns {RoleNames[]} The list of roles that can use this command.
	 */
	public getRolePermissions(): RoleNames[] {
		return this._commandPermissions.getRolePermissions();
	}

	/**
	 * Returns whether the command can be used by higher roles (higher than the highest listed role in `rolePermissions`).
	 * @returns {boolean} Whether the command can be used by higher roles (higher than the highest listed role in `rolePermissions`).
	 */
	public isRoleInclusive(): boolean {
		return this._commandPermissions.isRoleInclusive();
	}

	/**
	 * Whether the command can only be used in a guild or not.
	 * @returns {boolean} Returns `true` if the command can only be used in a guild. `false` otherwise.
	 */
	public isGuildOnly(): boolean {
		return this._guildOnly;
	}

	/**
	 * Whether the bot owner is the only one that can run this command.
	 * @returns {boolean} Returns `true` if only the server owner can run this command. `false` otherwise. 
	 */
	public isServerOwnerOnly(): boolean {
		return this._serverOwnerOnly;
	}

	/**
	 * Whether the bot owner is the only one that can run this command. 
	 * @returns {boolean} Returns `true` if only the bot owner can run this comand. `false` otherwise. 
	 */
	public isBotOwnerOnly(): boolean {
		return this._botOwnerOnly;
	}

	/**
	 * Which other non-universal RLs can use this command.
	 * @returns {LeaderPermType[]} 
	 */
	public getSecRLAccountType(): LeaderPermType[] {
		return this._commandPermissions.sectionRLAccountType();
	}

	/**
	 * The implementation of the actual command.
	 * @param {Message} message The message object. 
	 * @param {string[]} args The arguments. 
	 * @param {IRaidGuild | null} guildData The guild data.
	 */
	public async abstract executeCommand(message: Message, args: string[], guildData: IRaidGuild | null): Promise<void>;
}