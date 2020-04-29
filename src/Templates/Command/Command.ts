import { CommandDetail } from "./CommandDetail";
import { CommandPermission } from "./CommandPermission";
import { Client, Message } from "discord.js";
import { IRaidGuild } from "../IRaidGuild";

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
	 * Returns the details of the command. This is the "backbone" of the `Command` structure.
	 * @returns {CommandDetail} The details of the command.
	 */
	public getCommandDetails(): CommandDetail {
		return this._commandDetails;
	}

	/**
	 * Returns the permissions required to execute this command.
	 * @returns {CommandPermission} The permissions required to execute this command.
	 */
	public getCommandPermissions(): CommandPermission {
		return this._commandPermissions;
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
	 * The implementation of the actual command.
	 * @param {Message} message The message object. 
	 * @param {string[]} args The arguments. 
	 * @param {IRaidGuild | null} guildData The guild data.
	 */
	public async abstract executeCommand(message: Message, args: string[], guildData: IRaidGuild | null): Promise<void>;
}