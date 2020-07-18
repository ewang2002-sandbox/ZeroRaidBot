import { IRaidGuild } from "../Templates/IRaidGuild";
import { User, Guild, Message, MessageEmbed, MessageEmbedThumbnail, TextChannel, GuildMemberEditData, GuildMember, MessageEmbedFooter, MessageAttachment, FileOptions, EmbedField, Collection, Emoji } from "discord.js";
import { MongoDbHelper } from "./MongoDbHelper";
import { StringUtil } from "../Utility/StringUtil";
import { UserAvailabilityHelper } from "./UserAvailabilityHelper";
import { GenericMessageCollector } from "../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../Definitions/TimeUnit";
import { resolve } from "dns";
import { MessageUtil } from "../Utility/MessageUtil";
import { userInfo } from "os";
import { UserHandler } from "./UserHandler";
import { DateUtil } from "../Utility/DateUtil";

export module ModMailHandler {
	// K = the mod that is responding
	// V = the person the mod is responding to. 
	export const CurrentlyRespondingToModMail: Collection<string, string> = new Collection<string, string>();

	/**
	 * Checks whether the person is already engaged in a modmail conversation. 
	 * @param discordId The Discord ID.
	 * @param guildDb The guild document.
	 */
	export function isInThreadConversation(discordId: string, guildDb: IRaidGuild): boolean {
		return guildDb.properties.modMail.some(x => x.sender === discordId);
	}

	/**
	 * Checks whether modmail can be used in the server.
	 * @param guild The guild.
	 * @param guildDb The guild document.
	 */
	export function canUseModMail(guild: Guild, guildDb: IRaidGuild): boolean {
		return guild.channels.cache.has(guildDb.generalChannels.modMailChannel);
	}

	/**
	 * Initiates modmail. I know, best descriptiob ever. :) 
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
			await MessageUtil.send({ embed: errorEmbed }, initiator).catch(e => { });
			return;
		}
		const guildDb: IRaidGuild = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOne({ guildID: selectedGuild.id })) as IRaidGuild;
		const modmailChannel: TextChannel = selectedGuild.channels.cache.get(guildDb.generalChannels.modMailChannel) as TextChannel;

		const modMailEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(initiator)
			.setTimestamp()
			// so we can find the id 
			.setFooter(`${initiator.id} • Modmail Message`)
			// the content of the modmail msg
			.setDescription(message.content)
			// attach files
			.attachFiles(message.attachments.array())
			// sender info 
			.addField("Sender Information", `⇒ Mention: ${initiator}\n⇒ Tag: ${initiator.tag}\n⇒ ID: ${initiator.id}`)
			// responses -- any mods that have responded
			.addField("Last Response By", "None.")
			// title -- ❌ means no responses
			.setTitle("❌ Modmail Entry");
		const modMailMessage: Message = await modmailChannel.send(modMailEmbed);
		// respond reaction
		await modMailMessage.react("📝").catch(e => { });
		// garbage reaction
		await modMailMessage.react("🗑️").catch(e => { });
		// blacklist
		await modMailMessage.react("🚫").catch(e => { });
	}

	/**
	 * Allows a person to respond to a modmail message. 
	 * @param originalModMailMessage The message from the mod mail channel that the person is going to respond to.
	 * @param memberThatWillRespond The person that will be responding to the modmail sender/initator. 
	 */
	export async function respondToModmail(originalModMailMessage: Message, memberThatWillRespond: GuildMember): Promise<void> {
		// check if msg even has an embed
		if (originalModMailMessage.embeds.length === 0) {
			return;
		}

		const footer: MessageEmbedFooter | null = originalModMailMessage.embeds[0].footer;

		// check if footer is valid 
		if (footer === null
			|| typeof footer.text === "undefined"
			|| !footer.text.endsWith("• Modmail Message")) {
			return;
		}

		// no permission
		if (memberThatWillRespond.guild.me !== null && !memberThatWillRespond.guild.me.hasPermission("MANAGE_CHANNELS")) {
			return;
		}

		// get old embed + prepare
		const authorOfModmailId: string = footer.text.split("•")[0].trim();
		const oldEmbed: MessageEmbed = originalModMailMessage.embeds[0];
		CurrentlyRespondingToModMail.set(memberThatWillRespond.id, authorOfModmailId);

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
				.catch(e => { });
			return;
		}

