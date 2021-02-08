import { Permissions, Message, MessageReaction, User, ReactionCollector, MessageCollector, TextChannel, MessageEmbed, Guild, GuildMember, ClientUser, Collection } from "discord.js";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Command } from "../../Templates/Command/Command";
import { MessageUtil } from "../../Utility/MessageUtil";
import { IRaidGuild } from "../../Templates/IRaidGuild";

export class SendEmbedCommand extends Command {
	/**
	 * The maximum fields an embed can have.
	 */
	private readonly maximumFields = 25;
	/**
	 * The maximum characters an embed can have. 
	 */
	public static readonly maxEmbedCharacters = 6000;
	/**
	 * The introduction embed -- the "wizard" embed. 
	 */
	private readonly introEmbed = new MessageEmbed()
		.setTitle("🛠 **Creating Your Embed**")
		.setDescription("Your embed preview is above.\n\nReact With ✏ to customize the title.\nReact With 📝 to customize the description\nReact With 🙍 to customize the author.\nReact With 📎 to add or remove embed fields.\nReact With 📕 to customize the footer.\nReact With 🖌 to customize the thumbnail.\nReact With 📷 to customize the image.\nReact with 🌈 to edit the embed color.\nReact With 💾 to send this embed.\nReact With ❌ to cancel the embed-making process.")
		.setFooter("Creating Embed Message")
		.setColor("RANDOM")

	public constructor() {
		super(
			new CommandDetail(
				"Send Embed",
				"sendembed",
				[],
				"Allows you to send an embed through a wizard.",
				["sendembed [Channel: #CHANNEL_MENTION | Channel ID] [Message: Message ID]"],
				["sendembed", "sendembed #rules-info 21371837621312321"],
				0
			),
			new CommandPermission(
				[],
				["ADD_REACTIONS", "EMBED_LINKS"],
				["headRaidLeader"],
				[],
				true
			),
			true, // guild-only command. 
			false,
			false,
			0
		);
	}

