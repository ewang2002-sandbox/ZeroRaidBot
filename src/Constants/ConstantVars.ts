import { BotConfiguration, PRIVATE_BOT } from "../Configuration/Config";

/**
 * How long notification embeds should last before they are deleted. This should be in milliseconds.
 */
export const DeleteEmbedTime: number = 5000;

/**
 * Bot version.
 */
export const BOT_VERSION: string = require("../../package.json").version; 