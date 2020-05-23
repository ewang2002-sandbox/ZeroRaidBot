import { ColorResolvable } from "discord.js";

/**
 * Configuration Interface. Do not alter unless you know what you are doing.
 */
export interface IConfigurationSettings {
    /**
     * The token for the bot.
     * @type {string}
     */
    token: string;
    /**
     * URL that the bot will connect to.
     *  @type {string}
     */
    dbURL: string;
    /**
     * The database name to use for MongoDB.
     * 
     * @type {string} 
     */
    dbName: string;
    /**
     * The user collection name. 
     * 
     * @type {string} 
     */
    userCollectionName: string;
    /**
     * The guild collection name. 
     * 
     * @type {string}
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
}