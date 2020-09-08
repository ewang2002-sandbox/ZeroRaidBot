import { ColorResolvable } from "discord.js";

export interface IGameData { 
	/**
	 * The formal ID. 
	 */
	id: number; 

	/**
	 * The formal name of the dungeon.
	 */
	gameName: string; 

	/**
	 * The portal emoji ID.
	 */
	mainReactionId: string; 

	/**
	 * The emojis the bot will be displaying in the AFK message & reacting to.
	 */
	specialReactions: [string, string][];

	/**
	 * A picture of the game link.
	 */
	gameLogoLink: string;

	/**
	 * Picture(s) of the game link
	 */
	gameImageLink: string[];

	/**
	 * The color(s) associated with this dungeon.
	 */
    colors: ColorResolvable[];
    
    /**
     * Max VC size.
     */
    maxVcLimit: number;
}