import { IRaidGuild } from "../Templates/IRaidGuild";
import { User, Guild, Message, MessageEmbed, TextChannel, GuildMember, MessageEmbedFooter, MessageAttachment, FileOptions, EmbedField, Collection, Emoji, EmojiResolvable } from "discord.js";
import { MongoDbHelper } from "./MongoDbHelper";
import { StringUtil } from "../Utility/StringUtil";
import { UserAvailabilityHelper } from "./UserAvailabilityHelper";
import { GenericMessageCollector } from "../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../Definitions/TimeUnit";
import { MessageUtil } from "../Utility/MessageUtil";
import { DateUtil } from "../Utility/DateUtil";
import { FastReactionMenuManager } from "../Classes/Reaction/FastReactionMenuManager";

export module ModMailHandler {
	// K = the mod that is responding
	// V = the person the mod is responding to. 
	export const CurrentlyRespondingToModMail: Collection<string, string> = new Collection<string, string>();

	/**
	 * Checks whether the person is already engaged in a modmail conversation. 
	 * @param discordId The Discord ID.
	 * @param guildDb The guild document.
	 */
	function isInThreadConversation(discordId: string, guildDb: IRaidGuild): boolean {
		return guildDb.properties.modMail.some(x => x.sender === discordId);
	}

	/**
	 * Checks whether modmail can be used in the server.
	 * @param guild The guild.
	 * @param guildDb The guild document.
	 */
	function canUseModMail(guild: Guild, guildDb: IRaidGuild): boolean {
		return guild.channels.cache.has(guildDb.generalChannels.modMailChannel);
	}

	/**
	 * Initiates modmail. I know, best description ever. :) 
	 * @param initiator The person responsible for this mod mail.
	 * @param message The message content.
	 */
	export async function initiateModMailContact(initiator: User, message: Message): Promise<void> {
		const selectedGuild: Guild | null = await chooseGuild(initiator);
		if (selectedGuild === null) {
			const errorEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(initiator, "RED")
				.setTitle("No Valid Servers")
				.setDescription("The servers you are in have not configured their moderation mail module yet. As such, there is no one to message.")
				.setFooter("No Servers Found!");
			await MessageUtil.send({ embed: errorEmbed }, initiator).catch(() => { });
			return;
		}
		const guildDb: IRaidGuild = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOne({ guildID: selectedGuild.id })) as IRaidGuild;

		if (guildDb.moderation.blacklistedModMailUsers.some(x => x.id === initiator.id)) {
			await message.react("⛔").catch(e => { });
			return;
		}

		await message.react("📧").catch(e => { });
		const modmailChannel: TextChannel = selectedGuild.channels.cache.get(guildDb.generalChannels.modMailChannel) as TextChannel;

		let attachments: string = "";
		let index: number = 0;
		for (let [id, attachment] of message.attachments) {
			if (index > 6) {
				break;
			}
			// [attachment](url) (type of attachment)
			attachments += `[Attachment ${index + 1}](${attachment.url}) (\`${attachment.url.split(".")[attachment.url.split(".").length - 1]}\`)\n`;
			++index;
		}

		const modMailEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(initiator, "RED")
			.setTimestamp()
			// so we can find the id 
			.setFooter(`${initiator.id} • Modmail Message`)
			// the content of the modmail msg
			.setDescription(message.content)
			// title -- ❌ means no responses
			.setTitle("❌ Modmail Entry");
		if (attachments.length !== 0) {
			modMailEmbed.addField("Attachments", attachments);
		}
		
