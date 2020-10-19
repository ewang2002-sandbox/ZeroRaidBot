import { Message, MessageEmbed, ColorResolvable, MessageOptions, MessageAttachment, PartialTextBasedChannelFields, User, Guild, PartialUser, APIMessageContentResolvable, MessageAdditions } from "discord.js";

export namespace MessageUtil {
	/**
	 * The types of possible tags. 
	 */
	type Tag = "INVALID_NUMBER_INPUT"
		| "INVALID_INPUT_NO_CHOICE"
		| "INVALID_CHOICE_CHOICE"
		| "INVALID_INVITE_INPUT"
		| "NO_MENTIONS_FOUND"
		| "NO_CHANNELS_FOUND"
		| "NO_CHAN_PERMISSIONS"
		| "NO_NEGATIVE_NUMBER"
		| "NO_ZERO_NUMBER"
		| "INVALID_ID"
		| "NO_USERS_FOUND"
		| "NO_USER_FOUND_GENERAL"
		| "NOT_IN_VC"
		| "MSG_TOO_LONG"
		| "NOT_ENABLED"
		| "NO_ROLE_FOUND"
		| "NOT_A_RAID_VC"
		| "NOT_AFK_CHECK"
		| "NOT_IN_RUN"
		| "NO_END_DUE_TO_POST_AFK"
		| "MONGO_ERROR"
		| "NOT_TEXT_CHANNEL"
		| "NO_RESOLVABLE_USER"
		| "NO_CATEGORY"
		| "DEFAULT"
		| "INVALID_INDEX"
		| "MAX_LIMIT_REACHED"
		| "CATEGORY_MISMATCH"
		| "ROLE_NOT_FOUND_DB"
		| "NO_INPUT"
		| "DM_NOT_OPEN"
		| "ROLE_HIERARCHY_ERROR"
		| "SAME_PERSON_AS_AUTHOR"
		| "ROLE_IN_USE"
		| "NO_DB_ENTRY_FOUND"
		| "NO_MEMBER_FOUND";

	type EmbedSettings = {
		authorType: "GUILD" | "AUTHOR" | { name: string, imageUrl?: string };
		embedColor?: ColorResolvable;
		footer?: { name: string, imageUrl?: string };
		includeTimestamp?: boolean;
	};

