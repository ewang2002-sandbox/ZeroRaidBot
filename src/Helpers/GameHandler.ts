import { Message, Guild, GuildMember, TextChannel, CategoryChannel, MessageEmbed, OverwriteResolvable, ChannelCreationOverwrites, VoiceChannel, Emoji, EmojiResolvable, ColorResolvable, Collection, ReactionCollector, ClientUser, MessageReaction, Role, User } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { ISection } from "../Templates/ISection";
import { GuildUtil } from "../Utility/GuildUtil";
import { RaidHandler } from "./RaidHandler";
import { MessageUtil } from "../Utility/MessageUtil";
import { AFKDungeon } from "../Constants/AFKDungeon";
import { Zero } from "../Zero";
import { GenericMessageCollector } from "../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../Definitions/TimeUnit";
import { IGameData } from "../Definitions/IGameData";
import { AFKGame } from "../Constants/GameAFK";
import { NumberUtil } from "../Utility/NumberUtil";
import { ArrayUtil } from "../Utility/ArrayUtil";
import { MessageSimpleTick } from "../Classes/Message/MessageSimpleTick";
import { FastReactionMenuManager } from "../Classes/Reaction/FastReactionMenuManager";
import { IGameInfo } from "../Definitions/IGameInfo";
import { RaidStatus } from "../Definitions/RaidStatus";
import { GameDbHelper } from "./GameDbHelper";
import { IRaidInfo } from "../Definitions/IRaidInfo";

export module GameHandler {
	/**
	 * THe maximum time left.
	 */
	const MAX_TIME_LEFT: number = 10 * 60 * 1000;

	/**
	 * An interface defining each pending AFK check. Each AFK check has its own ReactionCollector (for )
	 */
	export interface IStoredRaidData {
		mst: MessageSimpleTick;
		timeout: NodeJS.Timeout;
		keyReacts: Collection<string, GuildMember[]>; // string = key emoji, GuildMember[] = members that have said key
		earlyReacts: GuildMember[];
	}

	/**
	 * Consists of all currently running AFK checks. This stores only the voice channel ID, the MessageSimpleTick, and the ReactionCollector associated with the pending AFK check, and should be cleared after the AFK check is over. 
	 */
	export const CURRENT_RAID_DATA: Collection<string, IStoredRaidData> = new Collection<string, IStoredRaidData>();

