import { ColorResolvable } from "discord.js";

/**
 * Configuration Interface. Do not alter unless you know what you are doing.
 */
export interface IConfigurationSettings {
    /**
     * The token for the bot.
     */
    token: string;
    /**
     * URL that the bot will connect to.
     */
    dbURL: string;
    /**
     * The database name to use for MongoDB.
     */
    dbName: string;
    /**
     * The user collection name. 
     */
    userCollectionName: string;
    /**
     * The guild collection name. 
     */
    guildCollectionName: string;
    /**
     * Bot settings collection name.
     */
    botCollectionName: string;
    /**
     * Bot owners.
     */
    botOwners: string[];
    /**
     * Colors for the bot.
     */
    botColors: ColorResolvable[];
    /**
     * Guilds that don't need a guild db.
     */
    exemptGuild: string[]; 

    /**
     * Private API.
     */
    privateApiLinks: {
        baseApi: string;
        pingOnline: string;
        parseEndpoint: string;
        realmEye: {
            playerBasics: string;
            petyard: string;
            graveyard: string;
            graveyardSummary: string;
            nameHistory: string;
            rankHistory: string;
            guildHistory: string;
            exaltations: string;
        };
    };
}