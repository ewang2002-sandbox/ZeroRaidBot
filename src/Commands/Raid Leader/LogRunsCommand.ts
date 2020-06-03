import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, TextChannel, MessageCollector, Collection, MessageEmbed, ColorResolvable, GuildMember, EmojiResolvable, GuildEmoji, ReactionEmoji, Guild, PartialTextBasedChannelFields } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { IDungeonData } from "../../Definitions/IDungeonData";
import { NumberUtil } from "../../Utility/NumberUtil";
import { AFKDungeon } from "../../Constants/AFKDungeon";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { ArrayUtil } from "../../Utility/ArrayUtil";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { OtherUtil } from "../../Utility/OtherUtil";
import { getReactionFromMessage } from "../../Classes/ReactionManager";
import { MessageUtil } from "../../Utility/MessageUtil";

export class LogRunsCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Log Runs Command",
				"logruns",
				["logr"],
				"Logs the runs that you have done.",
				["logruns"],
				["logruns"],
				0
			),
			new CommandPermission(
				[],
				[],
				["headRaidLeader", "universalRaidLeader", "universalAlmostRaidLeader"],
				["ALL_RL_TYPE"],
				false
			),
			true,
			false,
			false
		);
	}

	public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
		const guild: Guild = msg.guild as Guild;
		const member: GuildMember = msg.member as GuildMember;

		// is the member a main leader or an assisting leader?
		const initiatorLogTypeEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("Logging Type")
			.setDescription("Please react accordingly.")
			.addField("React With 🇦", "If you are one of the __main__ raid leaders.")
			.addField("React With 🇧", "If you are one of the __assisting__ raid leaders.")
			.addField("React With 🇨", "If you are logging on behalf of someone else.")
			.addField("React With ❌", "If you want to cancel this process.")
			.setColor("RANDOM");
		const reactionsForInitLogType: EmojiResolvable[] = ["🇦", "🇧", "🇨", "❌"];
		const botMsg: Message = await msg.channel.send(initiatorLogTypeEmbed);
		OtherUtil.reactFaster(botMsg, reactionsForInitLogType);
		const resultantReactionForInit: GuildEmoji | ReactionEmoji | "TIME" = await getReactionFromMessage(
			botMsg,
			msg.author,
			reactionsForInitLogType
		);

		if (resultantReactionForInit === "TIME" || resultantReactionForInit.name === "❌") {
			await botMsg.delete().catch(e => { });
			return;
		}

		const mainLeaders: GuildMember[] = [];
		const assistLeaders: GuildMember[] = [];

		if (resultantReactionForInit.name === "🇦") {
			mainLeaders.push(member);
		}
		else if (resultantReactionForInit.name === "🇧") {
			assistLeaders.push(member);
		}

		await botMsg.reactions.removeAll().catch(e => { });

		// check and x reactions
		const checkXReactions: EmojiResolvable[] = ["✅", "❌"];
		let didEndgameDungeons: boolean = false;
		let didRealmClearing: boolean = false;
		let didGeneralDungeons: boolean = false;

		// ask if they did any endgame runs
		const realmClearingAskEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("Realm Clearing")
			.setDescription("Did you do any realm clearing raids?")
			.addField("React With ✅", "If you did any realm clearing.")
			.addField("React With ❌", "If you did __not__ do any realm clearing.")
			.setColor("RANDOM");
		await botMsg.edit(realmClearingAskEmbed).catch(e => { });
		OtherUtil.reactFaster(botMsg, checkXReactions);
		const resultantReactionForRCAsk: GuildEmoji | ReactionEmoji | "TIME" = await getReactionFromMessage(
			botMsg,
			msg.author,
			checkXReactions
		);

		if (resultantReactionForRCAsk === "TIME") {
			await botMsg.delete().catch(e => { });
			return;
		}

		if (resultantReactionForRCAsk.name === "✅") {
			didRealmClearing = true;
		}

		if (!didRealmClearing) {
			// ask for end game
			const endgameAskEmbed: MessageEmbed = new MessageEmbed()
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.setTitle("Endgame Dungeon Raids")
				.setDescription("Did you do any endgame dungeons? Endgame dungeons include the following:\n- Oryx 3\n- Fungal Caverns\n- Lost Halls Raids (Cult, Void, MBC)\n- The Nest\n- Shatters")
				.addField("React With ✅", "If you did any endgame dungeons.")
				.addField("React With ❌", "If you did __not__ do any endgame dungeons.")
				.setColor("RANDOM");
			await botMsg.edit(endgameAskEmbed).catch(e => { });
			OtherUtil.reactFaster(botMsg, checkXReactions);
			const resultantReactionForEndGameAsk: GuildEmoji | ReactionEmoji | "TIME" = await getReactionFromMessage(
				botMsg,
				msg.author,
				checkXReactions
			);

			if (resultantReactionForEndGameAsk === "TIME") {
				await botMsg.delete().catch(e => { });
				return;
			}

			if (resultantReactionForEndGameAsk.name === "✅") {
				didEndgameDungeons = true;
			}

			// ask for general
			const generalAskEmbed: MessageEmbed = new MessageEmbed()
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.setTitle("General Dungeon Raids")
				.setDescription("Did you do any general dungeons? General dungeons are dungeons that are NOT endgame dungeons and isn't realm clearing. Some examples include, but are __not__ limited to:\n- Tomb of the Ancient.\n- Parasite Chambers.\n- Ocean Trench.\n- Snake Pit.\n- Ice Cave.")
				.addField("React With ✅", "If you did any general dungeons.")
				.addField("React With ❌", "If you did __not__ do any general dungeons.")
				.setColor("RANDOM");
			await botMsg.edit(generalAskEmbed).catch(e => { });
			OtherUtil.reactFaster(botMsg, checkXReactions);
			const resultantReactionForGeneralAsk: GuildEmoji | ReactionEmoji | "TIME" = await getReactionFromMessage(
				botMsg,
				msg.author,
				checkXReactions
			);

			if (resultantReactionForGeneralAsk === "TIME") {
				await botMsg.delete().catch(e => { });
				return;
			}

			if (resultantReactionForGeneralAsk.name === "✅") {
				didGeneralDungeons = true;
			}
		}

		// get main rls
		let tempArrOfMainRls: GuildMember[] = mainLeaders;
		while (true) {
			const tempMainRlEmbed: MessageEmbed = new MessageEmbed()
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.setTitle("Select Main Leaders")
				.setDescription("Please select up to 5 leaders. Main leaders are leaders that were actively leading.\n\nTo **add** a person as a main leader, you may either choose to either mention the person, type their IGN, or type their Discord ID. If you want, you can separate multiple entries with a comma (ex. `Deatttthhh, 123143243242434`).\n\nTo **remove** a person that is listed below, type the number corresponding to the person.\n\nWhen you are done, type `done`.");
			// assume that the length will never be greater than 200.
			let str: string = "";	
			for (let i = 0; i < tempArrOfMainRls.length; i++) {
				str += `**\`[${i + 1}]\`** ${tempArrOfMainRls[i]}\n`;
			}

			if (str.length !== 0) {
				tempMainRlEmbed.addField("Choice", str);
			}

			if (tempMainRlEmbed !== botMsg.embeds[0]) {
				await botMsg.edit(tempArrOfMainRls).catch(e => { });
			}
		}
	}

	private getPerson(msg: Message): GuildMember | null {
		return null;
	}
}