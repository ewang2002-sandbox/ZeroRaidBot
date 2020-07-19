import { CategoryChannel, ChannelCreationOverwrites, ClientUser, Collection, Guild, GuildMember, Message, MessageCollector, MessageEmbed, MessageReaction, ReactionCollector, TextChannel, User, VoiceChannel, GuildEmoji, EmojiResolvable, ColorResolvable, DMChannel, Role, OverwriteResolvable } from "discord.js";
import { GenericMessageCollector } from "../Classes/Message/GenericMessageCollector";
import { MessageSimpleTick } from "../Classes/Message/MessageSimpleTick";
import { AFKDungeon } from "../Constants/AFKDungeon";
import { AllEmoji, NitroEmoji } from "../Constants/EmojiData";
import { IDungeonData } from "../Definitions/IDungeonData";
import { IRaidInfo } from "../Definitions/IRaidInfo";
import { ISection } from "../Templates/ISection";
import { RaidStatus } from "../Definitions/RaidStatus";
import { RaidDbHelper } from "./RaidDbHelper";
import { Zero } from "../Zero";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { ArrayUtil } from "../Utility/ArrayUtil";
import { GuildUtil } from "../Utility/GuildUtil";
import { MessageUtil } from "../Utility/MessageUtil";
import { StringUtil } from "../Utility/StringUtil";
import { IHeadCountInfo } from "../Definitions/IHeadCountInfo";
import { TimeUnit } from "../Definitions/TimeUnit";
import { MessageAutoTick } from "../Classes/Message/MessageAutoTick";
import { NumberUtil } from "../Utility/NumberUtil";
import { MongoDbHelper } from "./MongoDbHelper";
import { StringBuilder } from "../Classes/String/StringBuilder";
import { FilterQuery } from "mongodb";
import { IRaidUser } from "../Templates/IRaidUser";
import { FastReactionMenuManager } from "../Classes/Reaction/FastReactionMenuManager";
import { UserAvailabilityHelper } from "./UserAvailabilityHelper";

export module RaidHandler {
	/**
	 * All dungeons that are considered "endgame."
	 */
	const ENDGAME_DUNGEONS: number[] = [38, 36, 35, 34, 32, 30];

	/**
	 * All dungeons that are considered "realm clearing."
	 */
	const REALM_CLEARING_DUNGEONS: number[] = [];

	/**
	 * The maximum time that an AFK check should last for. 
	 */
	const MAX_TIME_LEFT: number = 300000;

	/**
	 * An interface defining each pending AFK check. Each AFK check has its own ReactionCollector (for )
	 */
	interface IStoredRaidData {
		reactCollector: ReactionCollector;
		mst: MessageSimpleTick;
		timeout: NodeJS.Timeout;
		keyReacts: Collection<string, GuildMember[]>; // string = key emoji, GuildMember[] = members that have said key
		earlyReacts: GuildMember[];
	}

	/**
	 * Information for stored headcounts. 
	 */
	interface IStoredHeadcountData {
		mst: MessageSimpleTick;
		timeout: NodeJS.Timeout;
	}

	/**
	 * Consists of all currently running AFK checks. This stores only the voice channel ID, the MessageSimpleTick, and the ReactionCollector associated with the pending AFK check, and should be cleared after the AFK check is over. 
	 */
	export const CURRENT_RAID_DATA: Collection<string, IStoredRaidData> = new Collection<string, IStoredRaidData>();

	/**
	 * Consists of all currently running headcounts. This stores only the message (of the headcount) ID, the MessageSimpleTick, and the ReactionCollector associated with the pending headcount, and should be cleared after the headcount is over. 
	 */
	export const CURRENT_HEADCOUNT_DATA: Collection<string, IStoredHeadcountData> = new Collection<string, IStoredHeadcountData>();

