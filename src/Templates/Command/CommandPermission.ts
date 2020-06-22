import { RoleNames, LeaderPermType } from "../../Definitions/Types";
import { PermissionResolvable } from "discord.js";

export class CommandPermission {
	/**
	 * Any general permissions that the user has to have in order to execute the command. This will take priority over `rolePermissions`. 
	 */
	private generalPermissions: PermissionResolvable[];

	/**
	 * All bot permissions needed to run the command.
	 */
	private botPermissions: PermissionResolvable[];
	
	/**
	 * The list of roles that can use this command.
	 */
	private rolePermissions: RoleNames[];

	/**
	 * Whether the command can be used by higher roles (higher than the highest listed role in `rolePermissions`).
	 * 
	 * If this is `true`, then there must only be ONE role in `rolePermissions`. 
	 */
	private roleInclusive: boolean;

	/**
	 * Which other non-universal RLs can use this command.
	 */
	private secRLType: LeaderPermType[];

	/**
	 * The constructor for this class.
	 * @param {PermissionResolvable[]} generalPermissions Any general permissions that the user has to have in order to execute the command.
	 * @param {PermissionResolvable[]} botPermissions Any general permissions that the bot has to have in order to run the command.
	 * @param {RoleNames[]} rolePermissions The list of roles that can use this command.
	 * @param {LeaderPermType} accountForSectionLeaderRoles Which other non-universal RLs can use this command.
	 * @param {boolean} roleInclusive  Whether the command can be used by higher roles (higher than the highest listed role in `rolePermissions`).
	 */
	public constructor(
		generalPermissions: PermissionResolvable[],
		botPermissions: PermissionResolvable[],
		rolePermissions: RoleNames[],
		secRLType: LeaderPermType[],
		roleInclusive: boolean
	) {
		this.generalPermissions = generalPermissions;
		this.botPermissions = botPermissions;
		this.rolePermissions = rolePermissions;
		this.roleInclusive = roleInclusive;
		this.secRLType = secRLType;
	}
	
	/**
	 * Returns the general permissions that the user has to have in order to execute the command. This will take priority over `rolePermissions`. 
	 * @returns {PermissionResolvable[]} The general permissions that the user has to have in order to execute the command. 
	 */
	public getGeneralPermissions(): PermissionResolvable[] {
		return this.generalPermissions;
	}

	/**
	 * Returns the list of roles that can use this command.
	 * @returns {RoleNames[]} The list of roles that can use this command.
	 */
	public getRolePermissions(): RoleNames[] { 
		return this.rolePermissions;
	}

	/**
	 * Returns whether the command can be used by higher roles (higher than the highest listed role in `rolePermissions`).
	 * @returns {boolean} Whether the command can be used by higher roles (higher than the highest listed role in `rolePermissions`).
	 */
	public isRoleInclusive(): boolean { 
		return this.roleInclusive;
	}

	/**
	 * Returns the permissions that the bot must have in order to execute the command. 
	 * @returns {PermissionResolvable[]} The permissions that the bot must have in order to execute the command. 
	 */
	public getBotPermissions(): PermissionResolvable[] {
		return this.botPermissions;
	}

	/**
	 * Which other non-universal RLs can use this command.
	 * @returns {LeaderType} 
	 */
	public sectionRLAccountType(): LeaderPermType[] {
		return this.secRLType;
	}
}