export interface IBlacklistedUser {
	/**
	 * The in-game name of the person. This should be exactly as seen in Realm (i.e. not lowercase).
	 */
	inGameName: string;
	/**
	 * The reason for the blacklist.
	 */
	reason: string;
	/**
	 * The date and time that the blacklist occurred. 
	 */
	date: number;
	/**
	 * The in-game name of the moderator. This should be exactly as seen in Realm (i.e. not lowercase).
	 */
	moderator: string;
}

export interface INetworkBlacklistedUser extends IBlacklistedUser {
    /**
     * The ID of the guild that the person was blacklisted from.
     */
    guildId: string;

    /**
     * The name of the guild that the person was blacklisted from. 
     */
    guildName: string; 
}