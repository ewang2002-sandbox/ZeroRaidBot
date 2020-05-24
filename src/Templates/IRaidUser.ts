import { IKeyPops, IVoidVials, IWineCellarOryx, ICompletedRuns, ILeaderRuns } from "../Definitions/UserDBProps";

/**
 * This interface (and associated schema) will be using IGNs instead of Discord ID.
 */
export interface IRaidUser {
	/**
	 * Discord User ID.
	 */
	discordUserId: string;

	/**
	 * The name that is actually shown (for example, "TeStInG").
	 * This represents a player's MAIN account. 
	 */
	rotmgDisplayName: string;

	/**
	 * `rotmgDisplayName` but all lowercase (for example, "testing").
	 * This property will be used for searching names up in the database.
	 */
	rotmgLowercaseName: string;

	/**
	 * Any other RotMG names associated with the main name.
	 */
	otherAccountNames: {
		displayName: string;
		lowercase: string;
	}[];

	/**
	 * The time that the person's information was modified.
	 */
	lastModified: number;

	/**
	 * General properties.
	 */
	general: {
		/**
		 * Amount of keys popped for this server.
		 */
		keyPops: IKeyPops[];

		/**
		 * Information on vials.
		 */
		voidVials: IVoidVials[];

		/**
		 * Wine Cellar-related stuffs.
		 */
		wcOryx: IWineCellarOryx[];

		/**
		 * Total completed runs.
		 */
		completedRuns: ICompletedRuns[];

		/**
		 * Leader runs
		 */
		leaderRuns: ILeaderRuns[];

		/**
		 * Moderation history from all servers.
		 */
		moderationHistory: {
			server: string; // the server id
			date: number; // exact time in ms 
			type: string; // moderation type 
			moderator: string; // id 
			reason: string; // reason for mod 
			time: number; // duration, if any.
			notes: string;
		}[];
	}
}