	/**
	 * Finds a message embed based on the tag.
	 * @param {Message} message The message.
	 * @param {string} tag The tag to look for.
	 * @param {EmbedSettings} settings Settings for the embed. 
	 * @param {string[]} [misc] Any extra arguments.
	 * @returns {RichEmbed}
	 * @static
	 */
	export function generateBuiltInEmbed(message: Message, tag: Tag, settings: EmbedSettings | null, ...misc: string[]): MessageEmbed {
		const embed: MessageEmbed = new MessageEmbed();

		// use default settings if none are set. 
		if (settings === null) {
			embed.setAuthor(message.author.tag, message.author.displayAvatarURL());
			embed.setColor("RED")
			embed.setFooter(message.guild === null ? "Private Messages" : message.guild.name)
			embed.setTimestamp();
		}
		else {
			// setting embed author 
			if (settings.authorType === "GUILD") {
				if (message.guild !== null) {
					if (typeof message.guild.iconURL() !== "undefined") {
						embed.setAuthor(message.guild.name, message.guild.iconURL() as string);
					}
					else {
						embed.setAuthor(message.guild.name);
					}
				}
			}
			else if (settings.authorType === "AUTHOR") {
				embed.setAuthor(message.author.tag, message.author.displayAvatarURL());
			}
			else {
				embed.setAuthor(settings.authorType.name, settings.authorType.imageUrl);
			}

			// color 
			if (typeof settings.embedColor === "undefined") {
				embed.setColor("RED");
			}
			else {
				embed.setColor(settings.embedColor);
			}

			// footer
			if (typeof settings.footer === "undefined") {
				embed.setFooter(message.guild === null ? "Private Messages" : message.guild.name);
			}
			else {
				embed.setFooter(settings.footer.name, settings.footer.imageUrl);
			}

			// timestamp 
			if (typeof settings.includeTimestamp !== "undefined" && settings.includeTimestamp) {
				embed.setTimestamp();
			}
		}

		switch (tag) {
			// invalid input
			case ("INVALID_NUMBER_INPUT"): {
				embed.setTitle("Invalid Number Input");
				embed.setDescription("Please input a valid number.");
				break;
			}
			case ("INVALID_INPUT_NO_CHOICE"): {
				embed.setTitle("Invalid Input");
				embed.setDescription(`The choice selected is invalid. Try again.`);
				break;
			}
			case ("INVALID_CHOICE_CHOICE"): {
				embed.setTitle("Invalid Input");
				embed.setDescription(`Please input a valid choice. Valid choices are: \`${misc.join(", ")}\`.`);
				break;
			}
			case ("INVALID_INVITE_INPUT"): {
				embed.setTitle("Invalid Invite Input");
				embed.setDescription("You did not input a valid invite link or code. Try a different link or code, or ensure the invite was correctly typed.");
				break;
			}
			case ("NO_CHANNELS_FOUND"): {
				embed.setTitle("No Channels Found");
				embed.setDescription("You did not mention a channel. Please be sure you mention the channel you want to use.");
				break;
			}
			case ("NOT_TEXT_CHANNEL"): {
				embed.setTitle("Not a Text Channel");
				embed.setDescription("You did not provide a text channel. Please input a resolvable text channel.");
				break;
			}
			case ("NO_CHAN_PERMISSIONS"): {
				embed.setTitle("No Permissions");
				embed.setDescription(`The channel you specified does not grant certain permissions for me. I need the following permissions: ${misc.join(", ")}`);
				break;
			}
			case ("NO_NEGATIVE_NUMBER"): {
				embed.setTitle("No Negative Numbers Allowed")
				embed.setDescription("You cannot input a negative number. Please try again.");
				break;
			}
			case ("NO_ZERO_NUMBER"): {
				embed.setTitle("No Zeros Allowed");
				embed.setDescription("You cannot input zero as a number choice. Please try again.");
				break;
			}
			case ("INVALID_ID"): {
				embed.setTitle("Invalid ID Given");
				embed.setDescription(`Please input a valid ${misc[0]} ID.`);
				break;
			}
			case ("NOT_IN_VC"): {
				embed.setTitle("Not In Voice Channel")
				embed.setDescription("You must be in a voice channel. Please join one and try again!");
				break;
			}
			case ("MSG_TOO_LONG"): {
				embed.setTitle("Too Long!");
				embed.setDescription(`Your ${misc[0]} is too long to process. The maximum amount of characters allowed is ${misc[1]} characters.`);
				break;
			}
			case ("NOT_ENABLED"): {
				embed.setTitle("Not Enabled!");
				embed.setDescription(`The service, \`${misc[0]}\`, is not enabled at this time. Please try again later, or enable it if you have the permissions.`);
				break;
			}
			case ("NO_ROLE_FOUND"): {
				embed.setTitle("Invalid Role Inputted");
				embed.setDescription("Please input a valid role ID or mention.");
				break;
			}
			case ("NOT_A_RAID_VC"): {
				embed.setTitle("No Raiding Channel Found")
				embed.setDescription("This voice channel doesn't seem to be a raiding channel. Try again!");
				break;
			}
			case ("NOT_AFK_CHECK"): {
				embed.setTitle("In Raid")
				embed.setDescription("This channel is currently in raid; there is no active AFK check.");
				break;
			}
			case ("NOT_IN_RUN"): {
				embed.setTitle("Not In Raid")
				embed.setDescription("This channel does not appear to be in a raid currently. Make sure the raid status associated with the voice channel is in raid mode.");
				break;
			}
			case ("NO_END_DUE_TO_POST_AFK"): {
				embed.setTitle("Pending Post-AFK Check")
				embed.setDescription("You cannot end this raid until the Post-AFK check is complete.");
				break;
			}
			case ("MONGO_ERROR"): {
				embed.setTitle("MongoDB Error");
				embed.setDescription("There was a problem with MongoDB at this time. Please try again later.");
				break;
			}
			// no user ign 
			case ("NO_USERS_FOUND"): {
				embed.setTitle("No Users Found")
				embed.setDescription(`I could find a user by the ${misc[0]} \`${misc[1]}\`.`)
				break;
			}
			case ("NO_USER_FOUND_GENERAL"): {
				embed.setTitle("No User Found")
				embed.setDescription(`I could find a user with the mention or ID of \`${misc[0]}\`.`)
				break;
			}
			case ("NO_MENTIONS_FOUND"): {
				embed.setTitle("No Mentions Found");
				embed.setDescription("You did not @Mention anyone. Please be sure you mentioned someone.");
				break;
			}
			case ("NO_RESOLVABLE_USER"): {
				embed.setTitle("No Resolvable User Found");
				embed.setDescription("I could not find a verified member based on your query. Please try again.");
				break;
			}
			case ("NO_CATEGORY"): {
				embed.setTitle("No Bound Category");
				embed.setDescription("The channel selected does not have a category. Find a channel that has a parent and try again.");
				break;
			}
			case ("CATEGORY_MISMATCH"): {
				embed.setTitle("Category Mismatch");
				embed.setDescription("The channels selected have different categories. Ensure the channels you selected have the same category and try again.");
				break;
			}
			case ("INVALID_INDEX"): {
				embed.setTitle("Invalid Index");
				embed.setDescription("You did not provide a valid number. Please pick a valid number.");
				break;
			}
			case ("DEFAULT"): {
				break;
			}
			case ("MAX_LIMIT_REACHED"): {
				embed.setTitle("Maximum Limit Reached");
				embed.setDescription(`You have reached the maximum limit for this operation. The maximum is ${misc[0]}`);
				break;
			}
			case ("ROLE_NOT_FOUND_DB"): {
				embed.setTitle("Registered Role Not Resolvable");
				embed.setDescription(`The \`${misc[0]}\` role is not available at the moment. Ask an administrator to re-register this role.`);
				break;
			}
			case ("ROLE_HIERARCHY_ERROR"): {
				embed.setTitle("Role Hierarchy Error");
				embed.setDescription("The role you selected is equal or higher than (position-wise) the highest role I have. Select a role that is lower than my highest role.");
				break;
			}
			case ("NO_INPUT"): {
				embed.setTitle("No Input Detected");
				embed.setDescription("You did not provide any input. Perhaps you uploaded an attachment?");
				break;
			}
			case ("DM_NOT_OPEN"): {
				embed.setTitle("Cannot DM You");
				embed.setDescription("I was unable to direct message you. Make sure you didn't block me and that your privacy settings on the server are set so you can receive DMs from members.");
				break;
			}
			case ("SAME_PERSON_AS_AUTHOR"): {
				embed.setTitle("Same Target Person");
				embed.setDescription("You are trying to execute the action on yourself. Try a different person.");
				break;
			}
			case ("ROLE_IN_USE"): {
				embed.setTitle("Role In Use");
				embed.setDescription("This role is already in use. Please try again.");
				break;
			}
			case ("NO_MEMBER_FOUND"): {
				embed.setTitle("No Member Found");
				embed.setDescription("I was unable to find the member you specified. Please ensure the mention, in-game name, or ID of the target member is correct.");
				break;
			}
			case ("NO_DB_ENTRY_FOUND"): {
				embed.setTitle("Database Entry Not Found!");
				embed.setDescription("I could not find a database entry corresponding to the Discord ID or in-game name provided. You may have to ask an administrator to create a profile for the person. Please try again.");
				break;
			}
		}

		return embed;
	}

