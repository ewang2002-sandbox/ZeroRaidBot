import { Message, User, GuildMember, EmojiResolvable, MessageReaction, ReactionCollector, Collection, GuildEmoji, ReactionEmoji } from "discord.js";
import { TimeUnit } from "../../Definitions/TimeUnit";

export class FastReactionMenuManager {
	private readonly _botMsg: Message;
	private readonly _targetAuthor: User | GuildMember;
	private readonly _reactionsToUse: EmojiResolvable[];
	private readonly _duration: number;

    /**
     * `FastReactionMenuManager` is a class that allows a bot to react to one of it's messages at a faster speed. Typically, when you use a set of `await <Message>.react(<EmojiResolvable>)`, there is a 1 second delay. Furthermore, with a set of `await`, you have to wait until the bot reacts with all the emojis before the menu is operational, which can be quite tiresome. 
     * 
     * With `FastReactionMenuManager`, there can be up to a 0.5 second delay between reactions, and the menu is automatically operational even if the reactions aren't fully laid out. When a user reacts to one of the emojis, the bot stops reacting with the rest of the emojis, allowing for greater flexibility.
     * @param {Message} botMessage The message, authored by the bot.
     * @param {(User | GuildMember)} targetAuthor The author that will be able to use the reactions.
     * @param {EmojiResolvable[]} reactions The reactions to use.
     * @param {number} duration The duration.
     * @param {TimeUnit} timeUnit THe unit of the time to use with the duration.
     */
	public constructor(
		botMessage: Message,
		targetAuthor: User | GuildMember,
		reactions: EmojiResolvable[],
		duration: number,
		timeUnit: TimeUnit
	) {
		if (!botMessage.author.bot) {
			throw new Error("msg must be from a bot.");
		}

		this._botMsg = botMessage;
		this._targetAuthor = targetAuthor;
		this._reactionsToUse = reactions;
		if (timeUnit === TimeUnit.MILLISECOND) {
			this._duration = duration;
		}
		else if (timeUnit === TimeUnit.SECOND) {
			this._duration = duration * 1000;
		}
		else if (timeUnit === TimeUnit.MINUTE) {
			this._duration = duration * 60000;
		}
		else if (timeUnit === TimeUnit.HOUR) {
			this._duration = duration * 3.6e+6;
		}
		else {
			this._duration = duration * 8.64e+7;
		}
	}

    /**
     * Reacts to the message and starts a ReactionCollector.
     * @param {number} [delay = 750] The delay between reactions. Minimum is 500.
     * @param {boolean} [clearReactsAfter = true] Whether to clear the reactions after the designated person reacts.
     * @returns Either the resolved emoji that has been reacted to, or "TIME_CMD" if time has been reached.
     */
	public react(delay: number = 750, clearReactsAfter: boolean = true): Promise<GuildEmoji | ReactionEmoji | "TIME_CMD"> {
		if (delay < 500) {
			delay = 500;
		}

		return new Promise((resolve, reject) => {
			let i: number = 0;
			const interval: NodeJS.Timeout = setInterval(() => {
				// think of this as a for loop
				// for (let i = 0; i < reactions.length; i++)
				if (i < this._reactionsToUse.length) {
					if (this._botMsg.deleted) {
						clearInterval(interval);
						return; 
					}

					this._botMsg.react(this._reactionsToUse[i]).catch(e => { });
				}
				else {
					clearInterval(interval);
				}
				i++;
			}, delay);


			const reactionCollector: ((r: MessageReaction, u: User) => boolean) = (reaction: MessageReaction, user: User): boolean => {
				return this._reactionsToUse.includes(reaction.emoji.name) && user.id === this._targetAuthor.id;
			};

			const reactCollector: ReactionCollector = this._botMsg.createReactionCollector(reactionCollector, {
				max: 1,
				time: this._duration
			});

			reactCollector.on("collect", (r: MessageReaction) => {
				return resolve(r.emoji);
			});

			reactCollector.on("end", async (collected: Collection<string, MessageReaction>, reason: string) => {
				clearInterval(interval);
				if (clearReactsAfter) {
					await this._botMsg.reactions.removeAll().catch(e => { });
				}

				if (reason === "time") {
					return resolve("TIME_CMD");
				}
			});
		});
	}



	// STATIC METHODS BELOW


    /**
	 * Reacts to a message fast. This static method should be used instead of the class as a whole if all you need is to react to a message at a faster rate than what is allowed. 
	 * @param {Message} msg The message to react to fast.
	 * @param {EmojiResolvable[]} reactions The set of reactions to use.
	 * @param {number} [intervalTime = 500] The interval time, in ms.
	 */
	public static reactFaster(msg: Message, reactions: EmojiResolvable[], intervalTime: number = 750): void {
		let i: number = 0;
		const interval: NodeJS.Timeout = setInterval(() => {
			// think of this as a for loop
			// for (let i = 0; i < reactions.length; i++)
			if (i < reactions.length) {
				if (msg.deleted) {
					clearInterval(interval);
					return; 
				}

				msg.react(reactions[i]).catch(e => { });
			}
			else {
				clearInterval(interval);
			}
			i++;
		}, intervalTime);
	}

    /**
	 * Reacts to a message using your typical async/await. This isn't the fastest way to react to a message, and this method won't resolve until all emojis are reacted with (leading to delays), but it's the safest. 
     * 
     * This method REQUIRES the use of `await`.
	 * @param msg The message to react to fast.
	 * @param reactions The set of reactions to use.
	 */
	public static async reactSafe(msg: Message, reactions: EmojiResolvable[]): Promise<void> {
		for await (const reaction of reactions) {
			await msg.react(reaction).catch(e => { });
		}
	}

    /**
     * Use this method if you want to wait for a person to react to a message.
     * @param {Message} botMessage The message, authored by the bot.
     * @param {(User | GuildMember)} targetAuthor The author that will be able to use the reactions.
     * @param {EmojiResolvable[]} reactions The reactions to use.
     * @param {number} [time = 120000] The time to use, in milliseconds.
     */
	public static async getReactionFromMessage(
		botMessage: Message,
		targetAuthor: User | GuildMember,
		reactions: EmojiResolvable[],
		time: number = 2 * 60 * 1000
	): Promise<GuildEmoji | ReactionEmoji | "TIME_CMD"> {
		return new Promise(async (resolve, reject) => {
			const reactionCollector: ((r: MessageReaction, u: User) => boolean) = (reaction: MessageReaction, user: User): boolean => {
				return reactions.includes(reaction.emoji.name) && user.id === targetAuthor.id;
			};

			const reactCollector: ReactionCollector = botMessage.createReactionCollector(reactionCollector, {
				time: time,
				max: 1
			});

			reactCollector.on("collect", (r: MessageReaction) => {
				return resolve(r.emoji);
			});

			reactCollector.on("end", async (collected: Collection<string, MessageReaction>, reason: string) => {
				await botMessage.reactions.removeAll().catch(e => { });
				if (reason === "time") {
					return resolve("TIME_CMD");
				}
			});
		});
	}
}