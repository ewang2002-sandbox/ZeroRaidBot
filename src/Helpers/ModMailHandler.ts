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
import { StringBuilder } from "../Classes/String/StringBuilder";
import { OtherUtil } from "../Utility/OtherUtil";
import { IModmailThread } from "../Definitions/IModMail";
import { ArrayUtil } from "../Utility/ArrayUtil";

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
	 * This function is called when someone DMs the bot. This basically initiates modmail by forwarding a modmail message to the server.
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
		const guildDb: IRaidGuild = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient
			.findOne({ guildID: selectedGuild.id })) as IRaidGuild;

		if (!canUseModMail(selectedGuild, guildDb)) {
			return;
		}

		if (guildDb.moderation.blacklistedModMailUsers.some(x => x.id === initiator.id)) {
			await message.react("⛔").catch(e => { });
			return;
		}

		await message.react("📧").catch(() => { });
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

		// determine the channel that this modmail message will
		// go to
		const indexOfModmail: number = guildDb.properties.modMail
			.findIndex(x => x.originalModmailAuthor === initiator.id);

		const modMailEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(initiator, "RED")
			// the content of the modmail msg
			.setDescription(message.content);

		// if there was a thread
		// but it was deleted
		// then update db
		if (indexOfModmail !== -1
			&& !selectedGuild.channels.cache.has(guildDb.properties.modMail[indexOfModmail].channel)) {
			// assume channel deleted
			await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: selectedGuild.id }, {
				$pull: {
					"properties.modMail": {
						channel: guildDb.properties.modMail[indexOfModmail].channel
					}
				}
			});
		}

		if (indexOfModmail !== -1
			&& selectedGuild.channels.cache.has(guildDb.properties.modMail[indexOfModmail].channel)) {
			// send TO modmail thread			
			modMailEmbed.setTitle(`${initiator.tag} ⇒ Modmail Thread`)
				.setFooter(`${initiator.id} • Modmail Thread`);

			if (attachments.length !== 0) {
				modMailEmbed.addField("Attachments", attachments);
			}

			// threaded modmail
			const channel: TextChannel = selectedGuild.channels.cache.get(guildDb.properties.modMail[indexOfModmail].channel) as TextChannel;
			const modMailMessage: Message = await channel.send(modMailEmbed);
			// respond reaction
			await modMailMessage.react("📝").catch(() => { });
		}
		else {
			// default modmail 
			modMailEmbed
				.setTimestamp()
				// so we can find the id 
				.setFooter(`${initiator.id} • Modmail Message`)
				// title -- ❌ means no responses
				.setTitle("❌ Modmail Entry");
			if (attachments.length !== 0) {
				modMailEmbed.addField("Attachments", attachments);
			}

			modMailEmbed.addField("Sender Information", `⇒ Mention: ${initiator}\n⇒ Tag: ${initiator.tag}\n⇒ ID: ${initiator.id}`)
				// responses -- any mods that have responded
				.addField("Last Response By", "None.");

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
	 * This creates a new channel where all modmail messages from `targetMember` will be redirected to said channel.
	 * @param targetMember The member to initiate the modmail conversation with.
	 * @param initiatedBy The member that initiated the modmail conversation.
	 * @param guildDb The guild doc.
	 * @param {string} [initialContent]
	 */
	export async function startThreadedModmailWithMember(
		targetMember: GuildMember,
		initiatedBy: GuildMember,
		guildDb: IRaidGuild,
		initialContent?: string
	): Promise<void> {
		// make sure the person isnt blacklisted from modmail
		const indexOfBlacklist: number = guildDb.moderation.blacklistedModMailUsers
			.findIndex(x => x.id === targetMember.id);

		if (indexOfBlacklist !== -1) {
			const noUserFoundEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(targetMember.user, "RED")
				.setTitle("User Blacklisted From Modmail")
				.setDescription(`${targetMember} is currently blacklisted from using modmail. You are unable to create a thread for this person.`)
				.addField("Reason", guildDb.moderation.blacklistedModMailUsers[indexOfBlacklist].reason)
				.setFooter("Modmail");
			await initiatedBy.send(noUserFoundEmbed)
				.then(x => x.delete({ timeout: 30 * 1000 }))
				.catch(() => { });
			return;
		}

		const guild: Guild = initiatedBy.guild;
		const index: number = guildDb.properties.modMail.findIndex(x => x.originalModmailAuthor === targetMember.id);
		if (index !== -1) {
			if (guild.channels.cache.has(guildDb.properties.modMail[index].channel)) {
				const channel: TextChannel = guild.channels.cache
					.get(guildDb.properties.modMail[index].channel) as TextChannel;
				await channel.send(`${initiatedBy}`).catch(e => { });
				return;
			}

			// assume channel deleted
			guildDb = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
				$pull: {
					"properties.modMail": {
						channel: guildDb.properties.modMail[index].channel
					}
				}
			}, { returnOriginal: false })).value as IRaidGuild;
		}

		// create new channel
		const modmailChannel: TextChannel = guild.channels.cache
			.get(guildDb.generalChannels.modMailChannel) as TextChannel;
		const modmailCategory: CategoryChannel | null = modmailChannel.parent;

		if (modmailCategory === null) {
			return;
		}

		// max size of category = 50
		if (modmailCategory.children.size + 1 > 50) {
			return;
		}

		// create channel
		const createdTime: number = new Date().getTime();

		let threadChannel: TextChannel = await guild.channels.create(`${targetMember.user.username}-${targetMember.user.discriminator}`, {
			type: "text",
			parent: modmailCategory,
			topic: `Modmail Thread For: ${targetMember}\nCreated By: ${initiatedBy}\nCreated Time: ${DateUtil.getTime(createdTime)}`
		});
		await threadChannel.lockPermissions().catch(e => { });

		// create base message
		const baseMsgEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(targetMember.user)
			.setTitle(`Modmail Thread ⇒ ${targetMember.user.tag}`)
			.setDescription(`⇒ **Initiated By:** ${targetMember}\n⇒ **Recipient:** ${targetMember}\n⇒ **Thread Creation Time:** ${DateUtil.getTime(createdTime)}`)
			.addField("Reactions", "⇒ React with 📝 to send a message. You may also use the `;respond` command.\n⇒ React with 🛑 to close this thread.\n⇒ React with 🚫 to modmail blacklist the author of this modmail.")
			.setTimestamp()
			.setFooter("Modmail Thread • Created");

		const baseMessage: Message = await threadChannel.send(baseMsgEmbed);
		FastReactionMenuManager.reactFaster(baseMessage, ["📝", "🛑", "🚫"]);
		await baseMessage.pin().catch(e => { });

		await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
			$push: {
				"properties.modMail": {
					originalModmailAuthor: targetMember.id,
					baseMsg: baseMessage.id,
					startedOn: createdTime,
					channel: threadChannel.id,
					originalModmailMessage: ""
				}
			}
		});

		if (typeof initialContent !== "undefined") {
			const replyEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(initiatedBy.guild)
				.setTitle(`${initiatedBy.guild} ⇒ You`)
				.setDescription(initialContent)
				.setFooter("Modmail");

			let sent: boolean = true;
			try {
				await targetMember.send(replyEmbed);
			}
			catch (e) {
				sent = false;
			}

			const replyRecordsEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(initiatedBy.user, sent ? "GREEN" : "YELLOW")
				.setTitle(`${initiatedBy.displayName} ⇒ ${targetMember.user.tag}`)
				.setDescription(initialContent)
				.setFooter("Sent Anonymously")
				.setTimestamp();

			if (!sent) {
				replyRecordsEmbed.addField("⚠️ Error", "Something went wrong when trying to send this modmail message. The recipient has most likely blocked the bot.");
			}
			await threadChannel.send(replyRecordsEmbed).catch(console.error);
		}
	}

	/**
	 * Converts a modmail message to a thread. Should be called when reacting to 🔀.
	 * @param modmailMessage The original modmail message.
	 * @param convertedToThreadBy The person that converted the modmail message to a thread.
	 */
	export async function convertToThread(
		originalModMailMessage: Message,
		convertedToThreadBy: GuildMember
	): Promise<void> {
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
				.setDescription("The person you were trying to find wasn't found. The person may have left the server. This modmail entry will be deleted in 5 seconds.")
				.setFooter("Modmail");
			await originalModMailMessage.edit(noUserFoundEmbed)
				.then(x => x.delete({ timeout: 5 * 1000 }))
				.catch(() => { });
			return;
		}

		// make sure the person isnt blacklisted from modmail
		const indexOfBlacklist: number = guildDb.moderation.blacklistedModMailUsers
			.findIndex(x => x.id === authorOfModmail.id);

		if (indexOfBlacklist !== -1) {
			const noUserFoundEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(convertedToThreadBy.user, "RED")
				.setTitle("User Blacklisted From Modmail")
				.setDescription(`${authorOfModmail} is currently blacklisted from using modmail. You are unable to create a thread for this person.`)
				.addField("Reason", guildDb.moderation.blacklistedModMailUsers[indexOfBlacklist].reason)
				.setFooter("Modmail");
			await originalModMailMessage.edit(noUserFoundEmbed)
				.then(x => x.delete({ timeout: 5 * 1000 }))
				.catch(() => { });
			return;
		}

		const index: number = guildDb.properties.modMail.findIndex(x => x.originalModmailAuthor === authorOfModmail.id);
		if (index !== -1) {
			if (convertedToThreadBy.guild.channels.cache.has(guildDb.properties.modMail[index].channel)) {
				await (convertedToThreadBy.guild.channels.cache.get(guildDb.properties.modMail[index].channel) as TextChannel).send(`${convertedToThreadBy}`).catch(e => { });
				return;
			}

			// some idiot deleted the channel
			guildDb = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: convertedToThreadBy.guild.id }, {
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

		// max size of category = 50
		if (modmailCategory.children.size + 1 > 50) {
			return;
		}

		const createdTime: number = new Date().getTime();

		let threadChannel: TextChannel = await convertedToThreadBy.guild.channels.create(`${authorOfModmail.user.username}-${authorOfModmail.user.discriminator}`, {
			type: "text",
			parent: modmailCategory,
			topic: `Modmail Thread For: ${authorOfModmail}\nCreated By: ${convertedToThreadBy}\nCreated Time: ${DateUtil.getTime(createdTime)}`
		});
		await threadChannel.lockPermissions().catch(e => { });

		// create base message
		const baseMsgEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(authorOfModmail.user)
			.setTitle(`Modmail Thread ⇒ ${authorOfModmail.user.tag}`)
			.setDescription(`⇒ **Converted By:** ${convertedToThreadBy}\n⇒ **Author of Modmail:** ${authorOfModmail}\n⇒ **Thread Creation Time:** ${DateUtil.getTime(createdTime)}`)
			.addField("Reactions", "⇒ React with 📝 to send a message. You may also use the `;respond` command.\n⇒ React with 🛑 to close this thread.\n⇒ React with 🚫 to modmail blacklist the author of this modmail.")
			.setTimestamp()
			.setFooter("Modmail Thread • Converted");

		const baseMessage: Message = await threadChannel.send(baseMsgEmbed);
		FastReactionMenuManager.reactFaster(baseMessage, ["📝", "🛑", "🚫"]);
		await baseMessage.pin().catch(e => { });

		// send first message
		const firstMsgEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(authorOfModmail.user, "RED")
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
		await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: convertedToThreadBy.guild.id }, {
			$push: {
				"properties.modMail": {
					originalModmailAuthor: authorOfModmail.id,
					baseMsg: baseMessage.id,
					startedOn: createdTime,
					channel: threadChannel.id,
					originalModmailMessage: originalModMailMessage.id
				}
			}
		});

		oldEmbed.setFooter("Converted to Modmail Thread.");
		oldEmbed.addField("Modmail Thread Information", `This modmail message was converted to a modmail thread.\n⇒ Time: ${DateUtil.getTime(createdTime)}\n⇒ Converted By: ${convertedToThreadBy}`);
		await originalModMailMessage.edit(oldEmbed).catch(e => { });
		await originalModMailMessage.reactions.removeAll().catch(e => { });
	}

	/**
	 * Blacklists the author of amodmail message from using modmail.
	 * @param originalModMailMessage The message from the modmail channel.
	 * @param mod The moderator. 
	 * @param guildDb The guild doc.
	 * @param threadInfo The thread info, if any.
	 */
	export async function blacklistFromModmail(
		originalModMailMessage: Message,
		mod: GuildMember,
		guildDb: IRaidGuild,
		threadInfo?: IModmailThread
	): Promise<void> {
		const oldEmbed: MessageEmbed = originalModMailMessage.embeds[0];
		const authorOfModmailId: string = typeof threadInfo === "undefined"
			? ((oldEmbed.footer as MessageEmbedFooter).text as string).split("•")[0].trim()
			: threadInfo.originalModmailAuthor;

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
			if (typeof threadInfo !== "undefined") {
				FastReactionMenuManager.reactFaster(originalModMailMessage, ["📝", "🛑", "🚫"]);
			}
			else {
				// respond reaction
				await originalModMailMessage.react("📝").catch(() => { });
				// garbage reaction
				await originalModMailMessage.react("🗑️").catch(() => { });
				// blacklist
				await originalModMailMessage.react("🚫").catch(() => { });
				// redirect
				await originalModMailMessage.react("🔀").catch(() => { });
			}
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

		if (typeof threadInfo !== "undefined") {
			// end thread
			await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: mod.guild.id }, {
				$pull: {
					"properties.modMail": {
						channel: originalModMailMessage.channel.id
					}
				}
			});
			await originalModMailMessage.channel.delete().catch(e => { });
		}

		if (wasAlreadyBlacklisted) {
			await originalModMailMessage.delete().catch(e => { });
			return;
		}

		const embedToReplaceOld: MessageEmbed = MessageUtil.generateBlankEmbed(mod.user)
			.setTitle("Blacklisted From Modmail")
			.setDescription(`The user with ID \`${authorOfModmailId}\` has been blacklisted from using modmail. This message will delete in 5 seconds.`)
			.setFooter("Blacklisted from Modmail.");
		await originalModMailMessage.edit(embedToReplaceOld)
			.then(x => x.delete({ timeout: 5000 }))
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
	 * Responds to a message sent in a modmail thread. Should be called after someone reacts to the 📝 emoji in a threaded channel. 
	 * @param modmailThread The modmail thread from the doc.
	 * @param memberThatWillRespond The member that will respond.
	 * @param guildDb The guild document.
	 * @param channel The thread channel. 
	 */
	export async function respondToThreadModmail(
		modmailThread: IModmailThread,
		memberThatWillRespond: GuildMember,
		guildDb: IRaidGuild,
		channel: TextChannel
	): Promise<void> {
		// make sure member exists
		let memberToRespondTo: GuildMember;
		try {
			memberToRespondTo = await memberThatWillRespond.guild.members
				.fetch(modmailThread.originalModmailAuthor);
		}
		catch (e) {
			const noUserFoundEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(memberThatWillRespond.user)
				.setTitle("User Not Found")
				.setDescription("The person you were trying to find wasn't found. The person may have left the server. This modmail thread will be deleted in 5 seconds.")
				.setFooter("Modmail");
			await channel.send(noUserFoundEmbed).catch(e => { });
			await OtherUtil.waitFor(5000);
			await closeModmailThread(channel, modmailThread, guildDb, memberThatWillRespond);
			return;
		}

		// wait for msg to be sent
		CurrentlyRespondingToModMail.set(memberThatWillRespond.id, modmailThread.originalModmailAuthor);
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

		let responseToMail: string = "";
		let anonymous: boolean = true;

		let botMsg: Message | null = null;
		let hasReactedToMessage: boolean = false;
		while (true) {
			const responseEmbed: MessageEmbed = getRespEmbed(responseToMail, anonymous);

			if (botMsg === null) {
				botMsg = await channel.send(responseEmbed);
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
				channel
			).sendWithReactCollector(GenericMessageCollector.getPureMessage(channel), {
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
					await botMsg.delete().catch(e => { });
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

		await botMsg.delete().catch(console.error);
		const replyEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(anonymous ? memberThatWillRespond.guild : memberThatWillRespond.user)
			.setTitle(`${memberThatWillRespond.guild} ⇒ You`)
			.setDescription(responseToMail)
			.setFooter("Modmail Response");

		let sent: boolean = true;
		try {
			await memberToRespondTo.send(replyEmbed);
		}
		catch (e) {
			sent = false;
		}

		const replyRecordsEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(memberThatWillRespond.user, sent ? "GREEN" : "YELLOW")
			.setTitle(`${memberThatWillRespond.displayName} ⇒ ${memberToRespondTo.user.tag}`)
			.setDescription(responseToMail)
			.setFooter(`Sent ${anonymous ? "Anonymously" : "Publicly"}`)
			.setTimestamp();

		if (!sent) {
			replyRecordsEmbed.addField("⚠️ Error", "Something went wrong when trying to send this modmail message. The recipient has most likely blocked the bot.");
		}

		await channel.send(replyRecordsEmbed).catch(e => { });
		CurrentlyRespondingToModMail.delete(memberThatWillRespond.id);
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
				.setDescription("The person you were trying to find wasn't found. The person may have left the server. This modmail entry will be deleted in 5 seconds.")
				.setFooter("Modmail");
			await originalModMailMessage.edit(noUserFoundEmbed)
				.then(x => x.delete({ timeout: 5 * 1000 }))
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
					await originalModMailMessage.edit(oldEmbed).catch(() => { });
					await originalModMailMessage.react("📝").catch(() => { });
					await originalModMailMessage.react("🗑️").catch(() => { });
					await originalModMailMessage.react("🚫").catch(() => { });
					await originalModMailMessage.react("🔀").catch(() => { });
					await responseChannel.delete().catch(() => { });
					CurrentlyRespondingToModMail.delete(memberThatWillRespond.id);
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

		let sent: boolean = true;
		try {
			await authorOfModmail.send(replyEmbed);
		}
		catch (e) {
			sent = false;
		}

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
			.append(`Time: ${DateUtil.getTime()} (UTC)`)
			.appendLine()
			.append(`Sent Status: ${sent ? "Message Sent Successfully" : "Message Failed To Send"}`);

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

		let tempLastResp: string = `${memberThatWillRespond} (${DateUtil.getTime()}) ${addLogStr} ${!sent ? "`⚠️`" : ""}`;
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

	/**
	 * Closes the modmail thread.
	 * @param threadChannel The thread channel to remove.
	 * @param threadInfo The modmail thread info.
	 * @param guildDb The guild doc.
	 * @param closedBy The person that closed this modmail thread.
	 */
	export async function closeModmailThread(
		threadChannel: TextChannel,
		threadInfo: IModmailThread,
		guildDb: IRaidGuild,
		closedBy: GuildMember
	): Promise<void> {
		if (threadInfo.originalModmailMessage !== "" && threadChannel.guild.channels.cache.has(guildDb.generalChannels.modMailChannel)) {
			const modmailChannel: TextChannel = threadChannel.guild.channels.resolve(guildDb.generalChannels.modMailChannel) as TextChannel;
			let oldModMailMessage: Message | null = null;
			try {
				oldModMailMessage = await modmailChannel.messages.fetch(threadInfo.originalModmailMessage);
			}
			finally {
				if (oldModMailMessage !== null) {
					// we have message
					const modmailEmbed: MessageEmbed = oldModMailMessage.embeds[0];
					const modmailThreadInfoIndex: number = modmailEmbed
						.fields.findIndex(x => x.name === "Modmail Thread Information");
					if (modmailThreadInfoIndex !== -1) {
						modmailEmbed.spliceFields(modmailThreadInfoIndex, 1);
					}
					const allPossibleFields: EmbedField[] = modmailEmbed.fields.filter(x => x.name === "Last Response By");
					const lastResponseByIndex: number = modmailEmbed.fields.findIndex(x => x.value === allPossibleFields[allPossibleFields.length - 1].value);

					if (lastResponseByIndex !== -1) {
						let addRespInfo: string = `${closedBy} (${DateUtil.getTime()}) \`[Thread Closed]\`\n`;
						if (modmailEmbed.fields[lastResponseByIndex].value === "None.") {
							modmailEmbed.fields[lastResponseByIndex].value = addRespInfo;
						}
						else {
							if (modmailEmbed.fields[lastResponseByIndex].value.length + addRespInfo.length > 1000) {
								modmailEmbed.addField("Last Response By", addRespInfo);
							}
							else {
								modmailEmbed.fields[lastResponseByIndex].value += `\n${addRespInfo}`;
							}
						}
					}

					modmailEmbed.setTitle("✅ Modmail Entry");
					modmailEmbed.setColor("GREEN");
					modmailEmbed.setFooter(`${threadInfo.originalModmailAuthor} • Modmail Message`);

					await oldModMailMessage.edit(modmailEmbed).catch(e => { });
					await oldModMailMessage.react("📝").catch(() => { });
					await oldModMailMessage.react("🗑️").catch(() => { });
					await oldModMailMessage.react("🚫").catch(() => { });
					await oldModMailMessage.react("🔀").catch(() => { });
				}
			}
		}

		await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: threadChannel.guild.id }, {
			$pull: {
				"properties.modMail": {
					channel: threadChannel.id
				}
			}
		});
		await threadChannel.delete().catch(e => { });
	}
}