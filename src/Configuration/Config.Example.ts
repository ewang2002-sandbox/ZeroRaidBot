import { IConfigurationSettings } from "./IConfigurationSettings";

/**
 * True -- uses production settings.
 * False -- uses testing settings.
 */
const PRODUCTION_BOT: boolean = true;

/**
 * True -- use private settings.
 * False -- use public settings.
 * 
 * UNLESS you are using the official version of the bot, this should be FALSE.
 */
export const PRIVATE_BOT: boolean = false;

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

/**
 * Private RealmEye API URL. Don't fill this field out.
 */
export const APIUrl: string = "";