	public async executeCommand(
		message: Message,
		args: string[],
		guildDb: IRaidGuild
	): Promise<void> {
		// var declaration 
		const guild: Guild = message.guild as Guild;
		const member: GuildMember = message.member as GuildMember;
		let rChannel: TextChannel | null = null;
		let rMessage: Message | null = null;


		if (args.length > 1) {
			let chan: string | TextChannel = message.mentions.channels.first() || args[0];
			if (typeof chan === "string") {
				if (guild.channels.cache.filter(x => x.type === "text").has(chan)) {
					rChannel = guild.channels.cache.get(chan) as TextChannel;
				}
			}
			else {
				rChannel = chan;
			}

			try {
				// try to get the message 
				// rChannel is defined here 
				rMessage = await (rChannel as TextChannel).messages.fetch(args[1]);
				if (rMessage === null) {
					MessageUtil.send(this.createMsgEmbed(message, "No Message Found", "I could not find a message from that channel."), message.channel as TextChannel);
					return;
				}
				if (rMessage.embeds.length === 0) {
					MessageUtil.send(this.createMsgEmbed(message, "No Embed Found", "The msg ID must have an embed."), message.channel as TextChannel);
					return;
				}

				if (rMessage.author.id !== (message.client.user as ClientUser).id) {
					MessageUtil.send(this.createMsgEmbed(message, "Incorrect Author", "When selecting a msg ID, the author corresponding to the ID must be me, the bot."), message.channel as TextChannel);
					return;
				}
			}
			catch (e) {
				MessageUtil.send(MessageUtil.generateBuiltInEmbed(message, "INVALID_ID", null, "msg"), message.channel as TextChannel);
				return;
			}
		}


		let isChanging: boolean = false;
		let embed: MessageEmbed;
		// embed declaration 
		if (rMessage !== null && rMessage.embeds.length > 0) {
			embed = new MessageEmbed(rMessage.embeds[0]);
		}
		else {
			embed = new MessageEmbed();
		}

		/**
		 * Number of fields the new embed has. 
		 */
		let fields: number = 0;

		let embedMessage: Message = await message.channel.send(embed) as Message;

		message.channel.send(this.editEmbedWithLimit(this.introEmbed, embed)).then(async msg => {
			msg = msg as Message;
			await msg.react("✏").catch(() => { });
			await msg.react("📝").catch(() => { });
			await msg.react("🙍").catch(() => { });
			await msg.react("📎").catch(() => { });
			await msg.react("📕").catch(() => { });
			await msg.react("🖌").catch(() => { });
			await msg.react("📷").catch(() => { });
			await msg.react("🌈").catch(() => { });
			await msg.react("💾").catch(() => { });
			await msg.react("❌").catch(() => { });

			// filters
			const interactFilters = (reaction: MessageReaction, user: User) => {
				return (
					reaction.emoji.name === '✏'
					|| reaction.emoji.name === '📝'
					|| reaction.emoji.name === '🙍'
					|| reaction.emoji.name === '📎'
					|| reaction.emoji.name === '📕'
					|| reaction.emoji.name === '🖌'
					|| reaction.emoji.name === '📷'
					|| reaction.emoji.name === '🌈'
					|| reaction.emoji.name === '💾'
					|| reaction.emoji.name === '❌'
				) && user.id === message.author.id;
			}

			const interact: ReactionCollector = msg.createReactionCollector(interactFilters, {
				time: 1800000
			});

			interact.on("collect", async r => {
				r.users.remove(message.author.id).catch(() => { });
				if (isChanging) {
					return;
				}
				// for some reason i have to do this twice
				msg = msg as Message;
				isChanging = true;

				if (r.emoji.name === "✏") {
					// customize title
					const resp: string = await this.waitForTextResponse(msg, "What should the title of this embed be?", 256, message);
					// edit
					if (!this.evaluateResponse(resp)) {
						await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
						isChanging = false;
						return;
					}
					let title: string = "";
					if (embed.title !== null) {
						title = embed.title;
					}
					if (this.exceedsLimit(embed, title, resp)) {
						MessageUtil.send(this.createMsgEmbed(msg, "Character Limit Exceeded!", "Your embed will exceed the 6,000 character limit with the addition or edit of this item. Please try again."), msg.channel as TextChannel);
						await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
						isChanging = false;
						return;
					}
					embed.setTitle(resp);
				}
				else if (r.emoji.name === "📝") {
					// customize desc
					const resp: string = await this.waitForTextResponse(msg, "What should the description of this embed be?", 2048, message);
					// edit
					if (!this.evaluateResponse(resp)) {
						await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
						isChanging = false;
						return;
					}
					embed.setDescription(resp);
				}
				else if (r.emoji.name === "🙍") {
					// customize author
					const resp: string = await this.waitForTextResponse(msg, "What or who should the author of this embed be? Type `tag` to use your Discord tag and profile picture; type `nick` to use your server nickname and profile picture. Type `server` to use the server name and server picture. Type anything else to use whatever you said.", 256, message);
					// edit
					if (!this.evaluateResponse(resp)) {
						await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
						isChanging = false;
						return;
					}

					let author: string = "";
					if (embed.author !== null && typeof embed.author.name !== "undefined") {
						author = embed.author.name;
					}

					if (this.exceedsLimit(embed, author, 256)) {
						MessageUtil.send(this.createMsgEmbed(msg, "Character Limit Exceeded!", "Your embed will exceed the 6,000 character limit with the addition or edit of this item. Please try again."), msg.channel as TextChannel);

						await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
						isChanging = false;
						return;
					}

					if (resp === "nick") {
						embed.setAuthor(member.displayName, message.author.displayAvatarURL());
					}
					else if (resp === "tag") {
						embed.setAuthor(msg.author.tag, message.author.displayAvatarURL());
					}
					else if (resp === "server") {
						if (guild.iconURL() === null) {
							embed.setAuthor(guild.name);
						}
						else {
							embed.setAuthor(guild.name, guild.iconURL() as string);
						}
					}
					else {
						embed.setAuthor(resp);
					}
				}
				else if (r.emoji.name === "📎") {
					// customize fields
					let add: boolean = false;
					while (true) {
						let qString: string;
						if (this.maximumFields > fields) {
							qString = "Do you want to add or remove a field? Type `add` to add one; `remove` to remove one.";
						}
						else {
							qString = "You have too many fields; you must remove a field. Type `remove` now.";
						}
						const resp: string = await this.waitForTextResponse(msg, qString, 10000, message);
						if (!this.evaluateResponse(resp)) {
							await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
							isChanging = false;
							return;
						}
						if (resp === "add" && this.maximumFields > fields) {
							add = true;
							break;
						}
						else if (resp === "remove") {
							add = false;
							break;
						}
						else {
							if (this.maximumFields > fields) {
								MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_CHOICE_CHOICE", null, "add", "remove"), msg.channel as TextChannel);

							}
							else {
								MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_CHOICE_CHOICE", null, "remove"), msg.channel as TextChannel);
							}
						}
					}

					if (add) {
						const title: string = await this.waitForTextResponse(msg, "What should the name of this field be?", 256, message);
						const value: string = await this.waitForTextResponse(msg, "What should the value of this field be?", 1024, message);
						if (!this.evaluateResponse(title) || !this.evaluateResponse(value)) {
							isChanging = false;
							await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
							return;
						}

						if (this.exceedsLimit(embed, null, 256)) {
							MessageUtil.send(this.createMsgEmbed(msg, "Character Limit Exceeded!", "Your embed will exceed the 6,000 character limit with the addition or edit of this item. Please try again."), msg.channel as TextChannel);
							await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
							isChanging = false;
							return;
						}

						let inline: boolean = false;
						while (true) {
							const inlineField: string = await this.waitForTextResponse(msg, "Do you want to make this field inline? Type `yes` or `no`.", 5, message);
							if (!this.evaluateResponse(inlineField)) {
								isChanging = false;
								return;
							}
							if (inlineField === "yes") {
								inline = true;
								break;
							}
							else if (inlineField === "no") {
								inline = false;
								break;
							}
							else {
								MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_CHOICE_CHOICE", null, "yes", "no"), msg.channel as TextChannel);

							}
						}
						embed.addFields({
							name: title,
							value: value,
							inline: inline
						});
					}
					else {
						const prompt: string = await this.waitForTextResponse(msg, "Please type the name of the field you want to remove. Be as specific as possible.", 256, message);
						for (let i = 0; i < embed.fields.length; i++) {
							if (embed.fields[i].name.includes(prompt)) {
								embed.fields.splice(i, 1);
								break;
							}
						}
					}
				}
				else if (r.emoji.name === "📕") {
					// customize footer
					const resp: string = await this.waitForTextResponse(msg, "What should the footer of this embed be?", 2048, message);
					// edit
					if (!this.evaluateResponse(resp)) {
						await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
						isChanging = false;
						return;
					}

					let item: string = "";
					if (embed.footer !== null && typeof embed.footer.text !== "undefined") {
						item = embed.footer.text;
					}

					if (this.exceedsLimit(embed, item, 256)) {
						MessageUtil.send(this.createMsgEmbed(msg, "Character Limit Exceeded!", "Your embed will exceed the 6,000 character limit with the addition or edit of this item. Please try again."), msg.channel as TextChannel);
						await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
						isChanging = false;
						return;
					}
					embed.setFooter(resp);
				}
				else if (r.emoji.name === "🖌") {
					// customize thumbnail
					const resp: string = await this.waitForTextResponse(msg, "What should the thumbnail of this embed be? Input a URL, `remove` (to remove your current thumbnail), `guild`, or `me`.", 10000, message);
					// edit
					if (!this.evaluateResponse(resp)) {
						await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
						isChanging = false;
						return;
					}

					if (resp === "remove") {
						embed.setThumbnail(""); // remove thumbnail 
					}
					else if (resp === "guild" && guild.iconURL() !== null) {
						embed.setThumbnail(guild.iconURL() as string);
					}
					else if (resp === "me") {
						embed.setThumbnail(message.author.displayAvatarURL());
					}
					else {
						if (this.checkURL(resp)) {
							embed.setThumbnail(resp);
						}
						else {
							await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
							isChanging = false;
							return;
						}
					}
				}
				else if (r.emoji.name === "📷") {
					// customize image
					const resp: string = await this.waitForTextResponse(msg, "What should the image of this embed be? Input a URL, `remove` (to remove your current image), `guild`, or `me`.", 10000, message);
					if (!this.evaluateResponse(resp)) {
						await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
						isChanging = false;
						return;
					}

					if (resp === "remove") {
						embed.setImage(""); // remove thumbnail 
					}
					else if (resp === "guild" && guild.iconURL() !== null) {
						embed.setImage(guild.iconURL() as string);
					}
					else if (resp === "me") {
						embed.setImage(message.author.displayAvatarURL());
					}
					else {
						if (this.checkURL(resp)) {
							embed.setImage(resp);
						}
						else {
							await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
							isChanging = false;
							return;
						}
					}
				}
				else if (r.emoji.name === "🌈") {
					// customize desc
					let response: number;
					let resp: string;
					while (true) {
						resp = await this.waitForTextResponse(msg, "What should the color of this embed be? Please input a HEX value (search up `color picker` on Google).", 100, message);
						if (!this.evaluateResponse(resp)) {
							await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
							isChanging = false;
							return;
						}
						if (resp.includes("#")) {
							response = this.HEXToVBColor(resp);
							break;
						}
						else {
							MessageUtil.send(this.createMsgEmbed(msg, "Invalid Color Added", "Please input a valid color HEX value. Color HEX values start with a #."), msg.channel as TextChannel);

						}
					}
					// edit
					embed.setColor(response);
					await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
				}
				else if (r.emoji.name === "💾") {
					// begin saving embed
					await msg.delete().catch(() => { });
					await embedMessage.delete().catch(() => { });
					interact.stop();
					const embedPrompt: MessageEmbed = this.createMsgEmbed(msg, "Select Location To Send", "Please mention a channel or give me the ID of the channel where you want this embed to be sent to. To cancel, type `cancel`. To __edit__ a message instead of send, type the message ID after the channel.");
					msg.channel.send(embedPrompt).then(promptMsg => {
						const collector: MessageCollector = new MessageCollector(msg.channel as TextChannel, m => m.author.id === message.author.id, {
							time: 600000
						});
						collector.on("collect", async (m: Message) => {
							if (m.content === "cancel") {
								collector.stop();
								return;
							}

							let data: string[] = m.content.split(" ");

							let chan: TextChannel | string = m.mentions.channels.first() || data[0];
							let resolvedChannel: TextChannel | null = null;

							if (typeof chan === "string") {
								if (guild.channels.cache.filter(x => x.type === "text").has(chan)) {
									resolvedChannel = guild.channels.cache.get(chan) as TextChannel;
								}
							}
							else {
								resolvedChannel = chan;
							}

							if (resolvedChannel === null) {
								MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_CHANNELS_FOUND", null), msg.channel as TextChannel);
								return;
							}
							if (resolvedChannel.permissionsFor(guild.me as GuildMember) !== null) {
								if (!(resolvedChannel.permissionsFor(guild.me as GuildMember) as Readonly<Permissions>).has(["SEND_MESSAGES", "READ_MESSAGE_HISTORY"])) {
									MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_CHAN_PERMISSIONS", null, "READ_MESSAGES", "SEND_MESSAGES"), msg.channel as TextChannel);
									return;
								}
							}

							await m.delete().catch(() => { });

							try {
								const channelMsgs: Message = await resolvedChannel.messages.fetch(data[1]);
								if (channelMsgs.author.id === (msg.client.user as ClientUser).id) {
									channelMsgs.edit(embed).catch(e => { });
								}
							}
							catch (e) {
								(resolvedChannel as TextChannel).send(embed).catch(() => { });
							}

							collector.stop();
						});

						collector.on("end", () => {
							(promptMsg as Message).delete().catch(() => { });
						});
					});
					return;
					// end save embed
				}
				else if (r.emoji.name === "❌") {
					await msg.delete().catch(() => { });
					embedMessage.delete().catch(() => { });
					interact.stop();
					return;
				}

				await embedMessage.edit(embed);
				isChanging = false;
				await msg.edit(this.editEmbedWithLimit(this.introEmbed, embed)).catch(() => { });
				return;
			});

			interact.on("end", async (collected: Collection<string, MessageReaction>, reason: string) => {
				if (reason === "time") {
					await msg.delete().catch(() => { });
					embedMessage.delete().catch(() => { });
					return;
				}
			});
		});
	}

