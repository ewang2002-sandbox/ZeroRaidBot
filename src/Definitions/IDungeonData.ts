import { ColorResolvable } from "discord.js";

export interface IDungeonData { 
	/**
	 * The formal ID. 
	 */
	id: number; 

	/**
	 * The formal name of the dungeon.
	 */
	dungeonName: string; 

	/**
	 * The portal emoji ID.
	 */
	portalEmojiID: string; 

	/**
	 * The key emoji ID.
	 */
	keyEmojIDs: {
		keyEmojID: string;
		keyEmojiName: string;
	}[];

	/**
	 * The emojis the bot will be displaying in the AFK message & reacting to.
	 */
	reactions: string[];

	/**
	 * A picture of the portal (a link).
	 */
	portalLink: string;

	/**
	 * Picture(s) of the bosses and/or monsters of the dungeon.
	 */
	bossLink: string[];

	/**
	 * The color(s) associated with this dungeon.
	 */
	colors: ColorResolvable[];
}