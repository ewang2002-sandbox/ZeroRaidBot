import { MessageEmbed, Message, MessageCollector, Collection, MessageOptions, TextChannel, Guild, Role, GuildMember, Permissions, TextBasedChannelFields, User, PartialTextBasedChannelFields, GuildChannel } from "discord.js";
import { MessageUtil } from "../../Utility/MessageUtil";
import { TimeUnit } from "../../Definitions/TimeUnit";

/**
 * A class that sends an embed and resolves a response. Should be used to make code more concise. 
 */
export class GenericMessageCollector<T> {
	/**
	 * The embed to send. 
	 */
	private readonly _embed?: MessageEmbed;

	/**
	 * The string content to send. This will be sent alongside the embed. 
	 */
	private readonly _strContent?: string;

	/**
	 * The author of the message.
	 */
	private readonly _originalAuthor: User;

	/**
	 * The channel to send the message w/ collector to. 
	 */
	private readonly _channel: TextBasedChannelFields;

	/**
	 * The duration to wait. 
	 */
	private readonly _maxDuration: number;

	/**
 	 * A class that sends an embed and resolves a response. Should be used to make code more concise. 
	 * @param {Message | User | GuildMember} obj Either the message, user, or member that is responsible for the instantiation of this class. If this parameter passed is NOT a `Message`, then `targetChannel` (last parameter) must be declared.
	 * @param {MessageOptions} msgToSend What to send. This will be a message, an embed, or both, that a bot will send. 
	 * @param {number} maxDuration The duration of the collector. If you want to do 3 minutes, for example, type `3`.
	 * @param {TimeUnit} timeUnit The unit of time of `maxDuration`. For the previous example of 3 minutes, you would do `TimeUnit.MINUTE`.
	 * @param {TextBasedChannelFields} targetChannel The channel to send the message to, if applicable. Defaults to the same channel where the message was sent.
	 */
	public constructor(
		obj: Message | User | GuildMember, 
		msgToSend: MessageOptions,
		maxDuration: number, 
		timeUnit: TimeUnit, 
		targetChannel?: TextBasedChannelFields
	) {
		if (obj instanceof Message) {
			this._originalAuthor = obj.author;
		}
		else if (obj instanceof User) {
			this._originalAuthor = obj;
		}
		else {
			this._originalAuthor = obj.user;
		}

		if (typeof msgToSend.content !== "undefined") {
			this._strContent = msgToSend.content;
		}

		if (typeof msgToSend.embed !== "undefined") {
			this._embed = new MessageEmbed(msgToSend.embed);
		}

		// case/switch time? 
		if (timeUnit === TimeUnit.MILLISECOND) {
			this._maxDuration = maxDuration;
		}
		else if (timeUnit === TimeUnit.SECOND) {
			this._maxDuration = maxDuration * 1000;
		}
		else if (timeUnit === TimeUnit.MINUTE) {
			this._maxDuration = maxDuration * 60000;
		}
		else if (timeUnit === TimeUnit.HOUR) {
			this._maxDuration = maxDuration * 3.6e+6;
		}
		else {
			this._maxDuration = maxDuration * 8.64e+7;
		}

		if (typeof targetChannel === "undefined") {
			if (obj instanceof Message) {
				this._channel = obj.channel;
			}
			else {
				throw new Error("channel cannot be determined from input.");
			}
		}
		else {
			this._channel = targetChannel;
		}
	}

	/**
	 * A function that takes in a message (from the collector) and does something with it. 
	 * @name MsgCollectorFunc
	 * @function
	 * @param {Message} msg The message object.
	 * @returns {T} The object type. 
	 */
	/**
	 * An automatic message collector that will return one thing. 
	 * @param {MsgCollectorFunc} func The function to use. This function will be executed and the resultant (return type `T`) will be resolved. Bear in mind that the `send` method takes care of both time management and user cancellation requests; in other words, you just need to implement the actual message response system.
	 * @param {boolean} deleteResponseMessages Whether to delete the person's message after he/she responds. 
	 * @returns {Promise<T | "CANCEL" | "TIME">} The resolved object, or one of two flags: "CANCEL" if the user canceled their request, or "TIME" if the time ran out.
	 */
	public async send(
		func: (collectedMessage: Message) => Promise<T | void>,
		deleteResponseMessages: boolean = true
	): Promise<T | "CANCEL" | "TIME"> {
		return new Promise(async (resolve) => {
			const msg: Message = await this._channel.send({ embed: this._embed, content: this._strContent });
			// TODO: textchannel cast appropriate?
			const msgCollector: MessageCollector = new MessageCollector(this._channel as TextChannel, m => m.author.id === this._originalAuthor.id, {
				time: this._maxDuration
			});

			// RECEIVE COLLECTOR 
			msgCollector.on("collect", async (collectedMsg: Message) => {
				if (deleteResponseMessages) {
					await collectedMsg.delete().catch(() => { });
				}

				if (collectedMsg.content.toLowerCase() === "cancel") {
					resolve("CANCEL");
					msgCollector.stop();
					return;
				}

				let resolvedInfo: T = await new Promise(async (resolve) => {
					const response: void | T = await func(collectedMsg);
					if (typeof response !== "undefined") {
						resolve(response);
					}
				});

				msgCollector.stop();
				resolve(resolvedInfo);
			});

			// END COLLECTOR 
			msgCollector.on("end", async (collected: Collection<string, Message>, reason: string) => {
				await msg.delete().catch(() => { });
				if (reason === "time") {
					resolve("TIME");
				}
			});
		});
	}

