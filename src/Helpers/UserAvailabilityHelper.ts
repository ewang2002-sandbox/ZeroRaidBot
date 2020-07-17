import { Collection } from "discord.js";

export module UserAvailabilityHelper {
	/**
	 * Different types of "menus" that a person could be working with.
	 */
	export enum MenuType {
		/**
		 * The person is currently verifying for a server.
		 */
		VERIFICATION, 

		/**
		 * The person is currently in a modmail thread.
		 */
		MODMAIL_THREAD, 

		/**
		 * The person is currently working with the user profile.
		 * This could be adding an alternative account, removing one,
		 * etc. 
		 */
		USER_PROFILE,

		/**
		 * The person is currently working with server profile. 
		 */
		SERVER_PROFILE,

		/**
		 * Pre-modmail stuff (asking for guild, etc.)
		 */
		PRE_MODMAIL
	}

	/**
	 * This map will contain users that are currently engaged in a menu. This is useful
	 * in case the bot needs to interact with the person via DMs. 
	 * 
	 * For example, let's say the person is verifying in DMs. Let's also assume that
	 * you can send a message through modmail by DMing the bot. Obviously, you don't want 
	 * the person to send his or her IGN (or whatever else is needed for verification) to 
	 * modmail. Thus, this map will contain any users that are currently engaged in some
	 * sort of a menu. Check this collection to ensure the person isn't in a menu before
	 * doing anything else that requires DMs. 
	 * 
	 * The key is the user ID, and the value is the menu the person is in.
	 */
	export const InMenuCollection: Collection<string, MenuType> = new Collection<string, MenuType>();
}