	/**
	 * Sends a message to a channel, automatically taking care of automatic message deletion.
	 * @param {MessageOptions} info The options for the message (e.g. content, embed). 
	 * @param {PartialTextBasedChannelFields} channel The channel to send the message to.  
	 * @param {number} [timeout] How long until the bot deletes the message, in ms. 
	 * @returns {Promise<Message>} The message that was sent.  
	 */
	export async function send(
		info:  APIMessageContentResolvable | (MessageOptions & { split?: false }) | MessageAdditions,
		channel: PartialTextBasedChannelFields,
		timeout: number = 5000
	): Promise<Message> {
		return await channel.send(info).then(x => x.delete({ timeout: timeout }));
	}

	/**
	 * Generates a blank embed. 
	 * @param {(User | Guild)} obj The user or guild.
	 * @param {ColorResolvable} [color = "RANDOM"] The color of the embed.
	 */
	export function generateBlankEmbed(obj: User | Guild, color: ColorResolvable = "RANDOM"): MessageEmbed {
		const embed: MessageEmbed =  new MessageEmbed()
			.setTimestamp()
			.setColor(color);

		if (obj instanceof User) {
			embed.setAuthor(obj.tag, obj.displayAvatarURL());
		}
		else {
			const iconUrl: string | null = obj.iconURL();
			if (iconUrl === null) {
				embed.setAuthor(obj.name);
			}
			else {
				embed.setAuthor(obj.name, iconUrl);
			}
		}
		
		return embed;
	}
}