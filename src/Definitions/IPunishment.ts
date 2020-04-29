export type PunishmentType = "SUSPENSION" | "MUTE";

export interface IPunishment {
	/**
	 * Time that this punishment was given.
	 */
	timeStarted: number;

	/**
	 * The total time needed for this punishment to go away.
	 * If the person leaves, the total time would be adjusted accordingly. 
	 */
	totalTime: number;

	/**
	 * The moderator. 
	 */
	moderator: string;

	/**
	 * The reason for the punishment.
	 */
	reasonForPunishment: string;

	/**
	 * The type of punishment. 
	 */
	punishmentType: PunishmentType;

	/**
	 * The person who received the punishment.
	 */
	user: string; 

	/**
	 * The roles the person had prior to being muted or suspended. 
	 * Useful for suspended users because you can easily replace the 
	 * Suspended role with all of the previous roles. 
	 */
	roles: string[]; 
}