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
		keyPops: {
			server: string;
			keysPopped: number;
		}[];

		/**
		 * Information on vials.
		 */
		voidVials: {
			/**
			 * Amount of vials popped for this server.
			 */
			popped: number;

			/**
			 * Amount of vials stored for this server. 
			 */
			stored: number;

			/**
			 * server
			 */
			server: string;
		}[];

		/**
		 * Wine Cellar-related stuffs.
		 */
		wcRuns: {
			wcIncs: {
				amt: number;
				popped: number;
			};
			swordRune: {
				amt: number;
				popped: number;
			};
			shieldRune: {
				amt: number;
				popped: number;
			};
			helmRune: {
				amt: number;
				popped: number;
			};

			/**
			 * server
			 */
			server: string;
		}[];

		/**
		 * Total completed runs.
		 */
		completedRuns: {
			/**
			 * General dungeons (i.e. not endgame)
			 */
			general: number;

			/**
			 * Endgame dungeons. These are defined as 
			 * - Cult
			 * - Void
			 * - Fungal/Crystal Cavern
			 * - O3 (soon)
			 */
			endgame: number;

			/**
			 * server
			 */
			server: string;
		}[];

		leaderRuns: {
			/**
			 * General dungeons led
			 */
			general: number;

			/**
			 * Endgame dungeons led.
			 */
			endgame: number;

			/**
			 * server
			 */
			server: string;
		}[];

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