	/**Checks if a URL is an image or not. */
	private checkURL(url: string) {
		return (url.match(/\.(jpeg|jpg|gif|png)$/) != null);
	}

	/**Evaluates a response and checks to make sure system didn't end it. */
	private evaluateResponse(resp: string): boolean {
		if (resp === "CANCEL_PROCESS"
			|| resp === "NO_RESP") {
			return false;
		}
		return true;
	}

	/**Waits for a text response then returns it. This will edit the original embed to show the question. */
	private async waitForTextResponse(msg: Message, prompt: string, limit: number, origMessage: Message): Promise<string> {
		return new Promise(async (resolve) => {
			const collector: MessageCollector = new MessageCollector(msg.channel as TextChannel, m => m.author.id === origMessage.author.id, {
				time: 120000
			});

			await msg.edit(this.createMsgEmbed(msg, "Prompt", prompt));

			collector.on("collect", async (m: Message) => {
				await m.delete().catch(() => { });
				if (m.content === "cancel") {
					resolve("CANCEL_PROCESS");
				}

				if (m.content.length > limit) {
					MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "MSG_TOO_LONG", null, limit.toString()), msg.channel as TextChannel);

					return;
				}
				collector.stop();
				resolve(m.content);
			});

			collector.on("end", (collected, reason) => {
				if (reason === "time") {
					resolve("NO_RESP")
				}
			})
		});
	}

	/**
	 * Checks to see if the addition of an item will cause the embed to exceed the limit.
	 * @param {MessageEmbed} embed The embed to edit. 
	 * @param {string | null} item The original item (i.e. what `resp` will be replacing). 
	 * @param {string | number} resp Either the NEW item or the length of the NEW item or the expected/maximum length of the NEW item.
	 * @returns {boolean} Whether `resp` will exceed an embed's character count.  
	 */
	private exceedsLimit(embed: MessageEmbed, item: string | null, resp: string | number): boolean {
		return embed.length - (item !== null ? item.length : 0) + (typeof resp === "string" ? resp.length : resp) > SendEmbedCommand.maxEmbedCharacters;
	}

	/**Edits the introduction embed with info from the resultant embed. */
	private editEmbedWithLimit(embed: MessageEmbed, rEmbed: MessageEmbed): MessageEmbed {
		embed.setFooter(`Fields Used: ${rEmbed.fields.length}/25 • Characters Used: ${rEmbed.length}/6000`);
		return embed;
	}

	/**Converts HEX value to its respective integer value. */
	private HEXToVBColor(rrggbb: string): number {
		return parseInt(rrggbb.replace(/^#/, ''), 16);
	}

	/**
	 * Produces a simple embed.
	 * @param {Message} message The message object.
	 * @param {string} title The title for the embed.
	 * @param {string} desc The description for the embed.
	 * @param {EmbedField[]} [fields] The fields for the embed.
	 * @param {string} [footer] The footer for the field.
	 * @param {string} [image] The image.
	 * @param {string} [thumbnail] The thumbnail.
	 * @returns {MessageEmbed} The MessageEmbed.
	 * @static
	 */
	private createMsgEmbed(message: Message, title: string, desc: string, fields: EmbedField[] = [], footer?: string, image?: string, thumbnail?: string): MessageEmbed {
		const embed = new MessageEmbed()
			.setTitle(title)
			.setDescription(desc)
			.setColor("RANDOM")
			.setTimestamp();
		embed.setAuthor(message.author.tag, message.author.displayAvatarURL());

		for (let i = 0; i < fields.length; i++) {
			embed.addFields({
				name: fields[i].name,
				value: fields[i].value,
				inline: fields[i].inline ? fields[i].inline : false
			});
		}
		if (image && image.match(/\.(jpeg|jpg|gif|png)$/) !== null) {
			embed.setImage(image);
		}
		if (thumbnail && thumbnail.match(/\.(jpeg|jpg|gif|png)$/) !== null) {
			embed.setThumbnail(thumbnail);
		}
		if (typeof footer !== "undefined") {
			embed.setFooter(footer);
		}
		return embed;
	}
}

interface EmbedField {
	name: string;
	value: string;
	inline?: boolean;
}