	/**
	 * A sample function, to be used as a parameter for the `send` method, that will wait for someone to respond with either a TextChannel mention or ID.
	 * @param {Message} msg The message that triggered this class. This is generally a message that results in the exeuction of the command. 
	 * @example 
	 * const gmc: GenericMessageCollector<TextChannel> = new GenericMessageCollector<TextChannel>(msg, { embed: embed }, 1, TimeUnit.MINUTE);
	 * const response: TextChannel | "TIME" | "CANCEL" = await gmc.send(GenericMessageCollector.getChannelPrompt(msg)); 
	 */
	public static getChannelPrompt(msg: Message): (m: Message) => Promise<void | TextChannel> {
		return async (m: Message): Promise<void | TextChannel> => {
			const channel: GuildChannel | undefined = m.mentions.channels.first();
			let resolvedChannel: GuildChannel;
			if (typeof channel === "undefined") {
				let reCh: GuildChannel | undefined = (msg.guild as Guild).channels.cache.get(m.content) as GuildChannel | undefined;
				if (typeof reCh === "undefined") {
					await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_ID", null, "channel"), msg.channel);
					return;
				}
				resolvedChannel = reCh;
			}
			else {
				resolvedChannel = channel;
			}

			const permissions: Readonly<Permissions> | null = resolvedChannel.permissionsFor(((msg.guild as Guild).me as GuildMember));
			if (permissions !== null) {
				if (!(permissions.has("VIEW_CHANNEL") && permissions.has("SEND_MESSAGES") && permissions.has("ADD_REACTIONS") && permissions.has("READ_MESSAGE_HISTORY"))) {
					await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_CHAN_PERMISSIONS", null, "`VIEW_CHANNEL`", "`SEND_MESSAGES`", "`ADD_REACTIONS`", "`READ_MESSAGE_HISTORY`"), msg.channel as TextChannel);
					return;
				}
			}

			if (resolvedChannel instanceof TextChannel) {
				return resolvedChannel;
			}
			else {
				await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("Not a Text Channel").setDescription("Please input an ID associated with a text channel."), msg.channel);
			}
		};
	}

	/**
	 * A sample function, to be used as a parameter for the `send` method, that will wait for someone to respond with a number.
	 * @param {Message} msg The message that triggered this class. This is generally a message that results in the exeuction of the command. 
	 * @param {number} [min] The minimum, inclusive.
	 * @param {number} [max] The maximum, inclusive.
	 * @example 
	 * const gmc: GenericMessageCollector<number> = new GenericMessageCollector<number>(msg, { embed: embed }, 1, TimeUnit.MINUTE);
	 * const response: number | "TIME" | "CANCEL" = await gmc.send(GenericMessageCollector.getNumber(msg)); 
	 */
	public static getNumber(msg: Message, min?: number, max?: number): (m: Message) => Promise<void | number> {
		return async (m: Message): Promise<void | number> => {
			const num: number = Number.parseInt(m.content);
			if (Number.isNaN(num)) {
				MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_NUMBER_INPUT", null), msg.channel as TextChannel);
				return;
			}

			if (typeof min !== "undefined" && num < min) {
				MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("Number Too Low").setDescription(`The number you selected is lower than ${min}. Try again.`), msg.channel as TextChannel);
				return;
			}

			if (typeof max !== "undefined" && max < num) {
				MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("Number Too High").setDescription(`The number you selected is higher than ${max}. Try again.`), msg.channel as TextChannel);
				return;
			}

			return num;
		}
	}

	/**
	 * A sample function, to be used as a parameter for the `send` method, that will wait for someone to respond with a role ID or mention.
	 * @param {Message} msg The message that triggered this class. This is generally a message that results in the exeuction of the command. 
	 * @example 
	 * const gmc: GenericMessageCollector<Role> = new GenericMessageCollector<Role>(msg, { embed: embed }, 1, TimeUnit.MINUTE);
	 * const response: Role | "TIME" | "CANCEL" = await gmc.send(GenericMessageCollector.getRolePrompt(msg)); 
	 */
	public static getRolePrompt(msg: Message): (collectedMessage: Message) => Promise<void | Role> {
		return async (m: Message): Promise<void | Role> => {
			const role: Role | undefined = m.mentions.roles.first();
			let resolvedRole: Role;
			if (typeof role === "undefined") {
				let reRo: Role | undefined = (msg.guild as Guild).roles.cache.get(m.content) as Role | undefined;
				if (typeof reRo === "undefined") {
					await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_ID", null, "role"), msg.channel as TextChannel);
					return;
				}
				resolvedRole = reRo;
			}
			else {
				resolvedRole = role;
			}
			return resolvedRole;
		};
	}

	/**
	 * A sample function, to be used as a parameter for the `send` method, that will wait for someone to respond and return the response.
	 * @param {Message} msg The message that triggered this class. This is generally a message that results in the exeuction of the command. 
	 * @param {StringPromptOptions} [options] Options, if any.
	 * @example 
	 * const gmc: GenericMessageCollector<string> = new GenericMessageCollector<string>(msg, { embed: embed }, 1, TimeUnit.MINUTE);
	 * const response: string | "TIME" | "CANCEL" = await gmc.send(GenericMessageCollector.getStringPrompt(msg)); 
	 */
	public static getStringPrompt(msg: Message, options?: StringPromptOptions): (collectedMessage: Message) => Promise<void | string> {
		return async (m: Message): Promise<void | string> => {
			if (m.content === null) {
				MessageUtil.generateBuiltInEmbed(msg, "NO_INPUT", null);
				return;
			}

			if (typeof options !== "undefined") {
				if (typeof options.minCharacters !== "undefined" && m.content.length < options.minCharacters) {
					MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("Input Too Low").setDescription(`Your input is too low; it can be a minimum of ${options.minCharacters} characters. Try again.`), msg.channel as PartialTextBasedChannelFields);
					return;
				}

				if (typeof options.maxCharacters !== "undefined" && options.maxCharacters < m.content.length) {
					MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("Input Too High").setDescription(`Your input is too high; it can be a maximum of ${options.maxCharacters} characters. Try again.`), msg.channel as PartialTextBasedChannelFields);
					return;	
				}

				if (typeof options.regexToPass !== "undefined") {
					if (!options.regexToPass.test(m.content)) {
						let errorMessage: string = options.regexFailMessage || "Your input failed to pass the RegExp test. Please try again.";
						MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("Invalid Input").setDescription(errorMessage), msg.channel as PartialTextBasedChannelFields);
						return;
					}
				}
			}
			return m.content;
		}
	}

	/**
	 * A sample function, to be used as a parameter for the `send` method, that will wait for someone to respond with `yes` or `no` and return a boolean value associated with that choice.
	 * @param {Message} msg The message that triggered this class. This is generally a message that results in the exeuction of the command. 
	 * @example 
	 * const gmc: GenericMessageCollector<boolean> = new GenericMessageCollector<boolean>(msg, { embed: embed }, 1, TimeUnit.MINUTE);
	 * const response: boolean | "TIME" | "CANCEL" = await gmc.send(GenericMessageCollector.getYesNoPrompt(msg)); 
	 */
	public static getYesNoPrompt(msg: Message): (collectedMessage: Message) => Promise<void | boolean> {
		return async (m: Message): Promise<void | boolean> => {
			if (m.content === null) {
				MessageUtil.generateBuiltInEmbed(msg, "NO_INPUT", null);
				return;
			}

			if (["yes", "ye", "y"].includes(m.content.toLowerCase())) {
				return true;
			}

			if (["no", "n"].includes(m.content.toLowerCase())) {
				return false;
			}

			return;
		}
	}
}

type StringPromptOptions = {
	minCharacters?: number;
	maxCharacters?: number;
	regexToPass?: RegExp;
	regexFailMessage?: string;
}