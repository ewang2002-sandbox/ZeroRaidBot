import { MessageEmbed, Message, MessageCollector, Collection, MessageOptions, TextChannel, Guild, Role, GuildMember, Permissions, PartialTextBasedChannelFields, User, GuildChannel, GuildEmoji, EmojiResolvable, ReactionCollector, MessageReaction, Emoji } from "discord.js";
import { MessageUtil } from "../../Utility/MessageUtil";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { FastReactionMenuManager } from "../Reaction/FastReactionMenuManager";

type IGenericMsgCollectorArguments = {
	/**
	 * The cancel flag. Any message with the cancel flag as its content will force the method to return "CANCEL_CMD"
	 * @default "cancel"
	 */
	cancelFlag?: string;

	/**
	 * Whether to delete any messages the author sends (for the collector) after it has been sent or not.
	 * @default true
	 */
	deleteResponseMessage?: boolean;

	/**
	 * Reactions to use for the ReactionCollector. If no reactions are specified, the ReactionCollector will not be used.
	 * @default [] 
	 */
	reactions?: EmojiResolvable[];
	
	/**
	 * Whether to react to the message with the reactions defined in `<IGenericMsgCollectorArguments>.reactions`.
	 * @default false
	 */
	reactToMsg?: boolean;

	/**
	 * If defined, uses an old message instead of sending a new one.
	 */
	oldMsg?: Message;

	/**
	 * Deletes the bot-sent message after the collector expires.
	 * @default true
	 */
	deleteMsg?: boolean;

	/**
	 * Whether to remove ALL reactions after the collector is done or not. If `deleteMsg` is `true`, `deleteMsg` automatically overwrites whatever value is defined here. NOTE that if a user reacts to a message, the user's reaction will automatically be removed.
	 * @default false
	 */
	removeAllReactionAfterReact?: boolean;
}

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
	private readonly _channel: PartialTextBasedChannelFields;

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
	 * @param {PartialTextBasedChannelFields} targetChannel The channel to send the message to, if applicable. Defaults to the same channel where the message was sent.
	 */
	public constructor(
		obj: Message | User | GuildMember,
		msgToSend: MessageOptions,
		maxDuration: number,
		timeUnit: TimeUnit,
		targetChannel?: PartialTextBasedChannelFields
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
	 * An automatic message collector that will return one thing. This particular method will reuse an old message.
	 * @param func The function to use. This function will be executed and the resultant (return type `T`) will be resolved. Bear in mind that the `send` method takes care of both time management and user cancellation requests; in other words, you just need to implement the actual message response system.
	 * @param {Message} oldMsg Whether to use an old message or not.
	 * @param {boolean} [deleteMsg = false] Whether to delete the bot message after the reaction collector expires.
	 * @param {string} [cancelFlag = "cancel"] The string content that will result in the cancellation of the event.
	 * @param {boolean} [deleteResponseMessages = true] Whether to delete the person's message after he/she responds.
	 * @returns {Promise<T | "CANCEL_CMD" | "TIME_CMD">} The resolved object, or one of two flags: "CANCEL_CMD" if the user canceled their request, or "TIME_CMD" if the time ran out.
	 */
	public async sendWithOldMessage(
		func: (collectedMessage: Message, ...otherArgs: any) => Promise<T | void>,
		oldMsg: Message,
		deleteMsg: boolean = false,
		cancelFlag: string = "cancel",
		deleteResponseMessages: boolean = true
	): Promise<T | "CANCEL_CMD" | "TIME_CMD"> {
		return this.send(func, cancelFlag, deleteResponseMessages, oldMsg, deleteMsg);
	}

	/**
	 * An automatic message collector that will return one thing. For the last two arguments, it is recommended that you use the `sendWithOldMessage` method. 
	 * @param func The function to use. This function will be executed and the resultant (return type `T`) will be resolved. Bear in mind that the `send` method takes care of both time management and user cancellation requests; in other words, you just need to implement the actual message response system.
	 * @param {string} [cancelFlag = "cancel"] The string content that will result in the cancellation of the event.
	 * @param {boolean} [deleteResponseMessages = true] Whether to delete the person's message after he/she responds.
	 * @param {Message} [oldMsg = null] Whether to use an old message or not.
	 * @param {boolean} [deleteMsg = true] Whether to delete the bot message after the reaction collector expires.  
	 * @returns {Promise<T | "CANCEL_CMD" | "TIME_CMD">} The resolved object, or one of two flags: "CANCEL_CMD" if the user canceled their request, or "TIME_CMD" if the time ran out.
	 */
	public async send(
		func: (collectedMessage: Message, ...otherArgs: any) => Promise<T | void>,
		cancelFlag: string = "cancel",
		deleteResponseMessages: boolean = true,
		oldMsg: Message | null = null,
		deleteMsg: boolean = true
	): Promise<T | "CANCEL_CMD" | "TIME_CMD"> {
		return new Promise(async (resolve) => {
			const botMsg: Message = oldMsg === null
				? await this._channel.send({ embed: this._embed, content: this._strContent })
				: oldMsg;
			// TODO: textchannel cast appropriate?
			const msgCollector: MessageCollector = new MessageCollector(this._channel as TextChannel, m => m.author.id === this._originalAuthor.id, {
				time: this._maxDuration
			});
			// RECEIVE COLLECTOR 
			msgCollector.on("collect", async (collectedMsg: Message) => {
				if (deleteResponseMessages) {
					await collectedMsg.delete().catch(() => { });
				}

				if (collectedMsg.content.toLowerCase() === cancelFlag.toLowerCase()) {
					resolve("CANCEL_CMD");
					msgCollector.stop();
					return;
				}

				let resolvedInfo: T = await new Promise(async (resolve) => {
					const response: void | T = await func(collectedMsg, cancelFlag);
					if (typeof response !== "undefined") {
						resolve(response);
					}
				});

				msgCollector.stop();
				resolve(resolvedInfo);
			});

			// END COLLECTOR 
			msgCollector.on("end", async (collected: Collection<string, Message>, reason: string) => {
				if (deleteMsg) {
					await botMsg.delete().catch(() => { });
				}
				if (reason === "time") {
					resolve("TIME_CMD");
				}
			});
		});
	}

	/**
	 * A message collector that also doubles as a reaction collector
	 * @param func The function to use. This function will be executed and the resultant (return type `T`) will be resolved. Bear in mind that the `send` method takes care of both time management and user cancellation requests; in other words, you just need to implement the actual message response system.
	 * @param {IGenericMsgCollectorArguments} [optArgs] Optional arguments, if any.
	 * @returns {Promise<T | Emoji | "CANCEL_CMD" | "TIME_CMD">} The resolved object, or one of two flags: "CANCEL_CMD" if the user canceled their request, or "TIME_CMD" if the time ran out. This may also return the results of a reaction.
	 */
	public async sendWithReactCollector(
		func: (collectedMessage: Message, ...otherArgs: any) => Promise<T | void>,
		optArgs?: IGenericMsgCollectorArguments
	): Promise<T | Emoji | "CANCEL_CMD" | "TIME_CMD"> {
		let msgReactions: EmojiResolvable[] = [];
		let cancelFlag: string = "cancel";
		let deleteResponseMsg: boolean = true;
		let reactToMsg: boolean = false; 
		let botMsg: Message = typeof optArgs !== "undefined" && typeof optArgs.oldMsg !== "undefined"
			? optArgs.oldMsg
			: await this._channel.send({ embed: this._embed, content: this._strContent });
		let deleteBotMsgAfterDone: boolean = true;
		let removeAllReactionAfterReact: boolean = false; 

		if (typeof optArgs !== "undefined") {
			if (typeof optArgs.cancelFlag !== "undefined") {
				cancelFlag = optArgs.cancelFlag;
			}

			if (typeof optArgs.deleteResponseMessage !== "undefined") {
				deleteResponseMsg = optArgs.deleteResponseMessage;
			}

			if (typeof optArgs.reactions !== "undefined") {
				msgReactions = optArgs.reactions;
			}

			if (typeof optArgs.reactToMsg !== "undefined") {
				reactToMsg = optArgs.reactToMsg;
			}

			if (typeof optArgs.deleteMsg !== "undefined") {
				deleteBotMsgAfterDone = optArgs.deleteMsg;
			}

			if (typeof optArgs.removeAllReactionAfterReact !== "undefined") {
				removeAllReactionAfterReact = optArgs.removeAllReactionAfterReact;
			}
		}

		if (deleteBotMsgAfterDone) {
			removeAllReactionAfterReact = false;
		}

		return new Promise(async (resolve) => {
			// TODO: textchannel cast appropriate?
			const msgCollector: MessageCollector = new MessageCollector(
				this._channel as TextChannel,
				m => m.author.id === this._originalAuthor.id,
				{
					time: this._maxDuration
				}
			);

			let reactCollector: ReactionCollector | undefined;
			if (msgReactions.length !== 0) {
				if (reactToMsg) {
					FastReactionMenuManager.reactFaster(botMsg, msgReactions);
				}

				reactCollector = new ReactionCollector(
					botMsg,
					(reaction: MessageReaction, user: User): boolean => {
						return msgReactions.includes(reaction.emoji.name) && user.id === this._originalAuthor.id;
					},
					{
						time: this._maxDuration,
						max: 1
					}
				);

				reactCollector.on("collect", async (reaction: MessageReaction, user: User) => {
					await reaction.remove().catch(e => { });
					msgCollector.stop();
					return resolve(reaction.emoji);
				});
			}

			// RECEIVE COLLECTOR 
			msgCollector.on("collect", async (collectedMsg: Message) => {
				if (removeAllReactionAfterReact) {
					await collectedMsg.reactions.removeAll().catch(e => { });
				}
				
				if (deleteResponseMsg) {
					await collectedMsg.delete().catch(() => { });
				}

				if (collectedMsg.content.toLowerCase() === cancelFlag.toLowerCase()) {
					resolve("CANCEL_CMD");
					msgCollector.stop();
					return;
				}

				let resolvedInfo: T = await new Promise(async (resolve) => {
					const response: void | T = await func(collectedMsg, cancelFlag);
					if (typeof response !== "undefined") {
						resolve(response);
					}
				});

				msgCollector.stop();
				if (typeof reactCollector !== "undefined") {
					reactCollector.stop();
				}
				resolve(resolvedInfo);
			});

			// END COLLECTOR 
			msgCollector.on("end", async (collected: Collection<string, Message>, reason: string) => {
				if (deleteBotMsgAfterDone) {
					await botMsg.delete().catch(() => { });
				}
				if (reason === "time") {
					resolve("TIME_CMD");
				}
			});
		});
	}

	// STATIC METHODS BELOW

	/**
	 * A sample function, to be used as a parameter for the `send` method, that will wait for someone to respond with either a TextChannel mention or ID. THIS FUNCTION MUST ONLY BE USED IN A GUILD.
	 * @param {Message} msg The message that triggered this class. This is generally a message that results in the exeuction of the command. 
	 * @param {PartialTextBasedChannelFields} pChan The channel to send any messages to.
	 * @example 
	 * const gmc: GenericMessageCollector<TextChannel> = new GenericMessageCollector<TextChannel>(msg, { embed: embed }, 1, TimeUnit.MINUTE);
	 * const response: TextChannel | "TIME_CMD" | "CANCEL_CMD" = await gmc.send(GenericMessageCollector.getChannelPrompt(msg)); 
	 */
	public static getChannelPrompt(
		msg: Message,
		pChan: PartialTextBasedChannelFields
	): (m: Message) => Promise<void | TextChannel> {
		if (msg.guild === null) {
			throw new Error("The message object provided for this method was not sent from a guild.");
		}
		return async (m: Message): Promise<void | TextChannel> => {
			const channel: GuildChannel | undefined = m.mentions.channels.first();
			let resolvedChannel: GuildChannel;
			if (typeof channel === "undefined") {
				let reCh: GuildChannel | undefined = (msg.guild as Guild).channels.cache.get(m.content) as GuildChannel | undefined;
				if (typeof reCh === "undefined") {
					await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_ID", null, "channel"), pChan);
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
					await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_CHAN_PERMISSIONS", null, "`VIEW_CHANNEL`", "`SEND_MESSAGES`", "`ADD_REACTIONS`", "`READ_MESSAGE_HISTORY`"), pChan);
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
	 * @param {PartialTextBasedChannelFields} channel The channel to send messages to.
	 * @param {number} [min] The minimum, inclusive.
	 * @param {number} [max] The maximum, inclusive.
	 * @example 
	 * const gmc: GenericMessageCollector<number> = new GenericMessageCollector<number>(msg, { embed: embed }, 1, TimeUnit.MINUTE);
	 * const response: number | "TIME_CMD" | "CANCEL_CMD" = await gmc.send(GenericMessageCollector.getNumber(msg)); 
	 */
	public static getNumber(
		channel: PartialTextBasedChannelFields,
		min?: number,
		max?: number
	): (m: Message) => Promise<void | number> {
		return async (m: Message): Promise<void | number> => {
			const num: number = Number.parseInt(m.content);
			if (Number.isNaN(num)) {
				MessageUtil.send({ content: `${m.author}, please input a valid number.` }, channel);
				return;
			}

			if (typeof min !== "undefined" && num < min) {
				MessageUtil.send({ content: `${m.author}, please input a number that is greater than or equal to \`${min}\`.` }, channel);
				return;
			}

			if (typeof max !== "undefined" && max < num) {
				MessageUtil.send({ content: `${m.author}, please input a number that is lower than or equal to \`${max}\`.` }, channel);
				return;
			}

			return num;
		}
	}

	/**
	 * A sample function, to be used as a parameter for the `send` method, that will wait for someone to respond with a role ID or mention. THIS FUNCTION MUST ONLY BE USED IN A GUILD.
	 * @param {Message} msg The message that triggered this class. This is generally a message that results in the exeuction of the command. 
	 * @param {PartialTextBasedChannelFields} pChan The channel to send messages to.
	 * @example 
	 * const gmc: GenericMessageCollector<Role> = new GenericMessageCollector<Role>(msg, { embed: embed }, 1, TimeUnit.MINUTE);
	 * const response: Role | "TIME_CMD" | "CANCEL_CMD" = await gmc.send(GenericMessageCollector.getRolePrompt(msg)); 
	 */
	public static getRolePrompt(msg: Message, pChan: PartialTextBasedChannelFields): (collectedMessage: Message) => Promise<void | Role> {
		if (msg.guild === null) {
			throw new Error("The message object provided for this method was not sent from a guild.");
		}
		return async (m: Message): Promise<void | Role> => {
			const role: Role | undefined = m.mentions.roles.first();
			let resolvedRole: Role;
			if (typeof role === "undefined") {
				let reRo: Role | undefined = (msg.guild as Guild).roles.cache.get(m.content) as Role | undefined;
				if (typeof reRo === "undefined") {
					await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_ID", null, "role"), pChan);
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
	 * @param {PartialTextBasedChannelFields} pChan The channel where messages should be sent to.
	 * @param {StringPromptOptions} [options] Options, if any.
	 * @example 
	 * const gmc: GenericMessageCollector<string> = new GenericMessageCollector<string>(msg, { embed: embed }, 1, TimeUnit.MINUTE);
	 * const response: string | "TIME_CMD" | "CANCEL_CMD" = await gmc.send(GenericMessageCollector.getStringPrompt(msg)); 
	 */
	public static getStringPrompt(pChan: PartialTextBasedChannelFields, options?: StringPromptOptions): (collectedMessage: Message) => Promise<void | string> {
		return async (m: Message): Promise<void | string> => {
			if (m.content === null) {
				MessageUtil.send({ content: `${m.author}, you did not provide any content. Try again. ` }, pChan);
				return;
			}

			if (typeof options !== "undefined") {
				if (typeof options.minCharacters !== "undefined" && m.content.length < options.minCharacters) {
					MessageUtil.send({ content: `${m.author}, the length of your input is too low; it must be at least ${options.minCharacters} characters long. Please try again.` }, pChan);
					return;
				}

				if (typeof options.maxCharacters !== "undefined" && options.maxCharacters < m.content.length) {
					MessageUtil.send({ content: `${m.author}, the length of your input is too high; it must be at most ${options.maxCharacters} characters long. Please try again.` }, pChan);
					return;
				}

				if (typeof options.regexToPass !== "undefined") {
					if (!options.regexToPass.test(m.content)) {
						let errorMessage: string = options.regexFailMessage || "Your input failed to pass the RegExp test. Please try again.";
						MessageUtil.send({ content: `${m.author}, your input is invalid. Please try again.` }, pChan);
						return;
					}
				}
			}
			return m.content;
		}
	}

	/**
	 * A sample function, to be used as a parameter for the `send` method, that will wait for someone to respond with `yes` or `no` and return a boolean value associated with that choice.
	 * @param {PartialTextBasedChannelFields} pChan The channel where messages should be sent to.
	 * @example 
	 * const gmc: GenericMessageCollector<boolean> = new GenericMessageCollector<boolean>(msg, { embed: embed }, 1, TimeUnit.MINUTE);
	 * const response: boolean | "TIME_CMD" | "CANCEL_CMD" = await gmc.send(GenericMessageCollector.getYesNoPrompt(msg)); 
	 */
	public static getYesNoPrompt(pChan: PartialTextBasedChannelFields): (collectedMessage: Message) => Promise<void | boolean> {
		return async (m: Message): Promise<void | boolean> => {
			if (m.content === null) {
				MessageUtil.send({ content: `${m.author}, you did not provide any content. Try again. ` }, pChan);
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