		const files: (string | MessageAttachment | FileOptions)[] = originalModMailMessage.embeds[0].files;
		const senderInfo: string = (originalModMailMessage.embeds[0].fields.find(x => x.name === "Sender Information") as EmbedField).value;

		const noUserFoundEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(memberThatWillRespond.user)
			.setTitle("📝 Response In Progress")
			.setDescription(originalModMailContent)
			.addField("Sender Info", senderInfo)
			.addField("Current Responder", `${memberThatWillRespond}: \`${DateUtil.getTime()}\``)
			.setFooter("Modmail In Progress!");
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
		function getRespEmbed(resp: string, attachments: (string | MessageAttachment | FileOptions)[], anony: boolean): MessageEmbed {
			const e: MessageEmbed = MessageUtil.generateBlankEmbed(memberThatWillRespond.user)
				.setTitle("Your Response")
				.setDescription(resp === "" ? "N/A" : resp)
				.setFooter("Modmail Response System")
				.addField("Instructions", `Please respond to the above message by typing a message here. When you are finished, simply send it here. You will have 10 minutes.\n⇒ React with ✅ once you are satisfied with your response above. This will send the message.\n⇒ React with ❌ to cancel this process.\n⇒ React with 👀 to either show or hide your identity to the person that sent the modmail message. **Identity:** ${anony ? "Private" : "Public"}`);
			if (attachments.length !== 0) {
				e.attachFiles(attachments);
			}

			return e;
		}

		const introEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(memberThatWillRespond.user)
			.setTimestamp()
			.setTitle("Modmail: Respond")
			.setFooter(`Modmail Response System`)
			.setDescription(originalModMailContent)
			.attachFiles(files)
			.addField("Sender Information", senderInfo);
		const introMsg: Message = await responseChannel.send(memberThatWillRespond, {
			embed: introEmbed
		});
		await introMsg.pin().catch(e => { });

		let responseToMail: string = "";
		let attachments: (string | MessageAttachment | FileOptions)[] = [];
		let anonymous: boolean = true;

		let botMsg: Message | null = null;
		let hasReactedToMessage: boolean = false;
		while (true) {
			const responseEmbed: MessageEmbed = getRespEmbed(responseToMail, attachments, anonymous);

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
					await originalModMailMessage.edit(oldEmbed).catch(e => { });
					await originalModMailMessage.react("📝").catch(e => { });
					await originalModMailMessage.react("🗑️").catch(e => { });
					await originalModMailMessage.react("🚫").catch(e => { });
					await responseChannel.delete().catch(e => { });
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
					await botMsg.delete().catch(e => { });
					return;
				}

				if (response.content.length !== 0) {
					responseToMail = response.content;
					attachments = response.attachments.array();
				}
			}
		}

		const replyEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(anonymous ? memberThatWillRespond.guild : memberThatWillRespond.user)
			.setTitle("Modmail Response")
			.setDescription(responseToMail)
			.attachFiles(attachments)
			.addField("Original Message", originalModMailContent.length === 0 ? "N/A" : (originalModMailContent.length > 1012 ? originalModMailContent.substring(0, 1000) + "..." : originalModMailContent))
			.setFooter("Modmail Response");

		await authorOfModmail.send(replyEmbed);
		await responseChannel.delete().catch(e => { });
		CurrentlyRespondingToModMail.delete(memberThatWillRespond.id);
		oldEmbed.fields.splice(oldEmbed.fields.findIndex(x => x.name === "Last Response By"), 1);
		oldEmbed.addField("Last Response By", `${memberThatWillRespond} (${DateUtil.getTime()})`);
		await originalModMailMessage.edit(oldEmbed.setTitle("✅ Modmail Entry"));
		await originalModMailMessage.react("📝").catch(e => { });
		await originalModMailMessage.react("🗑️").catch(e => { });
		await originalModMailMessage.react("🚫").catch(e => { });
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

		const selectedGuild: Guild | "CANCEL" = await new Promise(async (resolve, reject) => {
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