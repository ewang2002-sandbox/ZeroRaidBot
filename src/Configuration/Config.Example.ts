import { IConfigurationSettings } from "./IConfigurationSettings";

/**
 * True -- uses production settings.
 * False -- uses testing settings.
 */
const PRODUCTION_BOT: boolean = false;

export const BotConfiguration: IConfigurationSettings = PRODUCTION_BOT
    ? {
        token: "",
        dbURL: "",
        dbName: "",
        userCollectionName: "",
        guildCollectionName: "",
        botCollectionName: "",
        botOwners: [],
        botColors: []
    } : {
        token: "",
        dbURL: "",
        dbName: "",
        userCollectionName: "",
        guildCollectionName: "",
        botCollectionName: "",
        botOwners: [],
        botColors: []
    };

/**
 * The default prefix for the bot.
 */
export const DefaultPrefix: string = ";";

/**
 * How long notification embeds should last before they are deleted. This should be in milliseconds.
 */
export const DeleteEmbedTime: number = 5000;