	export async function startGameAfkCheck(
		msg: Message,
		guildDb: IRaidGuild,
		guild: Guild,
		postMsg: string
	): Promise<void> {
		const member: GuildMember = msg.member as GuildMember;

		const sections: ISection[] = [GuildUtil.getDefaultSection(guildDb), ...guildDb.sections];
		const RAID_REQUEST_CHANNEL: TextChannel | undefined = guild.channels.cache
			.get(guildDb.generalChannels.raidRequestChannel) as TextChannel | undefined;

		const AFK_CHECK_CHANNEL: TextChannel | "ERROR" | null = await RaidHandler.getAfkCheckChannel(msg, guild, guildDb, sections);
		// still null => get out
		if (AFK_CHECK_CHANNEL === null) {
			MessageUtil.send({ content: "An AFK check could not be started because there was an issue finding the channel." }, msg.channel as TextChannel);
			return;
		}

		// either canceled or timed out
		if (AFK_CHECK_CHANNEL === "ERROR") {
			return;
		}

		// TODO make sure category exists
		const SECTION_CATEGORY: CategoryChannel = AFK_CHECK_CHANNEL.parent as CategoryChannel;
		// section
		const SECTION: ISection | undefined = sections.find(x => x.channels.afkCheckChannel === AFK_CHECK_CHANNEL.id);


		if (typeof SECTION === "undefined") {
			MessageUtil.send({ content: "An AFK check could not be started because the selected channel has no category associated with it." }, msg.channel as TextChannel);
			return;
		}

		if (!guild.roles.cache.has(SECTION.verifiedRole)) {
			MessageUtil.send({ content: "The verified role does not exist. Please try again." }, msg.channel as TextChannel);
			return;
		}

		const CONTROL_PANEL_CHANNEL: TextChannel | undefined = guild.channels.cache
			.get(SECTION.channels.controlPanelChannel) as TextChannel | undefined;

		if (typeof CONTROL_PANEL_CHANNEL === "undefined") {
			MessageUtil.send({ content: "An AFK check could not be started because the control panel channel is not configured." }, msg.channel as TextChannel);
			return;
		}

		const rlInfo: GuildUtil.RaidLeaderStatus = GuildUtil.getRaidLeaderStatus(member, guildDb, SECTION);
		if (rlInfo.roleType === null && !rlInfo.isUniversal) {
			MessageUtil.send({ content: "An AFK check could not be started because you are not authorized to start AFK checks in this section." }, msg.channel as TextChannel);
			return;
		}

		const dungeons: IGameData[] = getGamesAllowedInSection(SECTION);

		if (dungeons.length === 0) {
			MessageUtil.send({ content: "An AFK check could not be started because there are no games available for this section." }, msg.channel as TextChannel);
			return;
		}

		let isLimited: boolean = dungeons.length !== AFKDungeon.length;

		const configureAfkEmbed: MessageEmbed = new MessageEmbed()
			.setTitle("⚙️ Configuring AFK Check: Game Selection")
			.setAuthor(`${guild.name} ⇒ ${SECTION.nameOfSection}`, guild.iconURL() === null ? undefined : guild.iconURL() as string)
			.setDescription("You are close to starting an AFK Check! However, you need to select a game from the list of allowed dungeons below. To begin, please type the number corresponding to the game you want to start an AFK Check for.")
			.setColor("RANDOM")
			.setFooter(`${guild.name} | ${isLimited ? "Limited Selection" : ""}`);
		// number of fields 
		let copyOfDungeons: IGameData[] = dungeons;
		let i: number = 0;
		let k: number = 0;
		let l: number = 0;
		while (copyOfDungeons.length > 0) {
			i++;
			let str: string = "";
			for (let j = 0; j < copyOfDungeons.slice(0, 10).length; j++) {
				k = j + l;
				str += `\`[${k + 1}]\` ${Zero.RaidClient.emojis.cache.get(copyOfDungeons[j].mainReactionId)} ${copyOfDungeons[j].gameName}\n`;
			}
			l += 10;
			configureAfkEmbed.addField(`Dungeon Selection: Part ${i}`, str, true);
			copyOfDungeons = copyOfDungeons.slice(10);
			str = "";
		}

		const collector: GenericMessageCollector<number> = new GenericMessageCollector<number>(
			msg,
			{ embed: configureAfkEmbed },
			1,
			TimeUnit.MINUTE
		);

		const result: number | "CANCEL_CMD" | "TIME_CMD" = await collector.send(
			async (collectedMsg: Message): Promise<number | void> => {
				const num: number = Number.parseInt(collectedMsg.content);
				if (Number.isNaN(num)) {
					await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_NUMBER_INPUT", null), msg.channel as TextChannel);
					return;
				}

				if (typeof dungeons[num - 1] === "undefined") {
					await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_INDEX", null), msg.channel as TextChannel);
					return;
				}

				return num;
			}
		);

		if (result === "CANCEL_CMD" || result === "TIME_CMD") {
			return;
		}

		const SELECTED_GAME: IGameData = dungeons[result - 1];
		let newRaidNum: number = -1;
		const allNums: number[] = SECTION_CATEGORY.children
			.filter(x => x.type === "voice")
			.filter(y => RaidHandler.vcEndsWithNumber(y)
				&& (y.name.startsWith("🚦")
					|| y.name.startsWith("⌛")
					|| y.name.startsWith("🔴"))
			)
			.array()
			.map(z => Number.parseInt(z.name.split(" ")[z.name.split(" ").length - 1]))
			.filter(a => !Number.isNaN(a))
			.sort((a: number, b: number) => a - b);

		// sort in order from least to greatest
		if (allNums.length === 0) {
			newRaidNum = 1;
		}
		else {
			newRaidNum = NumberUtil.findFirstMissingNumber(allNums, 1, allNums[allNums.length - 1]);
		}

		if (newRaidNum === -1) {
			newRaidNum = ++allNums[allNums.length - 1];
		}

		const sectionRLRoles: string[] = GuildUtil.getSectionRaidLeaderRoles(SECTION);
		const permissions: OverwriteResolvable[] = [
			{
				id: guild.roles.everyone.id, // TODO: need @everyone ID
				deny: ["VIEW_CHANNEL"]
			},
			{
				id: SECTION.verifiedRole,
				allow: ["VIEW_CHANNEL", "STREAM"]
			},
			{
				id: guildDb.roles.support,
				allow: ["VIEW_CHANNEL", "CONNECT", "MOVE_MEMBERS", "STREAM"]
			},
			{
				id: sectionRLRoles[0],
				allow: ["VIEW_CHANNEL", "CONNECT", "STREAM"]
			},
			{
				id: sectionRLRoles[1],
				allow: ["VIEW_CHANNEL", "CONNECT", "MOVE_MEMBERS", "STREAM"]
			},
			{
				id: guildDb.roles.universalAlmostRaidLeader,
				allow: ["VIEW_CHANNEL", "CONNECT", "MOVE_MEMBERS", "STREAM"]
			},
			{
				id: sectionRLRoles[2],
				allow: ["VIEW_CHANNEL", "CONNECT", "MUTE_MEMBERS", "MOVE_MEMBERS", "STREAM"]
			},
			{
				id: guildDb.roles.universalRaidLeader,
				allow: ["VIEW_CHANNEL", "CONNECT", "MUTE_MEMBERS", "MOVE_MEMBERS", "STREAM"]
			},
			{
				id: guildDb.roles.headRaidLeader,
				allow: ["VIEW_CHANNEL", "CONNECT", "MUTE_MEMBERS", "MOVE_MEMBERS", "DEAFEN_MEMBERS", "STREAM"]
			},
			{
				id: guildDb.roles.officer,
				allow: ["VIEW_CHANNEL", "CONNECT", "MUTE_MEMBERS", "MOVE_MEMBERS", "DEAFEN_MEMBERS", "STREAM"]
			},
			{
				id: guildDb.roles.moderator,
				allow: ["VIEW_CHANNEL", "CONNECT", "MUTE_MEMBERS", "MOVE_MEMBERS", "DEAFEN_MEMBERS", "STREAM"]
			},
			{
				id: guildDb.roles.teamRole,
				allow: ["VIEW_CHANNEL", "CONNECT", "STREAM", "MOVE_MEMBERS"]
			}
		];


		const realPermissions: ChannelCreationOverwrites[] = [];
		for (const permission of permissions) {
			// make sure the role or user id exists
			if (guild.roles.cache.has(permission.id as string) // we know this is a string type b/c it was defined above
				|| guild.members.cache.has(permission.id as string)) { // same idea
				realPermissions.push(permission);
			}
		}

		const vcName = `${SELECTED_GAME.gameName} ${newRaidNum}`;

		const NEW_GAME_VC: VoiceChannel = await guild.channels.create(`🚦 ${vcName}`, {
			type: "voice",
			permissionOverwrites: realPermissions,
			parent: SECTION_CATEGORY,
			userLimit: SELECTED_GAME.maxVcLimit
		});

		const afkCheckEmbed: MessageEmbed = new MessageEmbed()
			// TODO check if mobile can see the emoji.
			.setAuthor(`${member.displayName} has initiated a ${SELECTED_GAME.gameName} AFK Check.`, SELECTED_GAME.gameLogoLink)
			.setDescription(`⇒ **Join** the **${NEW_GAME_VC.name}** voice channel to participate.`)
			.setColor(ArrayUtil.getRandomElement(SELECTED_GAME.colors))
			.setThumbnail(ArrayUtil.getRandomElement(SELECTED_GAME.gameImageLink))
			.setFooter(`${guild.name}: Game AFK Check`);

		if (SELECTED_GAME.specialReactions.length !== 0) {
			let addReacts: string = "";
			for (const [id, desc] of SELECTED_GAME.specialReactions) {
				addReacts += `${desc.replace("{x}", (Zero.RaidClient.emojis.cache.get(id) as Emoji).toString())}\n`;
			}

			afkCheckEmbed.addField("Optional Reactions __(Join VC First)__", addReacts);
		}

		const afkCheckMessage: Message = await AFK_CHECK_CHANNEL.send(`@here, a new ${SELECTED_GAME.gameName} AFK check is currently ongoing. There are 10 minutes and 0 seconds remaining on this AFK check.`, { embed: afkCheckEmbed });

		const mst: MessageSimpleTick = new MessageSimpleTick(afkCheckMessage, `@here, a new ${SELECTED_GAME.gameName} AFK check is currently ongoing. There are {m} minutes and {s} seconds remaining on this AFK check.`, MAX_TIME_LEFT);

		afkCheckMessage.pin().catch(() => { });
		let emojisToReactTo: EmojiResolvable[] = [];
		emojisToReactTo.push(...SELECTED_GAME.specialReactions.map(x => x[0]));

		if (emojisToReactTo.length !== 0) {
			FastReactionMenuManager.reactFaster(afkCheckMessage, emojisToReactTo);
		}

		const controlPanelDescription: string = `⇒ Raid Section: ${SECTION.nameOfSection}\n⇒ Initiator: ${member} (${member.displayName})\n⇒ Dungeon: ${SELECTED_GAME.gameName} ${Zero.RaidClient.emojis.cache.get(SELECTED_GAME.mainReactionId)}\n⇒ Voice Channel: ${vcName}\n⇒ Message: Please react below.`;
		const controlPanelEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(`Control Panel: ${vcName}`, SELECTED_GAME.gameLogoLink)
			.setTitle(`**${SELECTED_GAME.gameName}**`)
			.setDescription(controlPanelDescription)
			.setColor(ArrayUtil.getRandomElement<ColorResolvable>(SELECTED_GAME.colors))
			.addField("End AFK Check Normally", "React with ⏹️ to end the AFK check and start the post-AFK check.")
			.addField("Abort AFK Check", "React with 🗑️ to abort the AFK check.")
			.addField("Set Message To DM", "React with ✏️ to set a new message.  You will be DMed. This message will be sent to anyone in the VC after the AFK check is over.")
			.addField("Get Message", "React with 🗺️ to get the current message set.")
			.setTimestamp()
			.setFooter(`Control Panel • Game AFK Check • ${vcName}`);

		const controlPanelMsg: Message = await CONTROL_PANEL_CHANNEL.send("**NOTICE:** Control panel commands will only work if you are in the corresponding voice channel. Below are details regarding the raid; this control panel message can only be used to control the corresponding raid.", controlPanelEmbed);

		const gi: IGameInfo = {
			vcId: NEW_GAME_VC.id,
			msgId: afkCheckMessage.id,
			gameInfo: SELECTED_GAME,
			section: SECTION,
			startTime: new Date().getTime(),
			startedBy: msg.author.id,
			status: RaidStatus.AFKCheck,
			peopleWithSpecialReactions: [],
			msgToDmPeople: postMsg,
			controlPanelMsgId: controlPanelMsg.id,
			vcNum: newRaidNum
		};

		guildDb = await GameDbHelper.addGameChannel(guild, gi);

		CURRENT_RAID_DATA.set(NEW_GAME_VC.id, {
			mst: mst,
			keyReacts: new Collection<string, GuildMember[]>(),
			earlyReacts: [],
			// TODO
			timeout: new NodeJS.Timeout()
		});
	}


