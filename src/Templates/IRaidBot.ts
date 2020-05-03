import { INetworkBlacklistedUser } from "../Definitions/IBlacklistedUser";

/**
 * The bot settings. Only NETWORK ADMINS will be able to modify. There should only be ONE ENTRY.
 */
export interface IRaidBot {
    /**
     * The bot ID.
     */
    botId: string;

    /**
     * All channels. Unlike the other DB types (guild, user), the bot will check ALL servers for the channel, not just one channel.
     */
    channels: {
        /**
         * This channel is where any requests for an alternative account to be removed will be sent.
         */
        altAccountRemovalChannel: string;
        
        /**
         * This channel is where all blacklists will be logged.
         */
        networkBlacklistLogs: string;

        /**
         * Staff announcements channel -- any messages sent here will be sent out to all servers.
         */
        staffAnnouncementsChannel: string;
    };

    moderation: {
        networkBlacklisted: INetworkBlacklistedUser[];
    }
}