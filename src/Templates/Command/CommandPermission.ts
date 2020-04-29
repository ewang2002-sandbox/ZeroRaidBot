import { RoleNames } from "../../Definitions/Types";
import { PermissionResolvable } from "discord.js";

export class CommandPermission {
	/**
	 * Any general permissions that the user has to have in order to execute the command. This will take priority over `rolePermissions`. 
	 */
	private generalPermissions: PermissionResolvable[];
	
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
	 * The constructor for this class.
	 * @param {PermissionResolvable[]} generalPermissions Any general permissions that the user has to have in order to execute the command.
	 * @param {RoleNames[]} rolePermissions The list of roles that can use this command.
	 * @param {boolean} roleInclusive  Whether the command can be used by higher roles (higher than the highest listed role in `rolePermissions`).
	 */
	public constructor(
		generalPermissions: PermissionResolvable[],
		rolePermissions: RoleNames[],
		roleInclusive: boolean
	) {
		this.generalPermissions = generalPermissions;
		this.rolePermissions = rolePermissions;
		this.roleInclusive = roleInclusive;
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
}