    /**
     * Starts an AFK check. This function should be called only from the `StartAfkCheckCommand` file.
     * Precondition: The command must be run in a server.
     */
	export async function startAfkCheck(
		msg: Message,
		guildDb: IRaidGuild,
		guild: Guild,
		location: string
	): Promise<void> {
		const member: GuildMember = msg.member as GuildMember;
		// ==================================
		// begin getting afk check channel 
		// ==================================
		const sections: ISection[] = [GuildUtil.getDefaultSection(guildDb), ...guildDb.sections];
		const RAID_REQUEST_CHANNEL: TextChannel | undefined = guild.channels.cache
			.get(guildDb.generalChannels.raidRequestChannel) as TextChannel | undefined;

		const AFK_CHECK_CHANNEL: TextChannel | "ERROR" | null = await getAfkCheckChannel(msg, guild, guildDb, sections);
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

		// ==================================
		// determine dungeon for raid 
		// ==================================

		if (typeof SECTION === "undefined") {
			MessageUtil.send({ content: "An AFK check could not be started because the selected channel has no category associated with it." }, msg.channel as TextChannel);
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

		const dungeons: IDungeonData[] = getDungeonsAllowedInSection(SECTION);

		if (dungeons.length === 0) {
			MessageUtil.send({ content: "An AFK check could not be started because there are no dungeons available for this section." }, msg.channel as TextChannel);
			return;
		}

		let isLimited: boolean = dungeons.length !== AFKDungeon.length;

		const configureAfkEmbed: MessageEmbed = new MessageEmbed()
			.setTitle("⚙️ Configuring AFK Check: Dungeon Selection")
			.setAuthor(`${guild.name} ⇒ ${SECTION.nameOfSection}`, guild.iconURL() === null ? undefined : guild.iconURL() as string)
			.setDescription("You are close to starting an AFK Check! However, you need to select a dungeon from the list of allowed dungeons below. To begin, please type the number corresponding to the dungeon you want to start an AFK Check for.")
			.setColor("RANDOM")
			.setFooter(`${guild.name} | ${isLimited ? "Limited Selection" : ""}`);
		// number of fields 
		let copyOfDungeons: IDungeonData[] = dungeons;
		let i: number = 0;
		let k: number = 0;
		let l: number = 0;
		while (copyOfDungeons.length > 0) {
			i++;
			let str: string = "";
			for (let j = 0; j < copyOfDungeons.slice(0, 10).length; j++) {
				k = j + l;
				str += `\`[${k + 1}]\` ${Zero.RaidClient.emojis.cache.get(copyOfDungeons[j].portalEmojiID)} ${copyOfDungeons[j].dungeonName}\n`;
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

		const SELECTED_DUNGEON: IDungeonData = dungeons[result - 1];

		// if trial raid leader
		// and not universal role
		// we need to make sure 
		// they have authorization
		if (rlInfo.roleType === "TRL"
			&& !rlInfo.isUniversal
			&& typeof RAID_REQUEST_CHANNEL !== "undefined") {
			const responseRequesterEmbed: MessageEmbed = new MessageEmbed()
				.addField("Dungeon", StringUtil.applyCodeBlocks(SELECTED_DUNGEON.dungeonName), true)
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.addField("Section", StringUtil.applyCodeBlocks(SECTION.nameOfSection), true)
				.setColor("RANDOM")
				.setFooter(guild.name);
			const embed: MessageEmbed = new MessageEmbed()
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.setTitle("🔔 Raid Request Submitted")
				.setDescription("You wanted to start an AFK check; however, because of your trial raid leader status, you will need approval from a Raid Leader or above. Details of your raid can be found below. You will receive a notification regarding your raid request status.")
				.addField("Dungeon", StringUtil.applyCodeBlocks(SELECTED_DUNGEON.dungeonName), true)
				.addField("Section", StringUtil.applyCodeBlocks(SECTION.nameOfSection), true)
				.setColor("RANDOM")
				.setFooter(guild.name);
			const receiptEmbed: Message = await member.send(embed);
			const isApproved: { r: boolean, m: GuildMember } | "TIME_CMD" = await new Promise(async (resolve) => {
				const resultEmbed: MessageEmbed = new MessageEmbed() // to edit w/ 
					.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
					.addField("Selected Dungeon", StringUtil.applyCodeBlocks(SELECTED_DUNGEON.dungeonName), true)
					.addField("Raid Section", StringUtil.applyCodeBlocks(SECTION.nameOfSection), true)
					.setColor("RANDOM")
					.setFooter("Request Answered");

				const requestEmbed: MessageEmbed = new MessageEmbed()
					.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
					.setTitle("🔔 Raid Request")
					.setDescription(`A Trial Leader needs approval from a Leader or above before he or she can start a raid. Review the following information and react accordingly.\nTrial Leader Mention: ${member}\nTrial Leader Name: ${member.displayName}`)
					.addField("Selected Dungeon", StringUtil.applyCodeBlocks(SELECTED_DUNGEON.dungeonName), true)
					.addField("Raid Section", StringUtil.applyCodeBlocks(SECTION.nameOfSection), true)
					.setColor("RANDOM")
					.setFooter("⌛ Request Expires In: 5 Minutes and 0 Seconds.");

				const requestChanMessage: Message = await RAID_REQUEST_CHANNEL.send(requestEmbed);
				const reactions: EmojiResolvable[] = ["✅", "❌"];
				for await (const reaction of reactions) {
					await requestChanMessage.react(reaction);
				}

				// collector function 
				const collFilter: (r: MessageReaction, u: User) => boolean = (reaction: MessageReaction, user: User) => {
					return reactions.includes(reaction.emoji.name) && !user.bot
				}

				// prepare collector
				const reactCollector: ReactionCollector = requestChanMessage.createReactionCollector(collFilter, {
					time: 5 * 60 * 1000
				});

				const mcd: MessageAutoTick = new MessageAutoTick(requestChanMessage, requestEmbed, 5 * 60 * 1000, null, "⌛ Request Expires In: {m} Minutes and {s} Seconds.");

				// end collector
				reactCollector.on("end", (collected: Collection<string, MessageReaction>, reason: string) => {
					mcd.disableAutoTick();
					if (reason === "time") {
						resultEmbed
							.setTimestamp()
							.setTitle("⏰ Trial Leader Raid Request Expired")
							.setDescription(`The raid request sent by ${member} (${member.displayName}) has expired.`);
						requestChanMessage.edit(resultEmbed).catch(() => { });
						return resolve("TIME_CMD");
					}
				});

				reactCollector.on("collect", async (r: MessageReaction, u: User) => {
					await r.users.remove(u).catch(() => { });
					const memberThatAnswered: GuildMember | null = guild.member(u);
					if (memberThatAnswered === null) {
						return;
					}

					// make sure he or she has a leader/higher-up role
					const allowsRoles: string[] = [
						guildDb.roles.headRaidLeader,
						guildDb.roles.universalRaidLeader,
						guildDb.roles.moderator,
						guildDb.roles.officer
					];

					if (!(allowsRoles.some(x => memberThatAnswered.roles.cache.has(x)) || memberThatAnswered.hasPermission("ADMINISTRATOR"))) {
						return;
					}

					reactCollector.stop();
					await requestChanMessage.reactions.removeAll().catch(() => { });
					if (r.emoji.name === "❌") {
						resultEmbed
							.setTimestamp()
							.setTitle("❌ Trial Leader Raid Request Denied")
							.setDescription(`${memberThatAnswered} (${memberThatAnswered.displayName}) has __denied__ the raid request sent by ${member} (${member.displayName}).`);
						await requestChanMessage.edit(resultEmbed).catch(() => { });
						return resolve({ r: false, m: memberThatAnswered });
					}

					resultEmbed
						.setTimestamp()
						.setTitle("✅ Trial Leader Raid Request Approved")
						.setDescription(`${memberThatAnswered} (${memberThatAnswered.displayName}) has __accepted__ the raid request sent by ${member} (${member.displayName}).`);

					await requestChanMessage.edit(resultEmbed).catch(() => { });
					return resolve({ r: true, m: memberThatAnswered });
				});
			});

			if (isApproved === "TIME_CMD") {
				responseRequesterEmbed
					.setTitle("⏰ Raid Request Expired")
					.setDescription("Your raid request has expired. Try to see if a raid leader or head raid leader is willing to approve your next raid request first before you send one! Your raid request details are below.")
					.setTimestamp();
				await receiptEmbed.edit(responseRequesterEmbed).catch(() => { });
				await member.send(`⏰ **\`[${SECTION.nameOfSection}]\`** Your raid request has __expired__. Try to see if a raid leader or head raid leader is willing to approve your next raid request first before you send one!`);
				return;
			}

			if (!isApproved.r) {
				responseRequesterEmbed
					.setTitle("❌ Raid Request Denied")
					.setDescription(`${isApproved.m} (${isApproved.m.displayName}) has __denied__ your raid request. Your raid request details are below.`);
				await receiptEmbed.edit(responseRequesterEmbed).catch(() => { });
				await member.send(`❌ **\`[${SECTION.nameOfSection}]\`** Your raid request has been __denied__. Your raid will not start.`);
				return;
			}

			responseRequesterEmbed
				.setTitle("✅ Raid Request Accepted")
				.setDescription(`${isApproved.m} (${isApproved.m.displayName}) has __accepted__ your raid request. Your raid request details are below.`);
			await receiptEmbed.edit(responseRequesterEmbed).catch(() => { });
			await member.send(`✅ **\`[${SECTION.nameOfSection}]\`** Your raid request has been __approved__.`);
		}

		// ==================================
		// time to initiate the afk check 
		// ==================================

		// first, let's determine the numbers that have been used
		// by previous vcs
		const allNums: number[] = SECTION_CATEGORY.children
			.filter(x => x.type === "voice")
			.filter(y => vcEndsWithNumber(y as VoiceChannel)
				&& (y.name.startsWith("🚦")
					|| y.name.startsWith("⌛")
					|| y.name.startsWith("🔴"))
			)
			.array()
			.map(z => Number.parseInt(z.name.split(" ")[z.name.split(" ").length - 1]))
			.filter(a => !Number.isNaN(a))
			.sort((a: number, b: number) => a - b);

		// sort in order from least to greatest
		let newRaidNum: number;
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
		const permissions: ChannelCreationOverwrites[] = [
			{
				id: guild.roles.everyone.id, // TODO: need @everyone ID
				deny: ["VIEW_CHANNEL", "SPEAK"]
			},
			{
				id: SECTION.verifiedRole,
				allow: ["VIEW_CHANNEL"]
			},
			{
				id: guildDb.roles.support,
				allow: ["VIEW_CHANNEL", "CONNECT", "MOVE_MEMBERS"]
			},
			{
				id: sectionRLRoles[0],
				allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"]
			},
			{
				id: sectionRLRoles[1],
				allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK", "MOVE_MEMBERS"]
			},
			{
				id: guildDb.roles.universalAlmostRaidLeader,
				allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK", "MOVE_MEMBERS"]
			},
			{
				id: sectionRLRoles[2],
				allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK", "MUTE_MEMBERS", "MOVE_MEMBERS"]
			},
			{
				id: guildDb.roles.universalRaidLeader,
				allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK", "MUTE_MEMBERS", "MOVE_MEMBERS"]
			},
			{
				id: guildDb.roles.headRaidLeader,
				allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK", "MUTE_MEMBERS", "MOVE_MEMBERS", "DEAFEN_MEMBERS"]
			},
			{
				id: guildDb.roles.officer,
				allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK", "MUTE_MEMBERS", "MOVE_MEMBERS", "DEAFEN_MEMBERS"]
			},
			{
				id: guildDb.roles.moderator,
				allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK", "MUTE_MEMBERS", "MOVE_MEMBERS", "DEAFEN_MEMBERS"]
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

		for (const role of guildDb.roles.talkingRoles) {
			if (guild.roles.cache.has(role)) {
				realPermissions.push({
					id: role,
					allow: ["VIEW_CHANNEL", "SPEAK"]
				});
			}
		}

		const NEW_RAID_VC: VoiceChannel = await guild.channels.create(`🚦 Raiding ${newRaidNum}`, {
			type: "voice",
			permissionOverwrites: realPermissions,
			parent: SECTION_CATEGORY,
			userLimit: 99
		});

		const earlyLocationEmoji: GuildEmoji = msg.client.emojis.cache.get(NitroEmoji) as GuildEmoji;
		const earlyLocationRoles: (Role | undefined)[] = guildDb.roles.earlyLocationRoles
			.map(x => guild.roles.cache.get(x));
		const existingEarlyLocRoles: Role[] = [];
		for (const role of earlyLocationRoles) {
			if (typeof role !== "undefined") {
				existingEarlyLocRoles.push(role);
			}
		}

		let optionalReactsField: string = "";
		let reactWithNitroBoosterEmoji: boolean = false;
		if (existingEarlyLocRoles.length !== 0) {
			if (existingEarlyLocRoles.length === 1) {
				optionalReactsField += `⇒ If you have the ${existingEarlyLocRoles[0]} role, react with ${earlyLocationEmoji} to get the raid location early.\n`;
			}
			else {
				optionalReactsField += `⇒ If you have one of the following roles, ${existingEarlyLocRoles.join(" ")}, react with ${earlyLocationEmoji} to get the raid location early.\n`;
			}
			reactWithNitroBoosterEmoji = true;
		}

		if (SELECTED_DUNGEON.keyEmojIDs.length !== 0) {
			optionalReactsField += `⇒ If you have ${SELECTED_DUNGEON.keyEmojIDs.length === 1 ? `a ${SELECTED_DUNGEON.keyEmojIDs[0].keyEmojiName}` : "one of the following keys"}, react accordingly with ${SELECTED_DUNGEON.keyEmojIDs.map(x => msg.client.emojis.cache.get(x.keyEmojID)).join(" ")}\n`;
		}
		optionalReactsField += `⇒ React with the emoji(s) corresponding to your class and gear choices.`;

		const afkCheckEmbed: MessageEmbed = new MessageEmbed()
			// TODO check if mobile can see the emoji.
			.setAuthor(`${member.displayName} has initiated a ${SELECTED_DUNGEON.dungeonName} AFK Check.`, SELECTED_DUNGEON.portalLink)
			.setDescription(`⇒ **Join** the **${NEW_RAID_VC.name}** voice channel to participate in this raid.\n⇒ **React** to the ${msg.client.emojis.cache.get(SELECTED_DUNGEON.portalEmojiID)} emoji to show that you are joining in on this raid.`)
			.addField("Optional Reactions", optionalReactsField)
			.setColor(ArrayUtil.getRandomElement(SELECTED_DUNGEON.colors))
			.setImage(ArrayUtil.getRandomElement(SELECTED_DUNGEON.bossLink))
			.setFooter(`${guild.name}: Raid AFK Check`);

		const afkCheckMessage: Message = await AFK_CHECK_CHANNEL.send(`@here, a new ${SELECTED_DUNGEON.dungeonName} AFK check is currently ongoing. There are 5 minutes and 0 seconds remaining on this AFK check.`, { embed: afkCheckEmbed });

		const mst: MessageSimpleTick = new MessageSimpleTick(afkCheckMessage, `@here, a new ${SELECTED_DUNGEON.dungeonName} AFK check is currently ongoing. There are {m} minutes and {s} seconds remaining on this AFK check.`, MAX_TIME_LEFT);

		// timeout in case we reach the 5 min mark
		// TODO find a way to stop timeout if rl ends afk check early.
		const timeout: NodeJS.Timeout = setTimeout(async () => {
			mst.disableAutoTick();
			guildDb = await (new MongoDbHelper.MongoDbGuildManager(guild.id).findOrCreateGuildDb());
			endAfkCheck(guildDb, guild, rs, NEW_RAID_VC, "AUTO");
		}, MAX_TIME_LEFT);

		// pin & react
		afkCheckMessage.pin().catch(() => { });
		let emojisToReactTo: EmojiResolvable[] = [SELECTED_DUNGEON.portalEmojiID];
		if (reactWithNitroBoosterEmoji) {
			emojisToReactTo.push(earlyLocationEmoji);
		}
		// TODO make it so when ppl react to key while bot is still reacting
		// it still works 
		emojisToReactTo.push(...SELECTED_DUNGEON.keyEmojIDs.map(x => x.keyEmojID), ...SELECTED_DUNGEON.reactions);
		FastReactionMenuManager.reactFaster(afkCheckMessage, emojisToReactTo);

		// ==================================
		// control panel stuff
		// ==================================
		const controlPanelDescription: string = `Control panel commands will only work if you are in the corresponding voice channel. Below are details regarding the AFK check.\n⇒ Raid Section: ${SECTION.nameOfSection}\n⇒ Initiator: ${member} (${member.displayName})\n⇒ Dungeon: ${SELECTED_DUNGEON.dungeonName} ${Zero.RaidClient.emojis.cache.get(SELECTED_DUNGEON.portalEmojiID)}\n⇒ Voice Channel: Raiding ${newRaidNum}`;
		const controlPanelEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(`Control Panel: Raiding ${newRaidNum}`, SELECTED_DUNGEON.portalLink)
			.setDescription(controlPanelDescription)
			.setColor(ArrayUtil.getRandomElement<ColorResolvable>(SELECTED_DUNGEON.colors))
			.addField("End AFK Check Normally", "React with ⏹️ to end the AFK check and start the post-AFK check.")
			.addField("Abort AFK Check", "React with 🗑️ to abort the AFK check.")
			.addField("Set Location", "React with ✏️ to set a new location. You will be DMed. The new location will be sent to anyone that has the location (people that reacted with key, Nitro boosters, raid leaders, etc.)")
			.addField("Get Location", "React with 🗺️ to get the current raid location.")
			.setTimestamp()
			.setFooter(`Control Panel • AFK Check • R${newRaidNum}`);
		const controlPanelMsg: Message = await CONTROL_PANEL_CHANNEL.send(controlPanelEmbed);
		await controlPanelMsg.pin().catch(e => { });

		// create collector for key filtering
		const collFilter = (reaction: MessageReaction, user: User) => {
			// TODO: make sure this works. 
			return reaction.emoji.id !== null
				&& (SELECTED_DUNGEON.keyEmojIDs.some(x => x.keyEmojID === reaction.emoji.id) || reaction.emoji.id === earlyLocationEmoji.id)
				&& user.id !== (Zero.RaidClient.user as User).id;
		}

		// prepare collector
		const reactCollector: ReactionCollector = afkCheckMessage.createReactionCollector(collFilter, {
			time: MAX_TIME_LEFT
		});

		// get db stuff ready 
		const rs: IRaidInfo = {
			raidNum: newRaidNum,
			section: SECTION,
			vcID: NEW_RAID_VC.id,
			location: location,
			msgID: afkCheckMessage.id,
			controlPanelMsgId: controlPanelMsg.id, // TODO fix 
			dungeonInfo: SELECTED_DUNGEON,
			startTime: new Date().getTime(),
			startedBy: msg.author.id,
			status: RaidStatus.AFKCheck,
			keyReacts: [],
			earlyReacts: [],
			dungeonsDone: 0
		};

		// add to db 
		guildDb = await RaidDbHelper.addRaidChannel(guild, rs);

		CURRENT_RAID_DATA.set(NEW_RAID_VC.id, {
			reactCollector: reactCollector,
			mst: mst,
			keyReacts: new Collection<string, GuildMember[]>(),
			earlyReacts: [],
			timeout: timeout
		});

		// collector events
		let keysThatReacted: Collection<string, GuildMember[]> = new Collection<string, GuildMember[]>();
		let earlyReactions: GuildMember[] = [];
		reactCollector.on("collect", async (reaction: MessageReaction, user: User) => {
			if (reaction.emoji.id === null) {
				return; // this should never hit.
			}

			const member: GuildMember | null = guild.member(user);
			if (member === null) {
				return;
			}
			// TODO somehow key entry (in end afk control panel) have data from the early react (merged data)
			// check on this
			if (rs.dungeonInfo.keyEmojIDs.some(x => x.keyEmojID === reaction.emoji.id)
				&& !hasUserReactedWithKey(keysThatReacted, reaction.emoji.id, member.id)) {
				// only want 8 keys
				if (getAmountOfKeys(keysThatReacted, reaction.emoji.id) + 1 > 8) {
					await user.send(`**\`[${guild.name} ⇒ ${rs.section.nameOfSection}]\`** Thank you for your interest in contributing a key to the raid. However, we have enough people for now! A leader will give instructions if keys are needed; please ensure you are paying attention to the leader.`).catch(() => { });
					return;
				}
				// key react 
				UserAvailabilityHelper.InMenuCollection.set(user.id, UserAvailabilityHelper.MenuType.KEY_ASK);
				let hasAccepted: boolean = await keyReact(user, guild, NEW_RAID_VC, rs, reaction);
				UserAvailabilityHelper.InMenuCollection.delete(user.id);
				if (hasAccepted) {
					const currData: IStoredRaidData | undefined = CURRENT_RAID_DATA.get(rs.vcID);
					if (typeof currData === "undefined") {
						reactCollector.stop();
						return;
					}

					//if (!earlyReactions.some(x => x.id === user.id)) {
					keysThatReacted = addKeyToCollection(keysThatReacted, reaction.emoji.id, member);
					currData.keyReacts = addKeyToCollection(currData.keyReacts, reaction.emoji.id, member);
					rs.keyReacts.push({ userId: member.id, keyId: reaction.emoji.id });
					guildDb = await RaidDbHelper.addKeyReaction(guild, rs.vcID, member, reaction.emoji.id);
					//}

					let cpDescWithKey: string = `${controlPanelDescription}`;
					if (getStringRepOfKeyCollection(keysThatReacted, rs).length !== 0) {
						cpDescWithKey += `\n\n__**Key Reactions**__\n${getStringRepOfKeyCollection(keysThatReacted, rs)}`;
					}
					if (earlyReactions.length !== 0) {
						cpDescWithKey += `\n\n__**Early Reactions**__\n${earlyReactions.join(" ")}`;
					}
					controlPanelEmbed.setDescription(cpDescWithKey);
					controlPanelMsg.edit(controlPanelEmbed).catch(() => { });
				}
			}

			if (reaction.emoji.id === earlyLocationEmoji.id
				&& !earlyReactions.some(x => x.id === user.id)
				// if you reacted w/ key you dont need the location twice.
				&& !hasUserReactedWithKey(keysThatReacted, reaction.emoji.id, member.id)
				// make sure you have the early location role.
				&& guildDb.roles.earlyLocationRoles.some(x => member.roles.cache.has(x))) {
				if (earlyReactions.length + 1 > 10) {
					await user.send(`**\`[${guild.name} ⇒ ${rs.section.nameOfSection}]\`** You are unable to get the location early due to the volume of people that has requested the location early.`).catch(() => { });
					return;
				}

				await user.send(`**\`[${guild.name} ⇒ ${rs.section.nameOfSection}]\`** The location for this raid is ${StringUtil.applyCodeBlocks(rs.location)}Do not tell anyone this location.`);

				earlyReactions.push(member);
				const currData: IStoredRaidData | undefined = CURRENT_RAID_DATA.get(rs.vcID);
				if (typeof currData === "undefined") {
					reactCollector.stop();
					return;
				}

				currData.earlyReacts.push(member);
				rs.earlyReacts.push(member.id);
				guildDb = await RaidDbHelper.addEarlyReaction(guild, rs.vcID, member);

				let cpDescWithEarly: string = `${controlPanelDescription}`;
				if (getStringRepOfKeyCollection(keysThatReacted, rs).length !== 0) {
					cpDescWithEarly += `\n\n__**Key Reactions**__\n${getStringRepOfKeyCollection(keysThatReacted, rs)}`;
				}
				if (earlyReactions.length !== 0) {
					cpDescWithEarly += `\n\n__**Early Reactions**__\n${earlyReactions.join(" ")}`;
				}
				controlPanelEmbed.setDescription(cpDescWithEarly);
				controlPanelMsg.edit(controlPanelEmbed).catch(() => { });
			}
		});

		// react to control panel msgs
		await controlPanelMsg.react("⏹️").catch(() => { });
		await controlPanelMsg.react("🗑️").catch(() => { });
		await controlPanelMsg.react("✏️").catch(() => { });
		await controlPanelMsg.react("🗺️").catch(() => { });
	} // END OF FUNCTION

	/**
	 * Adds the key to the collection.
	 * @param col The key collection
	 * @param keyId The key ID. 
	 * @param member The person that reacted.
	 */
	function addKeyToCollection(
		collection: Collection<string, GuildMember[]>,
		keyId: string,
		member: GuildMember
	): Collection<string, GuildMember[]> {
		for (const [id, members] of collection) {
			// if key exists in collection
			if (id === keyId) {
				// if member is NOT in collection
				if (!members.some(x => x.id === member.id)) {
					(collection.get(id) as GuildMember[]).push(member);
				}
				return collection;
			}
		}

		collection.set(keyId, [member]);
		return collection;
	}

	/**
	 * Returns the amount of people that has reacted to a certain key.
	 * @param collection The key collection.
	 * @param keyId The ID of the key.
	 */
	function getAmountOfKeys(collection: Collection<string, GuildMember[]>, keyId: string): number {
		if (keyId === null) {
			return 0;
		}

		for (const [id, members] of collection) {
			if (id === keyId) {
				return members.length;
			}
		}
		return 0;
	}

	/**
	 * Whether a person has reacted with the key or not.
	 * @param col The key collection
	 * @param keyId The key ID. 
	 * @param userId The person that reacted.
	 */
	function hasUserReactedWithKey(col: Collection<string, GuildMember[]>, keyId: string, userId: string): boolean {
		if (keyId === null) {
			return false;
		}

		for (const [id, members] of col) {
			if (id === keyId) {
				for (const member of members) {
					if (member.id === userId) {
						return true;
					}
				}
			}
		}
		return false;
	}

	/**
	 * Returns a string consisting of all the keys that have been reacted to and who reacted to the keys.
	 * @param col The collection to represent as the string.
	 * @param rs The raid information.
	 */
	function getStringRepOfKeyCollection(col: Collection<string, GuildMember[]>, rs: IRaidInfo): string {
		const sb: StringBuilder = new StringBuilder();
		for (const [id, members] of col) {
			const keyData: {
				keyEmojID: string;
				keyEmojiName: string;
			} | undefined = rs.dungeonInfo.keyEmojIDs.find(x => x.keyEmojID === id);

			const keyName: string = typeof keyData === "undefined"
				? rs.dungeonInfo.dungeonName
				: keyData.keyEmojiName;

			sb.append(`${keyName}: ${members.join(" ")}`)
				.appendLine();
		}

		return sb.toString();
	}

	/**
	 * Should be called when someone reacts to the key emoji.
	 */
	async function keyReact(
		user: User,
		guild: Guild,
		raidVc: VoiceChannel,
		rs: IRaidInfo,
		reaction: MessageReaction
	): Promise<boolean> {
		return new Promise(async (resolve) => {
			const resolvedKeyType: { keyEmojID: string; keyEmojiName: string; } | undefined = rs.dungeonInfo.keyEmojIDs
				.find(x => x.keyEmojID === reaction.emoji.id);
			const keyName: string = typeof resolvedKeyType === "undefined"
				? rs.dungeonInfo.dungeonName
				: resolvedKeyType.keyEmojiName;

			const keyConfirmationMsg: Message | void = await user.send(`**\`[${guild.name} ⇒ ${rs.section.nameOfSection}]\`** You have indicated that you have a **${keyName}** key for ${raidVc.name}. To get the location, please type \`yes\`; otherwise, ignore this message.`).catch(() => { });

			if (typeof keyConfirmationMsg === "undefined") {
				return;
			}

			const dmedMessageCollector: MessageCollector = new MessageCollector(keyConfirmationMsg.channel as DMChannel, m => m.author.id === user.id, {
				time: 20000
			});

			dmedMessageCollector.on("collect", async (m: Message) => {
				if (m.content.toLowerCase() === "yes") {
					dmedMessageCollector.stop();
					user.send(`**\`[${guild.name} ⇒ ${rs.section.nameOfSection}]\`** The location for this raid is ${StringUtil.applyCodeBlocks(rs.location)}Do not tell anyone this location.`);
					return resolve(true);
				}
			});

			dmedMessageCollector.on("end", async () => {
				await keyConfirmationMsg.delete().catch(() => { });
				return resolve(false);
			});
		});
	}

	/**
	 * Gets an array of all permitted dungeons based on the section given.
	 * @param {ISection} section The section.
	 * @returns {IDungeonData[]} The list of dungeons.  
	 */
	export function getDungeonsAllowedInSection(section: ISection): IDungeonData[] {
		const dungeonData: IDungeonData[] = [];
		for (const dungeonId of section.properties.dungeons) {
			const data: IDungeonData | void = AFKDungeon.find(x => x.id === dungeonId);
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
		rs: IRaidInfo,
		raidVC: VoiceChannel,
		endedBy: GuildMember | "AUTO"
	): Promise<void> {
		let raidEntryExists: boolean = false;
		for (const raidEntry of guildDb.activeRaidsAndHeadcounts.raidChannels) {
			if (raidEntry.msgID === rs.msgID && raidEntry.vcID === raidVC.id) {
				raidEntryExists = true;
				break;
			}
		}

		// the afk check/raid somehow ended before the timer ended
		if (!raidEntryExists) {
			return;
		}

		// TODO add fail safe in case channels get deleted.
		const afkCheckChannel: TextChannel = guild.channels.cache.get(rs.section.channels.afkCheckChannel) as TextChannel;
		const controlPanelChannel: TextChannel = guild.channels.cache.get(rs.section.channels.controlPanelChannel) as TextChannel;
		let raidMsg: Message;
		try {
			raidMsg = await afkCheckChannel.messages.fetch(rs.msgID);
		}
		catch (e) {
			return; // if the msg is deleted, it prob means the raid was over long before the afk check timer even ended
		}

		let cpMsg: Message = await controlPanelChannel.messages.fetch(rs.controlPanelMsgId);
		await cpMsg.reactions.removeAll().catch(() => { });
		const raidVc: VoiceChannel = guild.channels.cache.get(rs.vcID) as VoiceChannel;

		// dungeon emoji 
		const portalEmoji: GuildEmoji = Zero.RaidClient.emojis.cache.get(rs.dungeonInfo.portalEmojiID) as GuildEmoji;

		// key reactions
		let peopleThatReactedToKey: Collection<string, GuildMember[]> = new Collection<string, GuildMember[]>();
		let peopleThatGotLocEarly: (GuildMember | null)[] = [];

		// TODO: optimize code (two for loops that iterate through the activeRaidsAndHeadcount prop)
		// update raid status so we're in raid mode
		// and remove entry from array with react collector & 
		// mst info
		const curRaidDataArrElem: IStoredRaidData | undefined = RaidHandler.CURRENT_RAID_DATA.get(rs.vcID)

		// if the timer ends but we already ended the afk check
		// then return as to not start another one 
		let foundInDb: boolean = false;
		if (typeof curRaidDataArrElem === "undefined") {
			// see if the afk check exists
			// in the db (in case the bot
			// restarted)
			for (let i = 0; i < guildDb.activeRaidsAndHeadcounts.raidChannels.length; i++) {
				if (guildDb.activeRaidsAndHeadcounts.raidChannels[i].vcID === raidVC.id) {
					for (const react of guildDb.activeRaidsAndHeadcounts.raidChannels[i].keyReacts) {
						const member: GuildMember | null = guild.member(react.userId);
						if (member === null) {
							continue;
						}
						if (peopleThatReactedToKey.has(react.keyId)) {
							(peopleThatReactedToKey.get(react.keyId) as GuildMember[]).push(member);
						}
						else {
							peopleThatReactedToKey.set(react.keyId, [member]);
						}
					}

					peopleThatGotLocEarly = guildDb.activeRaidsAndHeadcounts.raidChannels[i].earlyReacts
						.map(x => guild.member(x))
					foundInDb = true;
					break;
				}
			}

			if (!foundInDb) {
				return;
			}
		}
		else {
			clearInterval(curRaidDataArrElem.timeout);
			curRaidDataArrElem.reactCollector.stop();
			curRaidDataArrElem.mst.disableAutoTick();
			peopleThatReactedToKey = curRaidDataArrElem.keyReacts;
			peopleThatGotLocEarly = curRaidDataArrElem.earlyReacts;
		}

		await RaidDbHelper.updateRaidStatus(guild, raidVC.id);
		await raidVc.updateOverwrite(guild.roles.everyone, { CONNECT: false }).catch(() => { });

		// remove 
		CURRENT_RAID_DATA.delete(rs.vcID);

		// get all reactions
		let reactionSummary: { [emojiName: string]: Collection<string, User> } = {};
		for (let [, reaction] of raidMsg.reactions.cache) {
			reactionSummary[reaction.emoji.name] = reaction.users.cache.filter(x => x.id !== (Zero.RaidClient.user as ClientUser).id);
		}

		// get reactions for dungeon, key
		const pplThatReactedToMain: Collection<string, User> = reactionSummary[portalEmoji.name];

		// look for a lounge vc in the section
		const loungeVC: VoiceChannel | undefined = guild.channels.cache
			.filter(x => x.type === "voice")
			.filter(x => x.parentID === raidVC.parentID)
			.find(x => x.name.toLowerCase().includes("lounge") || x.name.toLowerCase().includes("queue")) as VoiceChannel | undefined;

		// move people out if there is a lounge vc 
		if (typeof loungeVC !== "undefined") {
			for (let [id, member] of raidVC.members) {
				let isFound: boolean = false;
				for (let [idC] of pplThatReactedToMain) {
					if (idC === id) {
						isFound = true;
						break;
					}
				}

				const data: GuildUtil.RaidLeaderStatus = GuildUtil.getRaidLeaderStatus(member, guildDb, rs.section);

				// if they were not found in the list of reactions
				// AND they are not a staff member 
				let shouldBeMovedOut: boolean = !isFound && !data.isUniversal && data.roleType === null

				if (shouldBeMovedOut) {
					member.voice.setChannel(loungeVC).catch(() => { });
				}
			}
		}

		// remove any null entries
		peopleThatGotLocEarly = peopleThatGotLocEarly.filter(x => x !== null);
		peopleThatReactedToKey = peopleThatReactedToKey.filter(x => x !== null);

		const postAfkControlPanelEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(`Control Panel: Raiding ${rs.raidNum}`, rs.dungeonInfo.portalLink)
			.setDescription("A post-AFK check is currently running.")
			.setColor(ArrayUtil.getRandomElement<ColorResolvable>(rs.dungeonInfo.colors))
			.setTimestamp()
			.setFooter(`Control Panel • Post AFK • R${rs.raidNum}`);
		if (getStringRepOfKeyCollection(peopleThatReactedToKey, rs).length !== 0) {
			postAfkControlPanelEmbed.addField("Key Reactions", getStringRepOfKeyCollection(peopleThatReactedToKey, rs));
		}
		if (peopleThatGotLocEarly.length !== 0) {
			postAfkControlPanelEmbed.addField("Early Location", peopleThatGotLocEarly.join(" "));
		}

		await cpMsg.edit(postAfkControlPanelEmbed).catch(() => { });

		const durationOfPostAfk: number = determineDurationForPostAfk(raidVc.members.size);

		if (durationOfPostAfk !== 0) {
			const postAfkEmbed: MessageEmbed = new MessageEmbed()
				.setAuthor(`The ${rs.dungeonInfo.dungeonName} post-AFK Check has been initiated.`, rs.dungeonInfo.portalLink)
				.setDescription(`Instructions: Join any available voice channel and then **react** with ${Zero.RaidClient.emojis.cache.get(rs.dungeonInfo.portalEmojiID)}.`)
				.setColor(ArrayUtil.getRandomElement(rs.dungeonInfo.colors))
				.setImage(ArrayUtil.getRandomElement(rs.dungeonInfo.bossLink))
				.setFooter(`${guild.name}: Post AFK Check`);
			raidMsg = await raidMsg.edit(`This post-AFK check has ${durationOfPostAfk} seconds remaining.`, postAfkEmbed);
			const mst: MessageSimpleTick = new MessageSimpleTick(raidMsg, `This post-AFK check has {s} seconds remaining.`, durationOfPostAfk * 1000);
			// begin post afk check 
			const postAFKReaction = (reaction: MessageReaction, user: User) => {
				return reaction.emoji.id === portalEmoji.id
					&& (Zero.RaidClient.user as ClientUser).id !== user.id;
			}

			// begin collectors
			const postAFKMoveIn: ReactionCollector = raidMsg.createReactionCollector(postAFKReaction, {
				time: durationOfPostAfk * 1000
			});
			// unpin msg 
			await raidMsg.unpin().catch(() => { });
			await raidVC.edit({
				name: `⌛ ${raidVC.name.replace("🚦", "").trim()}`
			});

			// events
			postAFKMoveIn.on("collect", async (r) => {
				for await (let [id] of r.users.cache) {
					const member: GuildMember | null = guild.member(id);
					// TODO fix post afk not working 
					if (member !== null && member.voice.channel !== null) {
						await member.voice.setChannel(raidVC).catch(console.error);
					}
				}
			});

			postAFKMoveIn.on("end", async () => {
				mst.disableAutoTick();
				// now we can end the afk fully
				// do some calculations
				await endAfkDisplay(raidVC, endedBy, rs, guild, raidMsg, peopleThatGotLocEarly, peopleThatReactedToKey, cpMsg);
			});
		}
		else {
			await endAfkDisplay(raidVC, endedBy, rs, guild, raidMsg, peopleThatGotLocEarly, peopleThatReactedToKey, cpMsg);
		}
	} // end function

	/**
	 * Displays the end AFK check embed.
	 * TODO optimize function so it uses LESS parameters.
	 */
	async function endAfkDisplay(
		raidVC: VoiceChannel,
		endedBy: string | GuildMember,
		rs: IRaidInfo,
		guild: Guild,
		raidMsg: Message,
		peopleThatGotLocEarly: (GuildMember | null)[],
		peopleThatReactedToKey: Collection<string, GuildMember[]>,
		cpMsg: Message
	) {
		const raidersPresent: number = raidVC.members.size;
		// set embed
		const embed: MessageEmbed = new MessageEmbed()
			.setAuthor(typeof endedBy === "string" ? `The ${rs.dungeonInfo.dungeonName} AFK Check has ended automatically.` : `${endedBy.displayName} has ended the ${rs.dungeonInfo.dungeonName} AFK Check.`, rs.dungeonInfo.portalLink)
			.setDescription(`The AFK check is now over.\nWe are currently running a raid with ${raidersPresent} members.`)
			.setFooter(`${guild.name}: Raid`)
			.setImage(ArrayUtil.getRandomElement(rs.dungeonInfo.bossLink))
			.setColor(ArrayUtil.getRandomElement(rs.dungeonInfo.colors));
		await raidMsg.edit("This AFK check is now over.", embed).catch(() => { });
		await raidVC.edit({
			name: `🔴 ${raidVC.name.replace("⌛", "").replace("🚦", "").trim()}`
		});
		// control panel 
		const initiator: GuildMember | null = guild.member(rs.startedBy);
		let descStr: string = `Control panel commands will only work if you are in the corresponding voice channel. Below are details regarding the raid.\n\nRaid Section: ${rs.section.nameOfSection}\nInitiator: ${initiator === null ? "Unknown" : initiator} (${initiator === null ? "Unknown" : initiator.displayName})\nDungeon: ${rs.dungeonInfo.dungeonName} ${Zero.RaidClient.emojis.cache.get(rs.dungeonInfo.portalEmojiID)}\nVoice Channel: Raiding ${rs.raidNum}\nDungeons Completed: ${rs.dungeonsDone}`;
		if (peopleThatGotLocEarly.length !== 0) {
			descStr += `\n\n__**Early Locations**__\n${peopleThatGotLocEarly.join(" ")}`;
		}
		if (getStringRepOfKeyCollection(peopleThatReactedToKey, rs).length !== 0) {
			descStr += `\n\n__**Key Reacts**__\n${getStringRepOfKeyCollection(peopleThatReactedToKey, rs)}`;
		}
		const startRunControlPanelEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(`Control Panel: Raiding ${rs.raidNum}`, rs.dungeonInfo.portalLink)
			.setDescription(descStr)
			.addField("End Raid", "React with ⏹️ to end the raid. This will move members into the lounge voice channel, if applicable, and delete the voice channel.")
			.addField("Set Location", "React with ✏️ to set a new location. You will be DMed. The new location will be sent to anyone that has the location (people that reacted with key, Nitro boosters, raid leaders, etc.)")
			.addField("Get Location", "React with 🗺️ to get the current raid location.")
			.addField("Lock Raiding Voice Channel", "React with 🔒 to __lock__ the raiding voice channel. This will prevent members from joining freely.")
			.addField("Unlock Raiding Voice Channel", "React with 🔓 to __unlock__ the raiding voice channel. This will allow members to join freely.")
			.setColor(ArrayUtil.getRandomElement<ColorResolvable>(rs.dungeonInfo.colors))
			.setTimestamp()
			.setFooter(`Control Panel • In Raid • R${rs.raidNum}`);
		await cpMsg.edit(startRunControlPanelEmbed).catch(() => { });
		await cpMsg.react("⏹️").catch(() => { });
		await cpMsg.react("✏️").catch(() => { });
		await cpMsg.react("🗺️").catch(() => { });
		await cpMsg.react("🔒").catch(() => { });
		await cpMsg.react("🔓").catch(() => { });
	}

	/**
	 * Determines the duration of the post-AFK check.
	 * @param {number} amtOfPeople The amount of people in the VC. 
	 */
	function determineDurationForPostAfk(amtOfPeople: number): number {
		let dur: number;
		if (amtOfPeople > 80) {
			dur = -0.5 * amtOfPeople + 45;
			if (dur < 0) {
				dur = 0;
			}
		}
		else {
			dur = -Math.sqrt(8 * amtOfPeople) + 30;
		}
		return Math.round(dur);
	}

	/**
	 * Ends the raid.  
	 */
	export async function endRun(
		memberThatEnded: GuildMember,
		guild: Guild,
		rs: IRaidInfo
	): Promise<void> {
		const afkCheckChannel: TextChannel = guild.channels.cache.get(rs.section.channels.afkCheckChannel) as TextChannel;
		let raidMsg: Message = await afkCheckChannel.messages.fetch(rs.msgID);
		const controlPanelChannel: TextChannel = guild.channels.cache.get(rs.section.channels.controlPanelChannel) as TextChannel;
		let cpMsg: Message = await controlPanelChannel.messages.fetch(rs.controlPanelMsgId);
		const raidVC: VoiceChannel = guild.channels.cache.get(rs.vcID) as VoiceChannel;
		const membersLeft: Collection<string, GuildMember> = raidVC.members;

		// if we're in post afk 
		if (typeof raidMsg.embeds[0].description !== "undefined" && raidMsg.embeds[0].description.includes("Join any available voice channel and then")) {
			return;
		}

		await RaidDbHelper.removeRaidChannel(guild, raidVC.id);

		const endedRun: MessageEmbed = new MessageEmbed()
			.setAuthor(`${memberThatEnded.displayName} has ended the ${rs.dungeonInfo.dungeonName} raid.`, rs.dungeonInfo.portalLink)
			.setDescription(`The ${rs.dungeonInfo.dungeonName} raid is now finished.\n${membersLeft.size} members have stayed with us throughout the entire raid.`)
			.setImage("https://static.drips.pw/rotmg/wiki/Enemies/Event%20Chest.png")
			.setColor(ArrayUtil.getRandomElement<ColorResolvable>(rs.dungeonInfo.colors))
			.setFooter(guild.name);
		await raidMsg.edit("The raid is now over. Thanks to everyone for attending!", endedRun);
		await raidMsg.unpin().catch(() => { });
		await cpMsg.delete().catch(() => { });
		await logCompletedRunsForRaiders(guild, membersLeft, rs, 1);
		await movePeopleOutAndDeleteRaidVc(guild, raidVC);
	}

	/**
	 * Move people out of the raid VC (if possible) and deletes the raiding voice channel. 
	 */
	async function movePeopleOutAndDeleteRaidVc(guild: Guild, raidVC: VoiceChannel) {
		const loungeVC: VoiceChannel | undefined = guild.channels.cache
			.filter(x => x.type === "voice")
			.filter(x => x.parentID === raidVC.parentID)
			.find(x => x.name.toLowerCase().includes("lounge") || x.name.toLowerCase().includes("queue")) as VoiceChannel | undefined;
		// set perms so rls cant move ppl in
		const permsToUpdate: OverwriteResolvable[] = [];
		for (const [, perm] of raidVC.permissionOverwrites) {
			permsToUpdate.push({
				id: perm.id,
				deny: ["MOVE_MEMBERS"]
			});
		}
		await raidVC.overwritePermissions(permsToUpdate).catch(() => { });

		// move people out if there is a lounge vc 
		if (typeof loungeVC !== "undefined") {
			const promises: Promise<void>[] = raidVC.members.map(async (x) => {
				await x.voice.setChannel(loungeVC).catch(() => { });
			});
			Promise.all(promises).then(async () => {
				await raidVC.delete().catch(() => { });
			});
		}
		else {
			await raidVC.delete().catch(() => { });
		}

		// check vc to see if we can delete it
		const interval: NodeJS.Timeout = setInterval(async () => {
			// vc doesnt exist
			if (!guild.channels.cache.has(raidVC.id)) {
				clearInterval(interval);
				return;
			}

			if (raidVC.members.size <= 0) {
				await raidVC.delete().catch(() => { });
				clearInterval(interval);
				return;
			}
		}, 5 * 1000);
	}

	/**
	 * Aborts the AFK check.  
	 */
	export async function abortAfk(
		guild: Guild,
		rs: IRaidInfo,
		raidVC: VoiceChannel
	): Promise<void> {
		const afkCheckChannel: TextChannel = guild.channels.cache.get(rs.section.channels.afkCheckChannel) as TextChannel;
		let raidMsg: Message = await afkCheckChannel.messages.fetch(rs.msgID);
		const controlPanelChannel: TextChannel = guild.channels.cache.get(rs.section.channels.controlPanelChannel) as TextChannel;
		let cpMsg: Message = await controlPanelChannel.messages.fetch(rs.controlPanelMsgId);

		// and remove entry from array with react collector & 
		// mst info
		const curRaidDataArrElem: IStoredRaidData | void = RaidHandler.CURRENT_RAID_DATA.get(rs.vcID);
		if (typeof curRaidDataArrElem !== "undefined") {
			curRaidDataArrElem.reactCollector.stop();
			curRaidDataArrElem.mst.disableAutoTick();
			clearInterval(curRaidDataArrElem.timeout);
		}
		await RaidDbHelper.removeRaidChannel(guild, raidVC.id);

		const abortAfk: MessageEmbed = new MessageEmbed()
			.setAuthor(`The ${rs.dungeonInfo.dungeonName} AFK Check has been aborted.`, rs.dungeonInfo.portalLink)
			.setDescription("This could either be due to a lack of keys or a lack of raiders, or both. Keep an eye out for future AFK checks.")
			.setColor(ArrayUtil.getRandomElement(rs.dungeonInfo.colors))
			.setFooter(guild.name);
		await raidMsg.edit("Unfortunately, the AFK check has been aborted.", abortAfk);
		await raidMsg.unpin().catch(() => { });
		await cpMsg.delete().catch(console.error);
		await movePeopleOutAndDeleteRaidVc(guild, raidVC);
	}

	/**
	 * Starts a headcount. 
	 */
	export async function startHeadCountWizard(
		msg: Message,
		guildDb: IRaidGuild,
		guild: Guild
	): Promise<void> {
		const member: GuildMember = msg.member as GuildMember;
		// ==================================
		// begin getting afk check channel 
		// ==================================
		const sections: ISection[] = [GuildUtil.getDefaultSection(guildDb), ...guildDb.sections];

		const HEADCOUNT_CHANNEL: TextChannel | "ERROR" | null = await getAfkCheckChannel(msg, guild, guildDb, sections);
		// still null => get out
		if (HEADCOUNT_CHANNEL === null) {
			MessageUtil.send({ content: "A headcount could not be started because there was an issue finding the channel." }, msg.channel as TextChannel);
			return;
		}

		// either canceled or timed out
		if (HEADCOUNT_CHANNEL === "ERROR") {
			return;
		}

		//const SECTION_CATEGORY: CategoryChannel = AFK_CHECK_CHANNEL.parent as CategoryChannel;
		const SECTION: ISection | undefined = sections.find(x => x.channels.afkCheckChannel === HEADCOUNT_CHANNEL.id);

		// ==================================
		// determine dungeon for raid 
		// ==================================

		if (typeof SECTION === "undefined") {
			// let's see if the db has it
			// chances are, the bot may have reset
			// and the items stored in memory could 
			// have been reset
			MessageUtil.send({ content: "A headcount could not be started because the selected channel has no category associated with it." }, msg.channel as TextChannel);
			return;
		}

		const rlInfo: GuildUtil.RaidLeaderStatus = GuildUtil.getRaidLeaderStatus(member, guildDb, SECTION);
		if (rlInfo.roleType === null && !rlInfo.isUniversal) {
			MessageUtil.send({ content: "A headcount could not be started because you are not authorized to start headcounts in this section." }, msg.channel as TextChannel);
			return;
		}

		const dungeons: IDungeonData[] = getDungeonsAllowedInSection(SECTION);
		if (dungeons.length === 0) {
			MessageUtil.send({ content: "A headcount could not be started because there are no dungeons available for this section." }, msg.channel as TextChannel);
			return;
		}

		const foundHeadcounts: IHeadCountInfo[] = guildDb.activeRaidsAndHeadcounts.headcounts.filter(x => x.section.channels.afkCheckChannel);
		if (foundHeadcounts.length > 0 && foundHeadcounts[0].section.channels.afkCheckChannel === HEADCOUNT_CHANNEL.id) {
			MessageUtil.send({ content: "A headcount could not be started because there is already a pending headcount." }, msg.channel as TextChannel);
			return;
		}

		let allDungeons: { data: IDungeonData, isIncluded: boolean }[] = [];
		for (const dungeon of dungeons) {
			if (dungeon.keyEmojIDs.length !== 0) {
				allDungeons.push({ data: dungeon, isIncluded: false });
			}
		}

		const sentHeadCountMessage: Message | void = await msg.channel.send(getHeadCountEmbed(msg, allDungeons))
			.catch(() => { });

		if (typeof sentHeadCountMessage === "undefined") {
			return; // probably because no permission
		}

		const hcCollector: MessageCollector = new MessageCollector(msg.channel as TextChannel, m => m.author.id === msg.author.id, {
			time: 300000
		});

		hcCollector.on("collect", async (m: Message) => {
			await m.delete().catch(() => { });
			if (m.content === "cancel") {
				hcCollector.stop("CANCELED");
				return;
			}

			if (m.content === "send") {
				hcCollector.stop("SEND");
				return;
			}

			const nums: number[] = NumberUtil.parseNumbersFromString(m.content);
			for (const num of nums) {
				if (num - 1 < 0 || num - 1 >= allDungeons.length) {
					return; // out of index
				}

				// if not included, let's make sure
				// we can add it 
				if (!allDungeons[num - 1].isIncluded) {
					if (canAddAnother(allDungeons, allDungeons[num - 1].data.keyEmojIDs.length)) {
						allDungeons[num - 1].isIncluded = true;
					}
				}
				else {
					allDungeons[num - 1].isIncluded = false;
				}
			} // end loop
			sentHeadCountMessage.edit(getHeadCountEmbed(msg, allDungeons));
		});

		hcCollector.on("end", async (collected: Collection<string, Message>, reason: string) => {
			await sentHeadCountMessage.delete().catch(() => { });

			if (reason === "time" || reason === "CANCELED") {
				return;
			}

			if (allDungeons.filter(x => x.isIncluded).length === 0) {
				MessageUtil.send({ content: "A headcount cannot be started because you did not select any dungeons for the headcount." }, msg.channel as TextChannel);
				return;
			}

			startHeadCount(msg, guildDb, guild, SECTION, HEADCOUNT_CHANNEL, allDungeons.filter(x => x.isIncluded).map(x => x.data));
		});
	}

	async function startHeadCount(
		msg: Message,
		guildDb: IRaidGuild,
		guild: Guild,
		section: ISection,
		afkCheckChannel: TextChannel,
		dungeonsForHc: IDungeonData[]
	): Promise<void> {
		const member: GuildMember = msg.member as GuildMember;
		const CONTROL_PANEL_CHANNEL: TextChannel | undefined = guild.channels.cache
			.get(section.channels.controlPanelChannel) as TextChannel | undefined;

		if (typeof CONTROL_PANEL_CHANNEL === "undefined") {
			MessageUtil.send({ content: "A headcount could not be started because the control panel channel is not configured." }, msg.channel as TextChannel);
			return;
		}

		const hcControlPanelEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor("Control Panel: Headcount", "https://i.imgur.com/g2wovmA.png")
			.setDescription(`Initiator: ${member} (${member.displayName})`)
			.addField("Stop Headcount", "React with ❌ to stop the headcount. You will receive the results of the headcount, if any.")
			.setColor("RANDOM")
			.setTimestamp()
			.setFooter("Control Panel • Headcount Pending");
		const controlPanelMsgEntry: Message = await CONTROL_PANEL_CHANNEL.send(hcControlPanelEmbed);
		await controlPanelMsgEntry.pin().catch(e => { });

		await controlPanelMsgEntry.react("❌").catch(() => { });

		const hcEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(`${member.displayName} has initiated a headcount.`, "https://i.imgur.com/g2wovmA.png")
			.setColor("RANDOM")
			.setTimestamp()
			.setDescription(`⇒ **React** with ${Zero.RaidClient.emojis.cache.get(AllEmoji)} if you want to participate in a raid with us.\n⇒ If you have a key and are willing to use it, then react with the corresponding key(s).`);

		const emojis: EmojiResolvable[] = [
			Zero.RaidClient.emojis.cache.get(AllEmoji) as GuildEmoji,
		];
		for (const dungeon of dungeonsForHc) {
			for (const key of dungeon.keyEmojIDs) {
				emojis.push(key.keyEmojID);
			}
		}

		const hcMessage: Message = await afkCheckChannel.send(`@here, a headcount is currently in progress. There are 10 minutes and 0 seconds remaining on this headcount.`, { embed: hcEmbed });
		const mst: MessageSimpleTick = new MessageSimpleTick(hcMessage, "@here, a headcount is currently in progress. There are {m} minutes and {s} seconds remaining on this headcount.", MAX_TIME_LEFT * 2); // 10 min
		await hcMessage.pin().catch(() => { });

		FastReactionMenuManager.reactFaster(hcMessage, emojis);

		const hcInfo: IHeadCountInfo = {
			section: section,
			msgID: hcMessage.id,
			startTime: new Date().getTime(),
			startedBy: member.id,
			dungeonsForHc: dungeonsForHc.map(x => x.id),
			controlPanelMsgId: controlPanelMsgEntry.id
		};

		await RaidDbHelper.addHeadcount(guild, hcInfo);

		// TODO see if if there is a way to stop the timeout in case the headcount ends early.
		const timeout: NodeJS.Timeout = setTimeout(async () => {
			mst.disableAutoTick();
			guildDb = await (new MongoDbHelper.MongoDbGuildManager(guild.id).findOrCreateGuildDb());
			endHeadcount(guild, guildDb, dungeonsForHc, "AUTO", hcInfo);
		}, MAX_TIME_LEFT * 2);

		CURRENT_HEADCOUNT_DATA.set(hcMessage.id, {
			timeout: timeout,
			mst: mst
		});
	}

	export async function endHeadcount(
		guild: Guild,
		guildDb: IRaidGuild,
		dungeonsForHc: IDungeonData[],
		endedBy: GuildMember | "AUTO",
		hcInfo: IHeadCountInfo
	): Promise<void> {
		let hcEntryFound: boolean = false;
		for (const hcEntry of guildDb.activeRaidsAndHeadcounts.headcounts) {
			if (hcEntry.msgID === hcInfo.msgID) {
				hcEntryFound = true;
				break;
			}
		}

		if (!hcEntryFound) {
			return;
		}

		// see if the headcount exists or not
		// TODO: check db first in case bot restarts
		const HEADCOUNT_CHANNEL: TextChannel = guild.channels.cache.get(hcInfo.section.channels.afkCheckChannel) as TextChannel;
		const hcMsg: Message = await HEADCOUNT_CHANNEL.messages.fetch(hcInfo.msgID);

		const headcountArrElemData: IStoredHeadcountData | undefined = RaidHandler.CURRENT_HEADCOUNT_DATA.get(hcInfo.msgID);

		// get control panel
		const CONTROL_PANEL_CHANNEL: TextChannel = guild.channels.cache
			.get(hcInfo.section.channels.controlPanelChannel) as TextChannel;
		const controlPanelMessage: Message = await CONTROL_PANEL_CHANNEL.messages.fetch(hcInfo.controlPanelMsgId);

		// if the timer ends but we already ended the hc
		// then return as to not "end" the hc twice
		let dbIsFound: boolean = false;
		if (typeof headcountArrElemData === "undefined") {
			for (let i = 0; i < guildDb.activeRaidsAndHeadcounts.headcounts.length; i++) {
				if (guildDb.activeRaidsAndHeadcounts.headcounts[i].msgID === hcMsg.id) {
					dbIsFound = true;
					break;
				}
			}

			if (!dbIsFound) {
				return;
			}
		}
		else {
			headcountArrElemData.mst.disableAutoTick();
			clearInterval(headcountArrElemData.timeout);
		}
		// remove from db
		await RaidDbHelper.removeHeadcount(guild, hcMsg.id);
		await hcMsg.unpin().catch(() => { });

		// remove from array
		CURRENT_HEADCOUNT_DATA.delete(hcInfo.msgID);

		// let's now get the data, if any 
		const reactionsFromHeadcount: Collection<string, MessageReaction> = (await hcMsg.fetch()).reactions.cache;
		const newEmbed: MessageEmbed = new MessageEmbed()
			.setTitle(`🔕 The headcount has been ended ${endedBy === "AUTO" ? "automatically" : `by ${endedBy.displayName}`}`)
			.setColor("RANDOM")
			.setDescription(`There are currently ${(reactionsFromHeadcount.get(AllEmoji) as MessageReaction).users.cache.size} raiders ready.`)
			.setTimestamp();

		const newControlPanelEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor("Control Panel: Headcount Results", "https://i.imgur.com/g2wovmA.png")
			.setDescription(`Headcount Ended By: ${endedBy === "AUTO" ? "Timer" : `${endedBy} (${endedBy.displayName})`}\nRaiders Ready: ${(reactionsFromHeadcount.get(AllEmoji) as MessageReaction).users.cache.size - 1}`)
			.addField("Delete Results", "React with 🗑️ to delete this message. This action will automatically be performed in 10 minutes.")
			.setColor("RANDOM")
			.setTimestamp()
			.setFooter("Control Panel • Headcount Ended");

		for (const [, reaction] of reactionsFromHeadcount) {
			if (reaction.emoji.id !== null && reaction.emoji.id === AllEmoji) {
				continue;
			}

			let userStr: string = "";
			for (const [, user] of reaction.users.cache) {
				if (user.id === ((Zero.RaidClient.user as ClientUser).id)) {
					continue;
				}
				const member: GuildMember = guild.member(user) as GuildMember;
				userStr += `${member.displayName}\n`;
			}

			let keyName: string = "";
			// find emoji name
			dungeonInfoLoop: for (const dungeon of dungeonsForHc) {
				for (const key of dungeon.keyEmojIDs) {
					if (key.keyEmojID === reaction.emoji.id) {
						keyName = key.keyEmojiName;
						break dungeonInfoLoop;
					}
				}
			}

			if (keyName === "" || userStr === "") {
				continue;
			}
			newControlPanelEmbed.addField(keyName, StringUtil.applyCodeBlocks(userStr), true);
		}

		await hcMsg.edit(newEmbed).catch(() => { });
		await hcMsg.unpin().catch(() => { });
		await controlPanelMessage.reactions.removeAll().catch(() => { });
		await controlPanelMessage.edit(newControlPanelEmbed).catch(() => { });
		await controlPanelMessage.react("🗑️").catch(() => { });
		setTimeout(async () => {
			try {
				await controlPanelMessage.delete();
			}
			catch (e) {
				// ignore
			}
		}, 10 * 60 * 1000); // TODO unknowm msg error from headcount
	}

	/**
	 * Creates an embed with the specified headcount settings. 
	 * Precondition: The dungeons in `ihcpi` must have at least one key. 
	 */
	function getHeadCountEmbed(msg: Message, ihcpi: { data: IDungeonData, isIncluded: boolean }[]): MessageEmbed {
		let amtKeys: number = 0;
		for (const included of ihcpi) {
			if (included.isIncluded) {
				amtKeys += included.data.keyEmojIDs.length;
			}
		}
		const configureHeadCountEmbed: MessageEmbed = new MessageEmbed()
			.setTitle("⚙️ Configuring Headcount: Dungeon Selection")
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setDescription("You are close to starting a headcount! However, you need to select dungeons from the below list. To begin, please type the number (e.g. `2`, `15`) or range of numbers (e.g. `5-10`, `11-16`) corresponding to the dungeon(s) you want to add to the headcount. To send this headcount, type `send`. To cancel, type `cancel`.\n\nA ☑️ next to the dungeon means the dungeon will be included in the headcount.\nA ❌ means the dungeon will not be part of the overall headcount.")
			.setColor("RANDOM")
			.setFooter(`${(msg.guild as Guild).name} | ${amtKeys}/19 Remaining Slots`);
		let i: number = 0;
		let k: number = 0;
		let l: number = 0;
		while (ihcpi.length > 0) {
			i++;
			let str: string = "";
			for (let j = 0; j < ihcpi.slice(0, 10).length; j++) {
				k = j + l;
				str += `\`[${k + 1}]\` ${ihcpi[j].isIncluded ? "☑️" : "❌"} ${ihcpi[j].data.keyEmojIDs.length === 0 ? "" : Zero.RaidClient.emojis.cache.get(ihcpi[j].data.keyEmojIDs[0].keyEmojID)} ${ihcpi[j].data.dungeonName}\n`;
			}
			l += 10;
			configureHeadCountEmbed.addFields({
				name: `Dungeon Selection: Part ${i}`,
				value: str,
				inline: true
			});
			ihcpi = ihcpi.slice(10);
			str = "";
		}

		return configureHeadCountEmbed;
	}

	/**
	 * Determines whether another dungeon can be added to the headcount or not. 
	 */
	function canAddAnother(ihcpi: { data: IDungeonData, isIncluded: boolean }[], amtToAdd: number, max: number = 19): boolean {
		return ihcpi.filter(x => x.isIncluded).length + amtToAdd <= max;
	}

	/**
	 * Returns the AFK check (and the section). 
	 */
	async function getAfkCheckChannel(
		msg: Message,
		guild: Guild,
		guildDb: IRaidGuild,
		sections: ISection[]
	): Promise<TextChannel | null | "ERROR"> {
		// first, let's see if they ran the command under a specific category 
		const parentOfRecipientChannel: CategoryChannel | null = (msg.channel as TextChannel).parent;
		if (parentOfRecipientChannel !== null) {
			// let's now see if we can find an afk check channel associated with the category 
			for (let section of sections) {
				if (guild.channels.cache.has(section.channels.afkCheckChannel)
					&& (guild.channels.cache.get(section.channels.afkCheckChannel) as TextChannel).parent !== null
					&& (guild.channels.cache.get(section.channels.afkCheckChannel) as TextChannel).parentID === parentOfRecipientChannel.id) {
					// we found the parent 
					return guild.channels.cache.get(section.channels.afkCheckChannel) as TextChannel;
				}
			}
		}


		// we want the user to decide what section he/she wants to run, if any 
		if (guildDb.sections.length > 0) {
			let responseToSection: TextChannel | "TIME_CMD" | "CANCEL_CMD" = await new Promise(async (resolve) => {
				let min: number = 1;
				let max: number = min;

				const embed: MessageEmbed = new MessageEmbed()
					.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
					.setTitle("⚙️ Select a Raid Section")
					.setDescription("Your server contains multiple raiding sections. Please select the appropriate section by typing the number associated with the section you want to start an AFK check or headcount in.\n\n__Symbols__\n☑️ means you have the appropriate permission to start a run or headcount in the associated section.\n❌ means you do not have permission to start a run or headcount in the associated section.")
					.setFooter(guild.name)
					.setColor("RANDOM");
				for (let i = 0; i < sections.length; i++) {
					const rlInfo: GuildUtil.RaidLeaderStatus = GuildUtil.getRaidLeaderStatus(
						msg.member as GuildMember,
						guildDb,
						sections[i]
					);
					const hasPermission: boolean = rlInfo.roleType !== null || rlInfo.isUniversal;

					if (guild.channels.cache.has(sections[i].channels.afkCheckChannel)) {
						const afkCheckChannel: TextChannel = guild.channels.cache.get(sections[i].channels.afkCheckChannel) as TextChannel;
						const sectionParent: CategoryChannel | null = afkCheckChannel.parent;
						// we want a category associated with the afk check channel
						if (sectionParent !== null) {
							embed.addFields({
								name: `**[${max}]** ${sections[i].nameOfSection} ${hasPermission ? "☑️" : "❌"}`,
								value: `AFK Check Channel: ${afkCheckChannel}`
							});
							max++;
						}
						else {
							sections.splice(i, 1);
							i--;

						}
					}
					else {
						sections.splice(i, 1);
						i--;
					}
				}

				const gmc: GenericMessageCollector<number> = new GenericMessageCollector<number>(
					msg,
					{ embed: embed },
					1,
					TimeUnit.MINUTE
				);

				const response: number | "CANCEL_CMD" | "TIME_CMD" = await gmc.send(
					async (collectedMsg: Message): Promise<number | void> => {
						const num: number = Number.parseInt(collectedMsg.content);
						if (Number.isNaN(num)) {
							await msg.channel.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_NUMBER_INPUT", null));
							return;
						}

						// sloppy way to check, maybe be a little more formal about it
						if (typeof sections[num - 1] === "undefined") {
							await msg.channel.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_INDEX", null));
							return;
						}

						return num - 1;
					}
				);

				if (typeof response === "number") {
					resolve(guild.channels.cache.get(sections[response].channels.afkCheckChannel) as TextChannel);
					return;
				}
				resolve(response);
			}); // end of promise 

			if (responseToSection === "TIME_CMD" || responseToSection === "CANCEL_CMD") {
				return "ERROR";
			}

			return responseToSection;
		} // end of section check if 
		else {
			if (guild.channels.cache.has(guildDb.generalChannels.generalRaidAfkCheckChannel)
				&& (guild.channels.cache.get(guildDb.generalChannels.generalRaidAfkCheckChannel) as TextChannel).parent !== null) {
				return guild.channels.cache.get(guildDb.generalChannels.generalRaidAfkCheckChannel) as TextChannel;
			}
		}

		return null;
	}

	/**
	 * Whether the voice channel ends with a number or not.
	 * @param {VoiceChannel} vc The voice channel.  
	 * @returns {boolean} Whether the VC ends with a number or not. 
	 */
	function vcEndsWithNumber(vc: VoiceChannel): boolean {
		return !Number.isNaN(Number.parseInt(vc.name.split(" ")[vc.name.split(" ").length - 1]));
	}

	/**
	 * Logs the run for all raiders that attended.
	 * @param {Guild} guild The guild.
	 * @param {Collection<string, GuildMember>} members The members that attended the raid.
	 * @param {IRaidInfo} raidInfo The raid information.
	 * @param {number} [amount = 1] The amount to log.
	 */
	export async function logCompletedRunsForRaiders(
		guild: Guild,
		members: Collection<string, GuildMember>,
		raidInfo: IRaidInfo,
		amount: number = 1
	): Promise<void> {
		// make sure everyone has an entry
		const filterQueryCheckNoProfile: FilterQuery<IRaidUser> = {};
		filterQueryCheckNoProfile.$or = [];
		for (const [, member] of members) {
			filterQueryCheckNoProfile.$or.push({
				discordUserId: member.id
			});
		}

		const results: IRaidUser[] = await MongoDbHelper.MongoDbUserManager.MongoUserClient
			.find(filterQueryCheckNoProfile).toArray();

		// see who needs a profile
		const pplToAddProfileTo: FilterQuery<IRaidUser> = {};
		pplToAddProfileTo.$or = [];
		for (const memberFound of results) {
			if (memberFound.general.completedRuns.findIndex(x => x.server === guild.id) === -1) {
				pplToAddProfileTo.$or.push({
					discordUserId: memberFound.discordUserId
				});
			}
		}

		if (pplToAddProfileTo.$or.length !== 0) {
			await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateMany(pplToAddProfileTo, {
				$push: {
					"general.completedRuns": {
						general: 0,
						endgame: 0,
						realmClearing: 0,
						server: guild.id
					}
				}
			});
		}

		// now update all profiles
		const filterQuery: FilterQuery<IRaidUser> = {
			"general.completedRuns.server": guild.id
		};
		filterQuery.$or = [];

		for (const [id] of members) {
			filterQuery.$or.push({
				discordUserId: id
			});
		}
		let propToUpdate: string;
		if (ENDGAME_DUNGEONS.includes(raidInfo.dungeonInfo.id)) {
			propToUpdate = "general.completedRuns.$.endgame";
		}
		else if (REALM_CLEARING_DUNGEONS.includes(raidInfo.dungeonInfo.id)) {
			propToUpdate = "general.completedRuns.$.realmClearing";
		}
		else {
			propToUpdate = "general.completedRuns.$.general";
		}

		await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateMany(filterQuery, {
			$inc: {
				[propToUpdate]: amount
			}
		});
	}
}