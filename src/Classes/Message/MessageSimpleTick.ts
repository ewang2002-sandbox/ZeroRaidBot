import { Message } from "discord.js";

export class MessageSimpleTick {
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
	 * How long the process should last.
	 */
    private _duration: number;

    /**
     * The content. 
     */
	private _content: string;
	
	/**
	 * The interval responsible for the countdown. 
	 */
	private _interval?: NodeJS.Timeout;

    /**
	 * The constructor for this class.
	 * 
	 * `MessageSimpleTick`, like `MessageAutoTick` is a class that is designed to automatically edit the general message content every 5 seconds with the time left, in seconds. This class SHOULD BE used in conjunction with a `MessageCollector`, `ReactionCollector`, or a `setTimeout`. Furthermore, the time value provided in the third argument MUST EQUAL the time limit set in the collector.
     * @param {Message} msg The message sent by the bot. 
     * @param {string} content The string content.  
     * @param {number} duration The duration of the timeout. 
     */
    public constructor(
        msg: Message,
        content: string,
        duration: number
    ) {
        this._duration = duration;
        this._msg = msg;
        this._content = content;

        if (!this._content.includes("{s}")) {
            throw new Error("No {s} present.");
        }

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

            // remove 5 seconds.
            this._duration -= 5000;

            // edit _msg
            try {
                this._msg.edit({
                    content: this._content
                        .replace(this._minRegex, this.convertTime(this._duration).min.toFixed(0).toString())
                        .replace(this._secRegex, this.convertTime(this._duration).sec.toFixed(0).toString())
                });
            }
            catch (e) {
                // chances are, the _msg was deleted.
                this.disableAutoTick();
            }
        }, 5000);
    }

	/**
	 * Ends the process, stopping the auto-embed updating.
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
}