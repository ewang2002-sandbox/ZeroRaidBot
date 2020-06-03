import { Message, EmojiResolvable, MessageReaction, ReactionCollector, User, GuildMember, Collection, GuildEmoji, ReactionEmoji } from "discord.js";

export async function getReactionFromMessage(
    botMessage: Message, 
    targetAuthor: User | GuildMember, 
    reactions: EmojiResolvable[],
    time: number = 2 * 60 * 1000
): Promise<GuildEmoji | ReactionEmoji | "TIME"> {
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

        reactCollector.on("end", (collected: Collection<string, MessageReaction>, reason: string) => {
            if (reason === "time") {
                return resolve("TIME");
            }
        });
    });
}