import { Collection, VoiceChannel, Message, EmojiResolvable } from "discord.js";

export module OtherUtil {
    /**
     * Gets all the voice channels numbers, sorted. 
     * @param {Collection<string, VoiceChannel>} vcs The voice channels. 
     * @returns {number[]} An array containing all the VC numbers. 
     */
    export function getAllVoiceChannelNumbers(vcs: Collection<string, VoiceChannel>): number[] {
        const nums: number[] = [];
        for (const [, vc] of vcs) {
            // last split arg
            const vcNum: number = Number.parseInt(vc.name.split(" ")[vc.name.split(" ").length - 1]);
            if (Number.isNaN(vcNum)) {
                continue;
            }
            nums.push(vcNum);
        }
        return nums.sort();
    }

    /**
	 * Reacts to a message fast.
	 * @param msg The message to react to.
	 * @param reactions The set of reactions to use.
	 */
	export function reactFaster(msg: Message, reactions: EmojiResolvable[]): void {
		let i: number = 0;
		const interval: NodeJS.Timeout = setInterval(() => {
			// think of this as a for loop
			// for (let i = 0; i < reactions.length; i++)
			if (i < reactions.length) { 
				msg.react(reactions[i]).catch(e => { });
			}
			else {
				clearInterval(interval);
			}
			i++;
		}, 500);
    }
    
    /**
     * Waits a certain amount of time before resolving the promise.
     * @param {number} ms The time to wait, in milliseconds. 
     */
    export async function waitFor(ms: number): Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, ms);
        });
    }
}