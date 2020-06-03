import { PRIVATE_BOT, APIUrl } from "../Configuration/Config";

/**
 * RealmEye API to use. 
 */
export const RealmEyeAPILink: string = PRIVATE_BOT 
    ? APIUrl
    : "https://nightfirec.at/realmeye-api/?player=";  

/**
 * The default prefix for the bot.
 */
export const DefaultPrefix: string = ";";

/**
 * How long notification embeds should last before they are deleted. This should be in milliseconds.
 */
export const DeleteEmbedTime: number = 5000;