		modMailEmbed.addField("Sender Information", `⇒ Mention: ${initiator}\n⇒ Tag: ${initiator.tag}\n⇒ ID: ${initiator.id}`)
			// responses -- any mods that have responded
			.addField("Last Response By", "None.")
		const modMailMessage: Message = await modmailChannel.send(modMailEmbed);
		// respond reaction
		await modMailMessage.react("📝").catch(() => { });
		// garbage reaction
		await modMailMessage.react("🗑️").catch(() => { });
		// blacklist
		await modMailMessage.react("🚫").catch(() => { });
	}

	/**
	 * Blacklists the author of amodmail message from using modmail.
	 * @param originalModMailMessage The message from the modmail channel.
	 * @param mod The moderator. 
	 * @param guildDb The guild doc.
	 */
	export async function blacklistFromModmail(originalModMailMessage: Message, mod: GuildMember, guildDb: IRaidGuild): Promise<void> {
		const oldEmbed: MessageEmbed = originalModMailMessage.embeds[0];
		const authorOfModmailId: string = ((oldEmbed.footer as MessageEmbedFooter).text as string).split("•")[0].trim();

		await originalModMailMessage.reactions.removeAll().catch(e => { });
		const confirmBlacklist: MessageEmbed = MessageUtil.generateBlankEmbed(mod.user)
			.setTitle("Blacklist From Modmail")
			.setDescription(`Are you sure you want to blacklist the user (with ID \`${authorOfModmailId}\`) from using modmail? He or she won't be notified.`)
			.setFooter("Confirmation");
		await originalModMailMessage.edit(confirmBlacklist).catch(e => { });
		const checkXReactions: EmojiResolvable[] = ["✅", "❌"];
		const resultantReaction: Emoji | "TIME_CMD" = await new FastReactionMenuManager(
			originalModMailMessage,
			mod,
			checkXReactions,
			1,
			TimeUnit.MINUTE
		).react();
		if (resultantReaction === "TIME_CMD" || resultantReaction.name === "❌") {
			await originalModMailMessage.edit(oldEmbed).catch(e => { });
			// respond reaction
			await originalModMailMessage.react("📝").catch(() => { });
			// garbage reaction
			await originalModMailMessage.react("🗑️").catch(() => { });
			// blacklist
			await originalModMailMessage.react("🚫").catch(() => { });
			return;
		}

		let wasAlreadyBlacklisted: boolean = false;
		const index: number = guildDb.moderation.blacklistedModMailUsers.findIndex(x => x.id === authorOfModmailId);
		if (index === -1) {
			await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: mod.guild.id }, {
				$push: {
					"moderation.blacklistedModMailUsers": {
						id: authorOfModmailId,
						mod: mod.displayName,
						time: new Date().getTime(),
						reason: "AUTO: Blacklisted from Modmail Control Panel."
					}
				}
			});
		}
		else {
			wasAlreadyBlacklisted = true;
		}

		if (wasAlreadyBlacklisted) {
			await originalModMailMessage.delete().catch(e => { });
			return;
		}

		const embedToReplaceOld: MessageEmbed = MessageUtil.generateBlankEmbed(mod.user)
			.setTitle("Blacklisted From Modmail")
			.setDescription(`The user with ID \`${authorOfModmailId}\` has been blacklisted from using modmail. This message will delete in 10 seconds.`)
			.setFooter("Blacklisted from Modmail.");
		await originalModMailMessage.edit(embedToReplaceOld)
			.then(x => x.delete({ timeout: 10000 }))
			.catch(e => { });

		const moderationChannel: TextChannel | undefined = mod.guild.channels.cache.get(guildDb.generalChannels.logging.moderationLogs) as TextChannel | undefined;

		if (typeof moderationChannel === "undefined") {
			return;
		}

		const modEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(mod.user)
			.setTitle("Blacklisted From Modmail")
			.setDescription(`⇒ **Blacklisted ID:** ${authorOfModmailId}\n⇒ **Moderator:** ${mod} (${mod.id})`)
			.addField("⇒ Reason", "AUTOMATIC: Blacklisted from Modmail Control Panel.")
			.setFooter("Blacklisted from Modmail.");
		await moderationChannel.send(modEmbed).catch(e => { });
	}

	/**
	 * Allows a person to respond to a modmail message. 
	 * @param originalModMailMessage The message from the mod mail channel that the person is going to respond to.
	 * @param memberThatWillRespond The person that will be responding to the modmail sender/initator. 
	 */
	export async function respondToModmail(originalModMailMessage: Message, memberThatWillRespond: GuildMember): Promise<void> {
		// no permission
		if (memberThatWillRespond.guild.me !== null && !memberThatWillRespond.guild.me.hasPermission("MANAGE_CHANNELS")) {
			return;
		}

		// get old embed + prepare
		const oldEmbed: MessageEmbed = originalModMailMessage.embeds[0];
		const authorOfModmailId: string = ((oldEmbed.footer as MessageEmbedFooter).text as string).split("•")[0].trim();

		const originalModMailContent: string = typeof originalModMailMessage.embeds[0].description === "undefined"
			? ""
			: originalModMailMessage.embeds[0].description;

		let authorOfModmail: GuildMember;

		try {
			authorOfModmail = await memberThatWillRespond.guild.members.fetch(authorOfModmailId);
		}
		catch (e) {
			const noUserFoundEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(memberThatWillRespond.user)
				.setTitle("User Not Found")
				.setDescription("The person you were trying to find wasn't found. The person may have left the server. This modmail entry will be deleted in 10 seconds.")
				.setFooter("Modmail");
			await originalModMailMessage.edit(noUserFoundEmbed)
				.then(x => x.delete({ timeout: 10 * 1000 }))
				.catch(() => { });
			return;
		}

		await originalModMailMessage.reactions.removeAll().catch(e => { });

		// make sure the modmail wasn't already responded to
		const indexOfLastResponse: number = oldEmbed.fields.findIndex(x => x.name === "Last Response By");
		if (indexOfLastResponse === -1) {
			return;
		}
		else if (oldEmbed.fields[indexOfLastResponse].value !== "None.") {
			const confirmWantToRespond: MessageEmbed = MessageUtil.generateBlankEmbed(memberThatWillRespond.user)
				.setTitle("Respond to Modmail")
				.setDescription("This modmail entry has already been answered. Are you sure you want to answer this?")
				.setFooter("Confirmation");
			await originalModMailMessage.edit(confirmWantToRespond).catch(e => { });
			const checkXReactions: EmojiResolvable[] = ["✅", "❌"];
			const resultantReaction: Emoji | "TIME_CMD" = await new FastReactionMenuManager(
				originalModMailMessage,
				memberThatWillRespond,
				checkXReactions,
				1,
				TimeUnit.MINUTE
			).react();
			if (resultantReaction === "TIME_CMD" || resultantReaction.name === "❌") {
				await originalModMailMessage.edit(oldEmbed).catch(e => { });
				// respond reaction
				await originalModMailMessage.react("📝").catch(() => { });
				// garbage reaction
				await originalModMailMessage.react("🗑️").catch(() => { });
				// blacklist
				await originalModMailMessage.react("🚫").catch(() => { });
				return;
			}
		}

		CurrentlyRespondingToModMail.set(memberThatWillRespond.id, authorOfModmailId);

		const attachments: EmbedField | undefined = oldEmbed.fields.find(x => x.name === "Attachments");
		const senderInfo: string = (oldEmbed.fields.find(x => x.name === "Sender Information") as EmbedField).value;

		const noUserFoundEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(memberThatWillRespond.user)
			.setTitle("📝 Response In Progress")
			.setDescription(originalModMailContent)
			.setFooter("Modmail In Progress!");
		if (typeof attachments !== "undefined") {
			noUserFoundEmbed.addField(attachments.name, attachments.value);
		}
		noUserFoundEmbed.addField("Sender Info", senderInfo)
			.addField("Current Responder", `${memberThatWillRespond}: \`${DateUtil.getTime()}\``);

		await originalModMailMessage.edit(noUserFoundEmbed);

		// create channel
		const responseChannel: TextChannel = await memberThatWillRespond.guild.channels.create(`respond-${authorOfModmail.user.username}`, {
			type: "text",
			permissionOverwrites: [
				{
					id: memberThatWillRespond.guild.roles.everyone,
					deny: ["VIEW_CHANNEL"]
				},
				{
					id: memberThatWillRespond,
					allow: ["VIEW_CHANNEL"]
				},
				{
					// when is this null
					id: memberThatWillRespond.guild.me as GuildMember,
					allow: ["VIEW_CHANNEL"]
				}
			]
		});

		// function declaration that returns embed that
		// contains response
		function getRespEmbed(resp: string, anony: boolean): MessageEmbed {
			const e: MessageEmbed = MessageUtil.generateBlankEmbed(memberThatWillRespond.user)
				.setTitle("Your Response")
				.setDescription(resp === "" ? "N/A" : resp)
				.setFooter("Modmail Response System")
				.addField("Instructions", `Please respond to the above message by typing a message here. When you are finished, simply send it here. You will have 10 minutes. You are not able to send images or attachments directly.\n⇒ React with ✅ once you are satisfied with your response above. This will send the message.\n⇒ React with ❌ to cancel this process.\n⇒ React with 👀 to either show or hide your identity to the person that sent the modmail message. **Identity:** ${anony ? "Private" : "Public"}`);

			return e;
		}

		const introEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(memberThatWillRespond.user)
			.setTimestamp()
			.setTitle("Modmail: Respond")
			.setFooter(`Modmail Response System`)
			.setDescription(originalModMailContent)
		if (typeof attachments !== "undefined") {
			introEmbed.addField("Attachments", attachments.value);
		}
		introEmbed.addField("Sender Information", senderInfo);

		const introMsg: Message = await responseChannel.send(memberThatWillRespond, {
			embed: introEmbed
		});
		await introMsg.pin().catch(() => { });

		let responseToMail: string = "";
		let anonymous: boolean = true;

		let botMsg: Message | null = null;
		let hasReactedToMessage: boolean = false;
		while (true) {
			const responseEmbed: MessageEmbed = getRespEmbed(responseToMail, anonymous);

			if (botMsg === null) {
				botMsg = await responseChannel.send(responseEmbed);
			}
			else {
				// this should be awaitable, right? 
				botMsg = await botMsg.edit(responseEmbed);
			}

			const response: Message | Emoji | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<Message>(
				memberThatWillRespond,
				{ embed: responseEmbed },
				10,
				TimeUnit.MINUTE,
				responseChannel
			).sendWithReactCollector(GenericMessageCollector.getPureMessage(responseChannel), {
				reactions: ["✅", "❌", "👀"],
				cancelFlag: "--cancel",
				reactToMsg: !hasReactedToMessage,
				deleteMsg: false,
				removeAllReactionAfterReact: false,
				oldMsg: botMsg
			});

			if (hasReactedToMessage) {
				hasReactedToMessage = !hasReactedToMessage;
			}

			if (response instanceof Emoji) {
				if (response.name === "❌") {
					await originalModMailMessage.edit(oldEmbed).catch(() => { });
					await originalModMailMessage.react("📝").catch(() => { });
					await originalModMailMessage.react("🗑️").catch(() => { });
					await originalModMailMessage.react("🚫").catch(() => { });
					await responseChannel.delete().catch(() => { });
					CurrentlyRespondingToModMail.delete(memberThatWillRespond.id);
					return;
				}
				else if (response.name === "👀") {
					anonymous = !anonymous;

				}
				else {
					if (responseToMail.length !== 0) {
						break;
					}
				}
			}
			else {
				if (response === "CANCEL_CMD" || response === "TIME_CMD") {
					await botMsg.delete().catch(() => { });
					return;
				}

				if (response.content.length !== 0) {
					responseToMail = response.content;
				}
			}
		}

		const replyEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(anonymous ? memberThatWillRespond.guild : memberThatWillRespond.user)
			.setTitle("Modmail Response")
			.setDescription(responseToMail)
			.addField("Original Message", originalModMailContent.length === 0 ? "N/A" : (originalModMailContent.length > 1012 ? originalModMailContent.substring(0, 1000) + "..." : originalModMailContent))
			.setFooter("Modmail Response");

		await authorOfModmail.send(replyEmbed).catch(e => { });
		await responseChannel.delete().catch(() => { });
		CurrentlyRespondingToModMail.delete(memberThatWillRespond.id);
		oldEmbed.fields.splice(oldEmbed.fields.findIndex(x => x.name === "Last Response By"), 1);
		oldEmbed.addField("Last Response By", `${memberThatWillRespond} (${DateUtil.getTime()})`);
		await originalModMailMessage.edit(oldEmbed.setTitle("✅ Modmail Entry").setColor("GREEN"));
		await originalModMailMessage.react("📝").catch(() => { });
		await originalModMailMessage.react("🗑️").catch(() => { });
		await originalModMailMessage.react("🚫").catch(() => { });
	}

	/**
	 * Selects a guild for modmail. 
	 * @param user The user that initated this.
	 */
	async function chooseGuild(user: User): Promise<Guild | null> {
		const guildsToChoose: Guild[] = [];

		const allGuilds: IRaidGuild[] = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.find({}).toArray();
		for (const [id, guild] of user.client.guilds.cache) {
			const index: number = allGuilds.findIndex(x => x.guildID === id);
			if (index === -1) {
				continue;
			}

			if (guild.members.cache.has(user.id)
				&& guild.roles.cache.has(allGuilds[index].roles.raider)
				&& guild.channels.cache.has(allGuilds[index].generalChannels.modMailChannel)) {
				guildsToChoose.push(guild);
			}
		}

		if (guildsToChoose.length === 0) {
			return null;
		}

		if (guildsToChoose.length === 1) {
			return guildsToChoose[0];
		}

		const selectedGuild: Guild | "CANCEL" = await new Promise(async (resolve) => {
			const embed: MessageEmbed = new MessageEmbed()
				.setAuthor(user.tag, user.displayAvatarURL())
				.setTitle("Select Server")
				.setDescription("The message sent above will be sent to a designated server of your choice. Please select the server by typing the number corresponding to the server that you want to. To cancel, please type `cancel`.")
				.setColor("RANDOM")
				.setFooter(`${guildsToChoose.length} Servers.`);
			const arrFieldsContent: string[] = StringUtil.arrayToStringFields<Guild>(guildsToChoose, (i, elem) => `\`[${i + 1}]\` ${elem.name}\n`);
			for (const elem of arrFieldsContent) {
				embed.addField("Possible Guilds", elem);
			}

			UserAvailabilityHelper.InMenuCollection.set(user.id, UserAvailabilityHelper.MenuType.PRE_MODMAIL);

			const numSelected: number | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<number>(
				user,
				{ embed: embed },
				5,
				TimeUnit.MINUTE,
				user
			).send(GenericMessageCollector.getNumber(user, 1, arrFieldsContent.length));

			if (numSelected === "CANCEL_CMD" || numSelected === "TIME_CMD") {
				resolve("CANCEL");
			}
			else {
				resolve(guildsToChoose[numSelected - 1]);
			}
			UserAvailabilityHelper.InMenuCollection.delete(user.id)
		});

		return selectedGuild === "CANCEL" ? null : selectedGuild;
	}
}