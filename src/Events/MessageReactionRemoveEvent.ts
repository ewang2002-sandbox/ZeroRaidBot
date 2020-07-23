import { MessageReaction, User, Message, Guild, PartialUser } from "discord.js";

export async function onMessageReactionRemove(
    reaction: MessageReaction,
    user: User | PartialUser
): Promise<void> {
    if (reaction.message.guild === null) {
        return;
    }

    if (reaction.partial) {
        let fetchedReaction: MessageReaction | void = await reaction.fetch().catch(e => { });
        if (typeof fetchedReaction === "undefined") {
            return;
        }
        reaction = fetchedReaction;
    }

    if (reaction.message.partial) {
        let fetchedMessage: Message | void = await reaction.message.fetch().catch(e => { });
        if (typeof fetchedMessage === "undefined") {
            return;
        }
        reaction.message = fetchedMessage;
    }

    if (reaction.message.type !== "DEFAULT") {
        return;
    }
    // ...
}