	/**
	 * Gets an array of all permitted games based on the section given.
	 * @param {ISection} section The section.
	 * @returns {IGameData[]} The list of games.  
	 */
	export function getGamesAllowedInSection(section: ISection): IGameData[] {
		const dungeonData: IGameData[] = [];
		for (const dungeonId of section.properties.games) {
			const data: IGameData | void = AFKGame.find(x => x.id === dungeonId);
			if (typeof data !== "undefined") {
				dungeonData.push(data);
			}
		}
		return dungeonData;
	}

	/**
	 * Ends the AFK check.
	 */
	export async function endAfkCheck(
		guildDb: IRaidGuild,
		guild: Guild,
		gi: IGameInfo,
		raidVC: VoiceChannel,
		endedBy: GuildMember | "AUTO"
	): Promise<void> {
		let raidEntryExists: boolean = false;
		for (const raidEntry of guildDb.activeRaidsAndHeadcounts.raidChannels) {
			if (raidEntry.msgID === gi.msgId && raidEntry.vcID === raidVC.id) {
				raidEntryExists = true;
				break;
			}
		}

		// the afk check/raid somehow ended before the timer ended
		if (!raidEntryExists) {
			return;
		}

		// TODO add fail safe in case channels get deleted.
		const afkCheckChannel: TextChannel = guild.channels.cache.get(gi.section.channels.afkCheckChannel) as TextChannel;
		const controlPanelChannel: TextChannel = guild.channels.cache.get(gi.section.channels.controlPanelChannel) as TextChannel;
		let raidMsg: Message;
		try {
			raidMsg = await afkCheckChannel.messages.fetch(gi.msgId);
		}
		catch (e) {
			return; // if the msg is deleted, it prob means the raid was over long before the afk check timer even ended
		}

		let cpMsg: Message = await controlPanelChannel.messages.fetch(gi.controlPanelMsgId);
		await cpMsg.reactions.removeAll().catch(() => { });
		const raidVc: VoiceChannel = guild.channels.cache.get(gi.vcId) as VoiceChannel;

		// TODO: optimize code (two for loops that iterate through the activeRaidsAndHeadcount prop)
		// update raid status so we're in raid mode
		// and remove entry from array with react collector & 
		// mst info
		const curRaidDataArrElem: IStoredRaidData | undefined = RaidHandler.CURRENT_RAID_DATA.get(gi.vcId)

		if (typeof curRaidDataArrElem !== "undefined") {
			clearInterval(curRaidDataArrElem.timeout);
			curRaidDataArrElem.mst.disableAutoTick();
		}

		await GameDbHelper.updateRaidStatus(guild, raidVC.id);
		await raidVc.updateOverwrite(guild.roles.everyone, { CONNECT: false }).catch(() => { });

		// remove 
		CURRENT_RAID_DATA.delete(gi.vcId);

		const raidersPresent: number = raidVC.members.size;
		// set embed
		const embed: MessageEmbed = new MessageEmbed()
			.setAuthor(typeof endedBy === "string" ? `The ${gi.gameInfo.gameName} AFK Check has ended automatically.` : `${endedBy.displayName} has ended the ${gi.gameInfo.gameName} AFK Check.`, gi.gameInfo.gameLogoLink)
			.setDescription(`The AFK check is now over. There are currently ${raidersPresent} gamers.`)
			.setFooter(`${guild.name}: Game`)
			.setThumbnail(ArrayUtil.getRandomElement(gi.gameInfo.gameImageLink))
			.setColor(ArrayUtil.getRandomElement(gi.gameInfo.colors));
		await raidMsg.edit("This AFK check is now over.", embed).catch(() => { });
		await raidVC.edit({
			name: `🔴 ${raidVC.name.replace("⌛", "").replace("🚦", "").trim()}`
		});

		// control panel 
		const initiator: GuildMember | null = guild.member(gi.startedBy);
		let descStr: string = `⇒ Raid Section: ${gi.section.nameOfSection}\n⇒ Initiator: ${initiator === null ? "Unknown" : initiator} (${initiator === null ? "Unknown" : initiator.displayName})\n⇒ Game: ${gi.gameInfo.gameName} ${Zero.RaidClient.emojis.cache.get(gi.gameInfo.mainReactionId)}`;
		const startRunControlPanelEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(`Control Panel: ${gi.gameInfo.gameName} ${gi.vcNum}`, gi.gameInfo.gameLogoLink)
			.setTitle(`**Gaming: ${gi.gameInfo.gameName}**`)
			.setDescription(descStr)
			.addField("End Gaming Session", "React with ⏹️ to end this gaming session. This will move members into the lounge voice channel, if applicable, and delete the voice channel.")
			.addField("Set Message", "React with ✏️ to set a new message. You will be DMed. The new message will be sent to all members in this voice channel.")
			.addField("Get Message", "React with 🗺️ to get the current message.")
			.addField("Lock Gaming Voice Channel", "React with 🔒 to __lock__ the gaming voice channel. This will prevent members from joining freely.")
			.addField("Unlock Gaming Voice Channel", "React with 🔓 to __unlock__ the gaming voice channel. This will allow members to join freely.")
			.setColor(ArrayUtil.getRandomElement<ColorResolvable>(gi.gameInfo.colors))
			.setTimestamp()
			.setFooter(`Control Panel • In Game • ${gi.gameInfo.gameName} ${gi.vcNum}`);
		await cpMsg.edit("**NOTICE:** Control panel commands will only work if you are in the corresponding voice channel. Below are details regarding this gaming session; this control panel message can only be used to control the corresponding gaming session.\n**NOTICE:** When you are done with the gaming session, you MUST end the session.", startRunControlPanelEmbed).catch(() => { });
		FastReactionMenuManager.reactFaster(cpMsg, ["⏹️", "✏️", "🗺️", "🔒", "🔓"]);
	} // end function

