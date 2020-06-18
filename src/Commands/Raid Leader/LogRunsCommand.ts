import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, GuildMember, EmojiResolvable, GuildEmoji, ReactionEmoji, Guild } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { FastReactionMenuManager } from "../../Classes/Reaction/FastReactionMenuManager";
import { UserHandler } from "../../Helpers/UserHandler";
import { QuotaLoggingHandler } from "../../Helpers/QuotaLoggingHandler";

type RaidTypes = "REALM CLEARING" | "END GAME" | "GENERAL";


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

		const resultantReactionForInit: GuildEmoji | ReactionEmoji | "TIME" = await new FastReactionMenuManager(botMsg, msg.author, reactionsForInitLogType, 2, TimeUnit.MINUTE).react();
		if (resultantReactionForInit === "TIME" || resultantReactionForInit.name === "❌") {
			await botMsg.delete().catch(() => { });
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

		await botMsg.reactions.removeAll().catch(() => { });

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
		await botMsg.edit(realmClearingAskEmbed).catch(() => { });
		const resultantReactionForRCAsk: GuildEmoji | ReactionEmoji | "TIME" = await new FastReactionMenuManager(botMsg, msg.author, checkXReactions, 2, TimeUnit.MINUTE).react();

		if (resultantReactionForRCAsk === "TIME") {
			await botMsg.delete().catch(() => { });
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
			await botMsg.edit(endgameAskEmbed).catch(() => { });
			const resultantReactionForEndGameAsk: GuildEmoji | ReactionEmoji | "TIME" = await new FastReactionMenuManager(botMsg, msg.author, checkXReactions, 2, TimeUnit.MINUTE).react();

			if (resultantReactionForEndGameAsk === "TIME") {
				await botMsg.delete().catch(() => { });
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
			await botMsg.edit(generalAskEmbed).catch(() => { });
			const resultantReactionForGeneralAsk: GuildEmoji | ReactionEmoji | "TIME" = await new FastReactionMenuManager(botMsg, msg.author, checkXReactions, 2, TimeUnit.MINUTE).react();

			if (resultantReactionForGeneralAsk === "TIME") {
				await botMsg.delete().catch(() => { });
				return;
			}

			if (resultantReactionForGeneralAsk.name === "✅") {
				didGeneralDungeons = true;
			}
		}

		// maybe find a way to optimize this? :) 
		let realmClearingLeadersLog: QuotaLoggingHandler.LeaderLoggingArray = {
			main: {
				members: [],
				completed: 0,
				failed: 0
			},
			assists: {
				members: [],
				assists: 0
			}
		};
		let endgameLeadersLog: QuotaLoggingHandler.LeaderLoggingArray = {
			main: {
				members: [],
				completed: 0,
				failed: 0
			},
			assists: {
				members: [],
				assists: 0
			}
		};
		let generalLeadersLog: QuotaLoggingHandler.LeaderLoggingArray = {
			main: {
				members: [],
				completed: 0,
				failed: 0
			},
			assists: {
				members: [],
				assists: 0
			}
		};

		// let's get people + run count
		if (didRealmClearing) {
			const data: QuotaLoggingHandler.LeaderLoggingArray | "CANCEL" = await this.getData(
				msg, 
				guildData, 
				realmClearingLeadersLog,
				[mainLeaders, assistLeaders],
				"REALM CLEARING"
			);
			if (data === "CANCEL") {
				return;
			}
			realmClearingLeadersLog = data; 
		}
		else {
			if (didEndgameDungeons) {
				const data: QuotaLoggingHandler.LeaderLoggingArray | "CANCEL" = await this.getData(
					msg, 
					guildData, 
					endgameLeadersLog,
					[mainLeaders, assistLeaders],
					"END GAME"
				);
				if (data === "CANCEL") {
					return;
				}
				endgameLeadersLog = data; 
			}

			if (didGeneralDungeons) {
				const data: QuotaLoggingHandler.LeaderLoggingArray | "CANCEL" = await this.getData(
					msg, 
					guildData, 
					generalLeadersLog,
					[mainLeaders, assistLeaders],
					"GENERAL"
				);
				if (data === "CANCEL") {
					return;
				}
				generalLeadersLog = data; 
			}
		}

		QuotaLoggingHandler.logRunsAndUpdateQuota(msg.guild as Guild, {
			general: generalLeadersLog,
			endgame: endgameLeadersLog,
			realmClearing: realmClearingLeadersLog
		});
	}

	public async getData(
		msg: Message,
		guildData: IRaidGuild,
		data: QuotaLoggingHandler.LeaderLoggingArray,
		mainAssistLeaders: [GuildMember[], GuildMember[]],
		raidType: RaidTypes
	): Promise<QuotaLoggingHandler.LeaderLoggingArray | "CANCEL"> {
		data.main.members.push(...mainAssistLeaders[0]);
		data.assists.members.push(...mainAssistLeaders[1]);
		// ask for people
		const mainLeadersThatContributed: GuildMember[] | "CANCEL" = await this.getAllPeople(
			msg,
			raidType,
			"MAIN",
			guildData,
			mainAssistLeaders[0]
		);

		if (mainLeadersThatContributed === "CANCEL") {
			return "CANCEL";
		}

		const assistLeadersThatContributed: GuildMember[] | "CANCEL" = await this.getAllPeople(
			msg,
			raidType,
			"ASSISTING",
			guildData,
			mainAssistLeaders[1]
		);

		if (assistLeadersThatContributed === "CANCEL") {
			return "CANCEL";
		}

		data.main.members.push(...mainLeadersThatContributed);
		data.assists.members.push(...assistLeadersThatContributed);

		// ask how many runs
		const amtSuccessfulRuns: number | "CANCEL" | "TIME" = await new GenericMessageCollector<number>(
			msg,
			{ content: `Type the number of __${raidType.toLowerCase()} runs__ all __main leaders__ have successfully completed.` },
			1,
			TimeUnit.MINUTE
		).send(GenericMessageCollector.getNumber(msg.channel, 0));

		if (amtSuccessfulRuns === "CANCEL" || amtSuccessfulRuns === "TIME") {
			return "CANCEL";
		}

		data.main.completed = amtSuccessfulRuns;

		const amtFailedRuns: number | "CANCEL" | "TIME" = await new GenericMessageCollector<number>(
			msg,
			{ content: `Type the number of __${raidType.toLowerCase()} runs__ all __main leaders__ have __failed__ to complete.` },
			1,
			TimeUnit.MINUTE
		).send(GenericMessageCollector.getNumber(msg.channel, 0));

		if (amtFailedRuns === "CANCEL" || amtFailedRuns === "TIME") {
			return "CANCEL";
		}

		data.main.failed = amtFailedRuns;

		data.assists.assists = amtSuccessfulRuns + amtFailedRuns;

		return data;
	}

	public async getAllPeople(
		msg: Message,
		logType: RaidTypes,
		leaderType: "MAIN" | "ASSISTING",
		guildDb: IRaidGuild,
		leaders: GuildMember[] = []
	): Promise<GuildMember[] | "CANCEL"> {
		const guild: Guild = msg.guild as Guild;
		let members: GuildMember[] = [...leaders];
		while (true) {
			const embed: MessageEmbed = new MessageEmbed()
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.setTitle(`Logging Type: ${logType} | ${leaderType === "MAIN" ? "Main Leaders" : "Assisting Leaders"}`)
				.setDescription(`Please add any __${leaderType.toLowerCase()}__ leaders that contributed to the ${logType.toLowerCase()} runs.\n\n**DIRECTIONS**: To add a person so he or she gets logging credit, either mention their tag, type their Discord ID, or type their in-game name.\n\nTo remove a person so he or she doesn't get logging credit, do the same thing as above, but with a name that is shown below.\n\n\n**FINISHED?** When you are done selecting the leaders, type \`-done\` to move on to the next step.\n\n**CANCEL?** To cancel this logging process, type \`-cancel\`.`)
				.setColor("RANDOM")
				.setFooter(logType);

			let str: string = "";
			for (const member of members) {
				if (str.length + member.toString().length + 4 > 1000) {
					embed.addField("Logging Credit", str);
					str = member.toString();
				}
				else {
					str += `${member}\n`;
				}
			}

			if (embed.fields.length === 0 && str.length !== 0) {
				embed.addField("Logging Credit", str);
			}

			const coll: string = await new GenericMessageCollector<string>(
				msg,
				{ embed: embed },
				2,
				TimeUnit.MINUTE
			).send(GenericMessageCollector.getStringPrompt(msg.channel), "-cancel");

			if (coll === "TIME" || coll === "CANCEL") {
				return "CANCEL";
			}

			if (coll === "-done") {
				break;
			}

			const membersToLog: GuildMember[] = await this.getPeople(coll, guild, guildDb);
			for (let i = 0; i < membersToLog.length; i++) {
				if (members.some(x => x.id === membersToLog[i].id)) {
					members.splice(i, 1);
					i--;
				}
				else {
					members.push(membersToLog[i]);
				}
			}
		} // end while loop

		return members;
	}

	public async getPeople(str: string, guild: Guild, guildDb: IRaidGuild): Promise<GuildMember[]> {
		const members: GuildMember[] = [];
		const args: string[] = str.split(/ +/); // TODO check if this is correct
		for await (const arg of args) {
			// check if mention
			const res: string | null = UserHandler.getUserFromMention(arg);
			if (res !== null) {
				try {
					members.push(await guild.members.fetch(res));
					continue;
				}
				catch (e) { }
			}

			// check if id
			if (/^\d+$/.test(arg)) {
				try {
					members.push(await guild.members.fetch(arg));
					continue;
				}
				catch (e) { }
			}

			const nameSearchResults: GuildMember | GuildMember[] = UserHandler.findUserByInGameName(guild, arg, guildDb);
			if (!Array.isArray(nameSearchResults)) {
				members.push(nameSearchResults);
			}
		}
		return members;
	}
}
