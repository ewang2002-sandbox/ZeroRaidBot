import { Message, MessageEmbed, EmbedField } from "discord.js";

export class MessageAutoTick {
	/**
	 * The regex used for replacing {m} to the minute value.
	 */
	private readonly _minRegex: RegExp = new RegExp("\{m\}", "gi");

	/**
	 * The regex used for replacing {s} to the second value.
	 */
	private readonly _secRegex: RegExp = new RegExp("\{s\}", "gi");

	/**
	 * The message object.
	 */
	private readonly _msg: Message;

	/**
	 * The embed object.
	 */
	private _embed: MessageEmbed;

	/**
	 * How long the process should last.
	 */
	private _duration: number;

	/**
	 * The base description. This should contain {s} (seconds) and optionally, {m} (minutes).
	 */
	private _baseDesc: string | null;

	/**
	 * The base footer. This should contain {s} (seconds) and optionally, {m} (minutes).
	 */
	private _baseFooter: string | null;

	/**
	 * The interval.
	 */
	private _interval?: NodeJS.Timeout;

	/**
	 * The constructor for this class.
	 * 
	 * `MessageAutoTick` is a class that is designed to automatically edit embeds every 5 seconds with a new footer or description -- the time left, in seconds. This class SHOULD BE used in conjunction with a `MessageCollector`, `ReactionCollector`, or a `setTimeout`. Furthermore, the time value provided in the third argument MUST EQUAL the time limit set in the collector.
	 * @param {Message} msg The message that contains the embed.
	 * @param {MessageEmbed} embed The embed. 
	 * @param {number} duration How long the process should last. The time value provided MUST EQUAL the time limit set in the collector.
	 * @param {string | null} [baseDesc] The base description. This should contain {s} (seconds) and optionally, {m} (minutes).
	 * @param {string | null} [baseFooter] The base footer. This should contain {s} (seconds) and optionally, {m} (minutes). 
	 */
	public constructor(
		msg: Message,
		embed: MessageEmbed,
		duration: number,
		baseDesc?: string | null,
		baseFooter?: string | null,
		fields?: EmbedField[] 
	) {
		this._msg = msg;
		this._embed = embed;

		if (typeof baseDesc === "undefined") {
			this._baseDesc = null;
		}
		else {
			this._baseDesc = baseDesc;
		}

		if (typeof baseFooter === "undefined") {
			this._baseFooter = null;
		}
		else {
			this._baseFooter = baseFooter
		}

		this._duration = duration;

		this.run();
	}

	/**
	 * Runs the process. This process will edit the footer and description of a MessageEmbed with the specified time left.
	 */
	private async run(): Promise<void> {
		this._interval = setInterval(async () => {
			if (this._duration <= 0) {
				this.disableAutoTick();
				return;
			}

			const newEmbed: MessageEmbed = new MessageEmbed();
			if (this._embed.author !== null) {
				newEmbed.setAuthor(this._embed.author.name, this._embed.author.iconURL);
			}
			newEmbed.setTitle(this._embed.title);
			if (this._embed.color !== null) {
				newEmbed.setColor(this._embed.color);
			}

			if (this._embed.thumbnail !== null) {
				newEmbed.setThumbnail(this._embed.thumbnail.url)
			}

			if (this._embed.image !== null) {
				newEmbed.setImage(this._embed.image.url);
			}

			for (let i = 0; i < this._embed.fields.length; i++) {
				newEmbed.addFields({
					name: this._embed.fields[i].name, 
					value: this._embed.fields[i].value, 
					inline: this._embed.fields[i].inline
				});
			}
			// remove 5 seconds.
			this._duration -= 5000;
			// make new desc and footer
			if (this._baseFooter === null) {
				if (this._embed.footer !== null) {
					newEmbed.setFooter(this._embed.footer.text, this._embed.footer.iconURL);
				}
			}
			else {
				if (this._baseFooter.includes("{m}")) {
					newEmbed.setFooter(
						this._baseFooter
							.replace(this._minRegex, this.convertTime(this._duration).min.toFixed(0).toString())
							.replace(this._secRegex, this.convertTime(this._duration).sec.toFixed(0).toString())
					);
				}
				else {
					newEmbed.setFooter(
						this._baseFooter.replace(this._secRegex, (this._duration / 1000).toFixed(0).toString())
					);
				}
			}

			if (this._baseDesc === null) {
				newEmbed.setDescription(this._embed.description);
			}
			else {
				if (this._baseDesc.includes("{m}")) {
					newEmbed.setDescription(
						this._baseDesc
							.replace(this._minRegex, this.convertTime(this._duration).min.toFixed(0).toString())
							.replace(this._secRegex, this.convertTime(this._duration).sec.toFixed(0).toString())
					);
				}
				else {
					newEmbed.setDescription(
						this._baseDesc.replace(this._secRegex, (this._duration / 1000).toFixed(0).toString())
					);
				}
			}

			// edit _msg
			try {
				this._msg.edit(this._msg.content, newEmbed);
			}
			catch (e) {
				// chances are, the _msg was deleted.
				this.disableAutoTick();
			}

			this._embed = newEmbed;
		}, 5000);
	}

	/**
	 * Ends the process, stopping the auto-_embed updating.
	 */
	public disableAutoTick(): void {
		clearInterval(this._interval as NodeJS.Timeout);
	}

	/**
	 * Converts the milliseconds given into minutes and seconds..
	 * @param {number} miliseconds 
	 * @returns The minutes and seconds remaining. 
	 */
	private convertTime(miliseconds: number): {
		min: number,
		sec: number
	} {
		const totalSeconds = Math.floor(miliseconds / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds - minutes * 60;
		return {
			min: minutes,
			sec: seconds
		};
	}

	/**
	 * Updates the base description with a new base description.
	 * @param {string} baseDesc The new base description to use. 
	 */
	public setBaseDesc(baseDesc: string): void {
		if (!baseDesc.includes("{s}")) {
			throw new Error("No {s} present.");
		}

		this._baseDesc = baseDesc;
	}

	/**
	 * Updates the base footer with a new base footer.
	 * @param {string} baseFooter The new base footer to use. 
	 */
	public setBaseFooter(baseFooter: string): void {
		if (!baseFooter.includes("{s}")) {
			throw new Error("No {s} present.");
		}

		this._baseFooter = baseFooter;
	}
}