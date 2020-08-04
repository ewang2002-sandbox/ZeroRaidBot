import { IRaidGuild } from "../Templates/IRaidGuild";
import { User, Guild, Message, MessageEmbed, TextChannel, GuildMember, MessageEmbedFooter, MessageAttachment, FileOptions, EmbedField, Collection, Emoji, EmojiResolvable, SystemChannelFlags, CategoryChannel } from "discord.js";
import { MongoDbHelper } from "./MongoDbHelper";
import { StringUtil } from "../Utility/StringUtil";
import { UserAvailabilityHelper } from "./UserAvailabilityHelper";
import { GenericMessageCollector } from "../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../Definitions/TimeUnit";
import { MessageUtil } from "../Utility/MessageUtil";
import { DateUtil } from "../Utility/DateUtil";
import { FastReactionMenuManager } from "../Classes/Reaction/FastReactionMenuManager";
import { createWriteStream, WriteStream } from "fs";
import { StringBuilder } from "../Classes/String/StringBuilder";
import { OtherUtil } from "../Utility/OtherUtil";
import { IModmailThread } from "../Definitions/IModMail";

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
		return guildDb.properties.modMail.some(x => x.originalModmailAuthor === discordId);
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

		if (!canUseModMail(selectedGuild, guildDb)) {
			return;
		}

		if (guildDb.moderation.blacklistedModMailUsers.some(x => x.id === initiator.id)) {
			await message.react("⛔").catch(e => { });
			return;
		}

		await message.react("📧").catch(e => { });
		const modmailChannel: TextChannel = selectedGuild.channels.cache.get(guildDb.generalChannels.modMailChannel) as TextChannel;

		let attachments: string = "";
		let indexAttachment: number = 0;
		for (let [id, attachment] of message.attachments) {
			if (indexAttachment > 6) {
				break;
			}
			// [attachment](url) (type of attachment)
			attachments += `[Attachment ${indexAttachment + 1}](${attachment.url}) (\`${attachment.url.split(".")[attachment.url.split(".").length - 1]}\`)\n`;
			++indexAttachment;
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
			.addField("Last Response By", "None.");

		// determine the channel that this modmail message will
		// go to
		const indexOfModmail: number = guildDb.properties.modMail.findIndex(x => x.originalModmailAuthor === initiator.id);

		if (indexOfModmail !== -1 && selectedGuild.channels.cache.has(guildDb.properties.modMail[indexOfModmail].channel)) {
			const channel: TextChannel = selectedGuild.channels.cache.get(guildDb.properties.modMail[indexOfModmail].channel) as TextChannel;
			const modMailMessage: Message = await channel.send(modMailEmbed);
			// respond reaction
			await modMailMessage.react("📝").catch(() => { });
		}
		else {
			const modMailMessage: Message = await modmailChannel.send(modMailEmbed);
			// respond reaction
			await modMailMessage.react("📝").catch(() => { });
			// garbage reaction
			await modMailMessage.react("🗑️").catch(() => { });
			// blacklist
			await modMailMessage.react("🚫").catch(() => { });
			// redirect
			await modMailMessage.react("🔀").catch(() => { });
		}
	}

	/**
	 * Converts a modmail message to a thread.
	 * @param modmailMessage The original modmail message.
	 * @param convertedToThreadBy The person that converted the modmail message to a thread.
	 */
	export async function convertToThread(originalModMailMessage: Message, convertedToThreadBy: GuildMember): Promise<void> {
		if (convertedToThreadBy.guild.me === null || !convertedToThreadBy.guild.me.hasPermission("MANAGE_CHANNELS")) {
			return;
		}

		// get old embed + prepare
		const oldEmbed: MessageEmbed = originalModMailMessage.embeds[0];
		const authorOfModmailId: string = ((oldEmbed.footer as MessageEmbedFooter).text as string).split("•")[0].trim();
		let guildDb: IRaidGuild = await new MongoDbHelper.MongoDbGuildManager(convertedToThreadBy.guild.id).findOrCreateGuildDb();

		let authorOfModmail: GuildMember;
		try {
			authorOfModmail = await convertedToThreadBy.guild.members.fetch(authorOfModmailId);
		}
		catch (e) {
			const noUserFoundEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(convertedToThreadBy.user)
				.setTitle("User Not Found")
				.setDescription("The person you were trying to find wasn't found. The person may have left the server. This modmail entry will be deleted in 10 seconds.")
				.setFooter("Modmail");
			await originalModMailMessage.edit(noUserFoundEmbed)
				.then(x => x.delete({ timeout: 10 * 1000 }))
				.catch(() => { });
			return;
		}

		const index: number = guildDb.properties.modMail.findIndex(x => x.originalModmailAuthor);
		if (index !== -1) {
			if (convertedToThreadBy.guild.channels.cache.has(guildDb.properties.modMail[index].channel)) {
				return;
			}

			// some idiot deleted the channel
			guildDb = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: convertedToThreadBy.id }, {
				$pull: {
					"properties.modMail": {
						channel: guildDb.properties.modMail[index].channel
					}
				}
			}, { returnOriginal: false })).value as IRaidGuild;
		}

		// create new channel
		const modmailChannel: TextChannel = convertedToThreadBy.guild.channels.cache.get(guildDb.generalChannels.modMailChannel) as TextChannel;
		const modmailCategory: CategoryChannel | null = modmailChannel.parent;

		if (modmailCategory === null) {
			return;
		}

		const createdTime: string = DateUtil.getTime();

		let threadChannel: TextChannel = await convertedToThreadBy.guild.channels.create(`${authorOfModmail.user.username}-${authorOfModmail.user.discriminator}`, {
			type: "text",
			parent: modmailCategory,
			topic: `Modmail Thread For: ${authorOfModmail}\nCreated By: ${convertedToThreadBy}\nCreated Time: ${createdTime}`
		});
		await threadChannel.lockPermissions().catch(e => { });

		// create base message
		const baseMsgEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(authorOfModmail.user)
			.setTitle(`Modmail Thread ⇒ ${authorOfModmail.user.tag}`)
			.setDescription(`⇒ **Converted To Thread By:** ${convertToThread}\n⇒ **Author of Modmail:** ${authorOfModmail}\n **Thread Creation Time:** ${createdTime}`)
			.addField("Reactions", "⇒ React with 🛑 to close this thread. A copy of all messages will be sent.\n⇒ React with 🚫 to modmail blacklist the author of this modmail.")
			.setTimestamp()
			.setFooter("Modmail Thread");

		const baseMessage: Message = await threadChannel.send(baseMsgEmbed);
		FastReactionMenuManager.reactFaster(baseMessage, ["🛑", "🚫"]);
		await baseMessage.pin().catch(e => { });

		// send first message
		const firstMsgEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(authorOfModmail.user)
			.setTitle(`${authorOfModmail.user.tag} ⇒ Modmail Thread`)
			.setFooter(`${authorOfModmail.id} • Modmail Thread`)
			.setTimestamp();
		const attachmentsIndex: number = originalModMailMessage.embeds[0].fields
			.findIndex(x => x.name === "Attachments");
		if (typeof originalModMailMessage.embeds[0].description !== "undefined") {
			firstMsgEmbed.setDescription(originalModMailMessage.embeds[0].description);
		}
		if (attachmentsIndex !== -1) {
			firstMsgEmbed.addField("Attachments", originalModMailMessage.embeds[0].fields[attachmentsIndex].value);
		}

		const firstMsg: Message = await threadChannel.send(firstMsgEmbed);
		firstMsg.react("📝").catch(e => { });

		// save to db
		await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: convertedToThreadBy.id }, {
			$push: {
				"properties.modMail": {
					originalModmailAuthor: authorOfModmail.id,
					baseMsg: baseMessage.id,
					startedOn: createdTime,
					channel: threadChannel.id,
					threadMessages: [
						{
							msgContent: typeof originalModMailMessage.embeds[0].description !== "undefined" ? originalModMailMessage.embeds[0].description : "",
							// TODO account for attachments somehow. 
							attachments: [],
							dateTime: originalModMailMessage.createdTimestamp,
							author: authorOfModmail.id
						}
					]
				}
			}
		});
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
			// redirect
			await originalModMailMessage.react("🔀").catch(() => { });
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
	 * Responds to a message sent in a modmail thread. 
	 * @param originalModMailMessage The original modmail message. This message should be in the specific thread channel.
	 * @param memberThatWillRespond The member that will respond.
	 * @param guildDb The guild document.
	 */
	export async function respondToThreadModmail(
		originalModMailMessage: Message, 
		memberThatWillRespond: GuildMember, 
		guildDb: IRaidGuild
	): Promise<void> {
		const threadIndex: number = guildDb.properties.modMail
			.findIndex(x => x.channel === originalModMailMessage.channel.id);
		
		if (typeof threadIndex === "undefined") {
			return; 
		}

		
	}

	/**
	 * Allows a person to respond to a modmail message. 
	 * @param originalModMailMessage The message from the mod mail channel that the person is going to respond to.
	 * @param memberThatWillRespond The person that will be responding to the modmail sender/initator. 
	 */
	export async function respondToGeneralModmail(originalModMailMessage: Message, memberThatWillRespond: GuildMember): Promise<void> {
		// no permission
		if (memberThatWillRespond.guild.me !== null && !memberThatWillRespond.guild.me.hasPermission("MANAGE_CHANNELS")) {
			return;
		}

		// get old embed + prepare
		const oldEmbed: MessageEmbed = originalModMailMessage.embeds[0];
		const authorOfModmailId: string = ((oldEmbed.footer as MessageEmbedFooter).text as string).split("•")[0].trim();
		const guildDb: IRaidGuild = await new MongoDbHelper.MongoDbGuildManager(memberThatWillRespond.guild.id).findOrCreateGuildDb();
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
				// redir
				await originalModMailMessage.react("🔀").catch(() => { });
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
					await originalModMailMessage.react("🔀").catch(() => { });
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
		} // end while

		const replyEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(anonymous ? memberThatWillRespond.guild : memberThatWillRespond.user)
			.setTitle("Modmail Response")
			.setDescription(responseToMail)
			.addField("Original Message", originalModMailContent.length === 0 ? "N/A" : (originalModMailContent.length > 1012 ? originalModMailContent.substring(0, 1000) + "..." : originalModMailContent))
			.setFooter("Modmail Response");

		await authorOfModmail.send(replyEmbed).catch(e => { });
		await responseChannel.delete().catch(() => { });
		CurrentlyRespondingToModMail.delete(memberThatWillRespond.id);

		// save response
		let respString: StringBuilder = new StringBuilder()
			.append("========== RESPONSE ==========")
			.appendLine()
			.append(responseToMail)
			.appendLine()
			.appendLine()
			.appendLine()
			.append("====== ORIGINAL MESSAGE ======")
			.appendLine()
			.append(originalModMailContent)
			.appendLine()
			.appendLine()
			.appendLine()
			.append("======== GENERAL INFO ========")
			.appendLine()
			.append(`Author ID: ${authorOfModmail.id}`)
			.appendLine()
			.append(`Author Tag: ${authorOfModmail.user.tag}`)
			.appendLine()
			.append(`Responder ID: ${memberThatWillRespond.id}`)
			.appendLine()
			.append(`Responder Tag: ${memberThatWillRespond.user.tag}`)
			.appendLine()
			.append(`Time: ${DateUtil.getTime()} (UTC)`);

		// see if we should store 
		const modMailStorage: TextChannel | undefined = memberThatWillRespond.guild.channels.cache
			.get(guildDb.generalChannels.modMailStorage) as TextChannel | undefined;

		let addLogStr: string = "";
		if (typeof modMailStorage !== "undefined") {
			const m: Message | void = await modMailStorage.send(DateUtil.getTime(), new MessageAttachment(Buffer.from(respString.toString(), "utf8"), `${authorOfModmail.id}_modmail_${new Date().getTime()}.txt`)).catch(console.error);
			if (typeof m !== "undefined" && m.attachments.size > 0) {
				addLogStr = `[[Response](${(m.attachments.first() as MessageAttachment).url})]`;
			}
		}

		// get old responses
		const oldRespArr: EmbedField[] = oldEmbed.fields.splice(oldEmbed.fields.findIndex(x => x.name === "Last Response By"), 1);
		const lastResponse: EmbedField = oldRespArr[0];

		let tempLastResp: string = `${memberThatWillRespond} (${DateUtil.getTime()}) ${addLogStr}`;
		let lastRespByStr: string = "";
		if (lastResponse.value === "None.") {
			lastRespByStr = tempLastResp;
		}
		// already had content 
		else {
			if (lastResponse.value.length + tempLastResp.length > 1012) {
				const t: string[] = lastResponse.value.split("\n");
				while (t.join("\n").length + tempLastResp.length > 1012) {
					t.shift();
				}
				lastRespByStr = `${t.join("\n")}\n${tempLastResp}`;
			}
			else {
				lastRespByStr = `${lastResponse.value}\n${tempLastResp}`;
			}
		}

		// update embed + re-react 
		oldEmbed.addField("Last Response By", lastRespByStr);
		await originalModMailMessage.edit(oldEmbed.setTitle("✅ Modmail Entry").setColor("GREEN"));
		await originalModMailMessage.react("📝").catch(() => { });
		await originalModMailMessage.react("🗑️").catch(() => { });
		await originalModMailMessage.react("🚫").catch(() => { });
		await originalModMailMessage.react("🔀").catch(() => { });
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

		UserAvailabilityHelper.InMenuCollection.set(user.id, UserAvailabilityHelper.MenuType.PRE_MODMAIL);
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
		});
		UserAvailabilityHelper.InMenuCollection.delete(user.id)

		return selectedGuild === "CANCEL" ? null : selectedGuild;
	}
}