import { ISection } from "../Templates/ISection";
import { TextChannel, MessageReaction, Guild, GuildMember, MessageEmbed, Emoji } from "discord.js";
import { AFKDungeon } from "../Constants/AFKDungeon";
import { MessageUtil } from "../Utility/MessageUtil";
import { DateUtil } from "../Utility/DateUtil";
import { Zero } from "../Zero";

export module ReactionLoggingHandler {
	let HasExecuted: boolean = false;
	const AllKeyEmojis: [string, string][] = [];
	const MessageSendQueue: [TextChannel, MessageEmbed][] = [];

	export async function reacted(guild: Guild, reaction: MessageReaction, user: GuildMember, allSections: ISection[], type: "REACT" | "UNREACT"): Promise<void> {
		const sectionWithAfkCheck: ISection | undefined = allSections
			.find(x => x.channels.afkCheckChannel === reaction.message.channel.id);

		if (typeof sectionWithAfkCheck === "undefined") {
			return;
		}

		const reactLogChan: TextChannel | undefined = guild.channels.cache
			.get(sectionWithAfkCheck.channels.logging.reactionLoggingChannel) as TextChannel | undefined;

		if (typeof reactLogChan === "undefined") {
			return;
		}

		if (reaction.emoji.id === null || !AllKeyEmojis.map(x => x[1]).includes(reaction.emoji.id)) {
			return;
		}

		const emoji: Emoji | null = Zero.RaidClient.emojis.resolve(reaction.emoji.id);
		if (typeof emoji === "undefined") {
			return; 
		}
		
		const embed: MessageEmbed = MessageUtil.generateBlankEmbed(user.user, type === "REACT" ? "GREEN" : "RED");
		if (type === "REACT") {
			embed.setTitle("✅ Reaction Added.")
				.setDescription(`⇒ **Member:** ${user} (${user.displayName})\n⇒ **Reaction Added:** ${emoji} (\`${reaction.emoji.name}\`)\n⇒ **Time Added:** ${DateUtil.getTime()}\n⇒ **Message:** [Click Here](https://discord.com/channels/${guild.id}/${reaction.message.channel.id}/${reaction.message.id})`)
				.setFooter("Reaction Added.");
		}
		else {
			embed.setTitle("🗑️ Reaction Removed.")
				.setDescription(`⇒ **Member:** ${user} (${user.displayName})\n⇒ **Reaction Removed:** ${emoji} (\`${reaction.emoji.name}\`)\n⇒ **Time Removed:** ${DateUtil.getTime()}\n⇒ **Message:** [Click Here](https://discord.com/channels/${guild.id}/${reaction.message.channel.id}/${reaction.message.id})`)
				.setFooter("Reaction Removed.");
		}

		MessageSendQueue.push([reactLogChan, embed]);
	}

	async function queueSend(): Promise<void> {
		setInterval(async () => {
			const data: [TextChannel, MessageEmbed][] = MessageSendQueue.splice(0, 1);
			if (data.length !== 0) {
				data[0][0].send(data[0][1]).catch(e => { });
			}
		}, 2 * 1000);
	}

	export function preLoadAllKeyEmojis(): void {
		if (HasExecuted) {
			return;
		}

		HasExecuted = true;
		for (const afk of AFKDungeon) {
			for (const key of afk.keyEmojIDs) {
				AllKeyEmojis.push([key.keyEmojiName, key.keyEmojID]);
			}
		}

		queueSend();
	}
}