	/**Ends the gaming session. */
	export async function endGamingSession(
		memberThatEnded: GuildMember,
		guild: Guild,
		gi: IGameInfo
	): Promise<void> {
		const afkCheckChannel: TextChannel = guild.channels.cache.get(gi.section.channels.afkCheckChannel) as TextChannel;
		let raidMsg: Message = await afkCheckChannel.messages.fetch(gi.msgId);
		const controlPanelChannel: TextChannel = guild.channels.cache.get(gi.section.channels.controlPanelChannel) as TextChannel;
		let cpMsg: Message = await controlPanelChannel.messages.fetch(gi.controlPanelMsgId);
		const raidVC: VoiceChannel | undefined = guild.channels.cache.get(gi.vcId) as VoiceChannel;

		const membersLeft: Collection<string, GuildMember> = typeof raidVC === "undefined"
			? new Collection<string, GuildMember>()
			: raidVC.members;

		// if we're in post afk 
		if (typeof raidMsg.embeds[0].description !== "undefined" && raidMsg.embeds[0].description.includes("Join any available voice channel and then")) {
			return;
		}

		await GameDbHelper.removeGameChannelFromDatabase(guild, gi.vcId);

		const endedRun: MessageEmbed = new MessageEmbed()
			.setAuthor(`${memberThatEnded.displayName} has ended the ${gi.gameInfo.gameName} gaming session.`, gi.gameInfo.gameLogoLink)
			.setDescription(`The ${gi.gameInfo.gameName} session is now finished. Thanks for coming!`)
			.setColor(ArrayUtil.getRandomElement<ColorResolvable>(gi.gameInfo.colors))
			.setFooter(guild.name);
		await raidMsg.edit("The gaming session is now over. Thanks to everyone for attending!", endedRun);
		await raidMsg.unpin().catch(() => { });
		await cpMsg.delete().catch(() => { });

		if (raidVC !== null) {
			await RaidHandler.movePeopleOutAndDeleteRaidVc(guild, raidVC);
		}
	}
}