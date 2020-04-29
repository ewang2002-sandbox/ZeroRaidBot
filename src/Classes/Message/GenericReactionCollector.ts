import { Message, User, EmojiResolvable, MessageReaction, ReactionCollector, Collection, GuildMember } from "discord.js";
import { TimeUnit } from "../../Definitions/TimeUnit";

/**
 * A simple collector that gets 1 reaction and returns it.
 * @param {Message} botMessage The bot message. 
 * @param {User} authorOfOriginalMessage The user that sent the ORIGINAL message. 
 * @param {EmojiResolvable[]} emojis The emojis to react with. 
 * @param {number} maxDuration The duration (associate with `timeUnit`) 
 * @param {TimeUnit} timeUnit The unit of time to use (associate with `maxDuration`). 
 */
export async function genericReactionCollector(
    botMessage: Message,
    authorOfOriginalMessage: User | GuildMember,
    emojis: EmojiResolvable[],
    maxDuration: number,
    timeUnit: TimeUnit
): Promise<MessageReaction | "TIME"> {
    return new Promise(async (resolve) => {
        let duration: number;

        if (timeUnit === TimeUnit.MILLISECOND) {
			duration = maxDuration;
		}
		else if (timeUnit === TimeUnit.SECOND) {
			duration = maxDuration * 1000;
		}
		else if (timeUnit === TimeUnit.MINUTE) {
			duration = maxDuration * 60000;
		}
		else if (timeUnit === TimeUnit.HOUR) {
			duration = maxDuration * 3.6e+6;
		}
		else {
			duration = maxDuration * 8.64e+7;
        }
        
        const reactFilter: ((r: MessageReaction, u: User) => boolean) = (reaction: MessageReaction, user: User) => {
            return emojis.includes(reaction.emoji.name) && user.id === authorOfOriginalMessage.id;
        }

        const reactCollector: ReactionCollector = botMessage.createReactionCollector(reactFilter, {
            time: maxDuration,
            max: 1
        });

        reactCollector.on("collect", async (reaction: MessageReaction, user: User) => {
            await reaction.remove().catch(e => { });
            resolve(reaction);
        });

        reactCollector.on("end", async (collected: Collection<string, MessageReaction>, reason: string) => {
            await botMessage.reactions.removeAll().catch(e => { });
            if (reason === "time") {
                return "TIME";
            }
        });
    });
}