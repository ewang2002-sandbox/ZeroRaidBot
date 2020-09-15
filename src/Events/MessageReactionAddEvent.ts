import { MessageReaction, User, Message, Guild, GuildMember, TextChannel, RoleResolvable, DMChannel, VoiceChannel, PartialUser, Role, MessageEmbedFooter, MessageEmbed, Emoji, ClientUser } from "discord.js";
import { GuildUtil } from "../Utility/GuildUtil";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { ISection } from "../Templates/ISection";
import { VerificationHandler } from "../Helpers/VerificationHandler";
import { IRaidInfo } from "../Definitions/IRaidInfo";
import { RaidStatus } from "../Definitions/RaidStatus";
import { RaidHandler } from "../Helpers/RaidHandler";
import { AFKDungeon } from "../Constants/AFKDungeon";
import { IHeadCountInfo } from "../Definitions/IHeadCountInfo";
import { RaidDbHelper } from "../Helpers/RaidDbHelper";
import { StringUtil } from "../Utility/StringUtil";
import { IManualVerification } from "../Definitions/IManualVerification";
import { ModMailHandler } from "../Helpers/ModMailHandler";
import { MessageUtil } from "../Utility/MessageUtil";
import { GenericMessageCollector } from "../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../Definitions/TimeUnit";
import { UserAvailabilityHelper } from "../Helpers/UserAvailabilityHelper";
import { FastReactionMenuManager } from "../Classes/Reaction/FastReactionMenuManager";
import { Zero } from "../Zero";
import { ReactionLoggingHandler } from "../Helpers/ReactionLoggingHandler";
import { OtherUtil } from "../Utility/OtherUtil";
import { IModmailThread } from "../Definitions/IModmailThread";
import { BotConfiguration } from "../Configuration/Config";
import { IGameInfo } from "../Definitions/IGameInfo";
import { GameHandler } from "../Helpers/GameHandler";
import { GameDbHelper } from "../Helpers/GameDbHelper";

export async function onMessageReactionAdd(
	reaction: MessageReaction,
	user: User | PartialUser
): Promise<void> {
	if (user.bot || reaction.message.type !== "DEFAULT") {
		return;
	}

	// PRECHECK AND PRELOAD
	if (reaction.partial) {
		let fetchedReaction: MessageReaction | void = await reaction.fetch().catch(() => { });
		if (typeof fetchedReaction === "undefined") {
			return;
		}
		reaction = fetchedReaction;
	}

	if (reaction.message.partial) {
		let fetchedMessage: Message | void = await reaction.message.fetch().catch(() => { });
		if (typeof fetchedMessage === "undefined") {
			return;
		}
		reaction.message = fetchedMessage;
	}

	if (reaction.message.guild === null) {
		return;
	}

	if (BotConfiguration.exemptGuild.includes(reaction.message.guild.id)) {
		return;
	}

	try {
		user = await user.fetch();
	}
	catch (e) {
		return;
	}

	const guild: Guild = reaction.message.guild;

	/**
	 * the member that reacted
	 */
	let member: GuildMember;
	try {
		member = await guild.members.fetch(user.id);
	}
	catch (e) {
		console.error(e);
		return;
	}

	// END PRECHECK AND PRELOAD

	const guildDb: IRaidGuild = await (new MongoDbHelper.MongoDbGuildManager(guild.id)).findOrCreateGuildDb();
	const allSections: ISection[] = [GuildUtil.getDefaultSection(guildDb), ...guildDb.sections];

	//#region REACTION LOGGING
	if (reaction.message.author.bot) {
		ReactionLoggingHandler.reacted(guild, reaction, member, allSections, "REACT");
	}

	//#region END 

	// TODO shorten var name? :P
	// anyways, these are channels
	// that the bot will delete any reactions from
	const channelsWhereReactionsCanBeDeleted: string[] = [
		//guildDb.generalChannels.verificationChan,
		guildDb.generalChannels.modMailChannel,
		guildDb.generalChannels.controlPanelChannel,
		guildDb.generalChannels.manualVerification,
		//...guildDb.sections.map(x => x.channels.verificationChannel),
		...guildDb.sections.map(x => x.channels.controlPanelChannel),
		...guildDb.sections.map(x => x.channels.manualVerification)
	];

	// must be in a valid channel
	if (channelsWhereReactionsCanBeDeleted.includes(reaction.message.channel.id)
		// message that was reacted to was a bot's msg
		&& reaction.message.author.id === (Zero.RaidClient.user as ClientUser).id) {
		await reaction.users.remove(user.id).catch(() => { });
	}

	//#region modmail
	if (guild.channels.cache.has(guildDb.generalChannels.modMailChannel)
		&& reaction.message.channel.id === guildDb.generalChannels.modMailChannel) {
		// TODO better handling of this
		if (ModMailHandler.CurrentlyRespondingToModMail.has(member.id)) {
			return;
		}

		if (reaction.message.embeds.length === 0) {
			return;
		}
		// check if msg even has an embed
		const footer: MessageEmbedFooter | null = reaction.message.embeds[0].footer;

		// check if footer is valid 
		if (footer === null
			|| typeof footer.text === "undefined"
			|| !footer.text.endsWith("• Modmail Message")) {
			return;
		}

		if (reaction.emoji.name === "📝") {
			ModMailHandler.respondToGeneralModmail(reaction.message, member);
		}
		else if (reaction.emoji.name === "🗑️") {
			const oldEmbed: MessageEmbed = reaction.message.embeds[0];
			if (typeof oldEmbed.description !== "undefined" && oldEmbed.description.length > 20) {
				await reaction.message.reactions.removeAll().catch(() => { });
				const askDeleteEmbed: MessageEmbed = new MessageEmbed()
					.setAuthor(member.user.tag, member.user.displayAvatarURL())
					.setTitle("Confirm Delete Modmail")
					.setDescription("Are you sure you want to delete this modmail message?")
					.addField("React With ✅", "To confirm that you want to delete this modmail message.")
					.addField("React With ❌", "To cancel.")
					.setColor("RANDOM");
				await reaction.message.edit(askDeleteEmbed).catch(() => { });
				const deleteResp: Emoji | "TIME_CMD" = await new FastReactionMenuManager(
					reaction.message,
					member,
					["✅", "❌"],
					1,
					TimeUnit.MINUTE
				).react();

				if (deleteResp === "TIME_CMD" || deleteResp.name === "❌") {
					await reaction.message.edit(oldEmbed).catch(() => { });
					// respond reaction
					await reaction.message.react("📝").catch(() => { });
					// garbage reaction
					await reaction.message.react("🗑️").catch(() => { });
					// blacklist
					await reaction.message.react("🚫").catch(() => { });

					return;
				}
			}
			await reaction.message.delete().catch(() => { });
		}
		else if (reaction.emoji.name === "🚫") {
			ModMailHandler.blacklistFromModmail(reaction.message, member, guildDb);
		}
		else if (reaction.emoji.name === "🔀") {
			ModMailHandler.convertToThread(reaction.message, member);
		}
		return;
	}
	//#endregion

	//#region modmail thread
	let modmailThreadInfo: IModmailThread | undefined;
	for (let i = 0; i < guildDb.properties.modMail.length; i++) {
		if (guildDb.properties.modMail[i].channel === reaction.message.channel.id) {
			modmailThreadInfo = guildDb.properties.modMail[i];
			break;
		}
	}

	if (typeof modmailThreadInfo !== "undefined") {
		if (reaction.message.author.id === (Zero.RaidClient.user as ClientUser).id) {
			await reaction.users.remove(user.id).catch(() => { });
		}
		// base message
		if (reaction.message.id === modmailThreadInfo.baseMsg
			&& (["📝", "🛑", "🚫"].includes(reaction.emoji.name))) {
			// base msg reacted to
			// check reaction
			if (reaction.emoji.name === "📝") {
				ModMailHandler.respondToThreadModmail(modmailThreadInfo, member, guildDb, reaction.message.channel as TextChannel);
			}
			else if (reaction.emoji.name === "🛑") {
				ModMailHandler.closeModmailThread(reaction.message.channel as TextChannel, modmailThreadInfo, guildDb, member);
			}
			else {
				ModMailHandler.blacklistFromModmail(reaction.message, member, guildDb, modmailThreadInfo);
			}
		}
		else if (reaction.emoji.name === "📝" && reaction.message.author.bot) {
			ModMailHandler.respondToThreadModmail(modmailThreadInfo, member, guildDb, reaction.message.channel as TextChannel);
		}
	}
	//#endregion

	//#region manual verif
	let idOfPerson: string | undefined = reaction.message.embeds.length > 0 // has embed
		&& reaction.message.embeds[0].footer !== null // embed footer isnt null
		&& typeof reaction.message.embeds[0].footer.text !== "undefined"
		&& /^\d+$/.test(reaction.message.embeds[0].footer.text)
		? reaction.message.embeds[0].footer.text
		: undefined; // embed footer text exists
	if (typeof idOfPerson !== "undefined") {
		let manualVerificationProfile: IManualVerification | undefined;
		let sectionForManualVerif: ISection | undefined;
		for (const sec of allSections) {
			for (const manualVerifEntry of sec.properties.manualVerificationEntries) {
				if (manualVerifEntry.userId === idOfPerson) {
					manualVerificationProfile = manualVerifEntry;
					sectionForManualVerif = sec;
					break;
				}
			}
		}

		if (typeof manualVerificationProfile !== "undefined"
			&& typeof sectionForManualVerif !== "undefined"
			&& ["☑️", "❌", "🚩", "📧"].includes(reaction.emoji.name)) {
			const manualVerifMember: GuildMember | undefined = guild.members.cache
				.get(manualVerificationProfile.userId);
			const sectionVerifiedRole: Role | undefined = guild.roles.cache
				.get(sectionForManualVerif.verifiedRole);

			if (typeof manualVerifMember === "undefined" || typeof sectionVerifiedRole === "undefined") {
				VerificationHandler.sendLogAndUpdateDb(
					`⚠️**\`[${sectionForManualVerif.nameOfSection}]\`** Something went wrong when trying to perform your action for the member with ID \`${manualVerificationProfile.userId}\`. This can either be due to the person leaving the server or the verified role not existing.`,
					sectionForManualVerif,
					guild,
					manualVerificationProfile.userId
				);
				await reaction.message.delete().catch(() => { });
				return;
			}

			if (reaction.emoji.name === "🚩") {
				let userHandlingIt: GuildMember | null = null;
				try {
					if (manualVerificationProfile.currentHandler !== "") {
						userHandlingIt = await guild.members.fetch(manualVerificationProfile.currentHandler);
					}
				}
				finally {
					if (userHandlingIt !== null) {
						// member wants to unlock it
						if (userHandlingIt.id === member.id) {
							await VerificationHandler.lockOrUnlockManualRequest(
								manualVerificationProfile,
								sectionForManualVerif,
								manualVerifMember,
								reaction.message
							);
						}
						else {
							// need to ask for confirmation
							const oldEmbed: MessageEmbed = reaction.message.embeds[0];
							const confirmEmbed: MessageEmbed = new MessageEmbed()
								.setAuthor(member.displayName, member.user.displayAvatarURL())
								.setTitle("Unlock Request")
								.setDescription(`${userHandlingIt} is currently handling this manual verification request. Are you sure you want to unlock this manual verification request?`)
								.setColor("RED")
								.setFooter("Unlock Request.");

							await reaction.message.edit(confirmEmbed).catch(e => { });
							await reaction.message.reactions.removeAll().catch(e => { });

							const result: Emoji | "TIME_CMD" = await new FastReactionMenuManager(
								reaction.message,
								member,
								["✅", "🚫"],
								1,
								TimeUnit.MINUTE
							).react();

							if (typeof result === "object" && result.name === "✅") {
								await reaction.message.edit(oldEmbed).catch(e => { });
								await OtherUtil.waitFor(500);
								await VerificationHandler.lockOrUnlockManualRequest(
									manualVerificationProfile,
									sectionForManualVerif,
									manualVerifMember,
									reaction.message
								);
							}
							else {
								await reaction.message.edit(oldEmbed).catch(e => { });
							}

							await reaction.message.react("☑️").catch(() => { });
							await reaction.message.react("❌").catch(() => { });
							await reaction.message.react("🚩").catch(() => { });
							await reaction.message.react("📧").catch(() => { });
						}
					}
					else {
						// lock it.
						await VerificationHandler.lockOrUnlockManualRequest(
							manualVerificationProfile,
							sectionForManualVerif,
							manualVerifMember,
							reaction.message,
							member
						);
					}
				}
			}
			else {
				if (manualVerificationProfile.currentHandler !== ""
					&& manualVerificationProfile.currentHandler !== member.id) {
					let userHandlingIt: GuildMember | null = null;
					try {
						userHandlingIt = await guild.members.fetch(manualVerificationProfile.currentHandler);
					}
					finally {
						if (userHandlingIt !== null && userHandlingIt.id !== member.id) {
							const oldEmbed: MessageEmbed = reaction.message.embeds[0];

							const confirmEmbed: MessageEmbed = new MessageEmbed()
								.setAuthor(member.displayName, member.user.displayAvatarURL())
								.setTitle("Manual Verification Request Locked")
								.setDescription(`${userHandlingIt} is currently handling this manual verification request. Please ask ${userHandlingIt} first before doing anything.\n\nTo unlock this request, react with 🚩.`)
								.setColor("RED")
								.setFooter("Manual Verification Request Locked.");
							await reaction.message.edit(confirmEmbed).catch(e => { });
							await OtherUtil.waitFor(10000);
							await reaction.message.edit(oldEmbed).catch(e => { });
							return;
						}
					}
				}
				if (reaction.emoji.name === "☑️") {
					VerificationHandler.acceptManualVerification(manualVerifMember, member, sectionForManualVerif, manualVerificationProfile, guildDb);
					await reaction.message.delete().catch(() => { });
				}
				else if (reaction.emoji.name === "❌") {
					VerificationHandler.denyManualVerification(manualVerifMember, member, sectionForManualVerif, manualVerificationProfile);
					await reaction.message.delete().catch(() => { });
				}
				else if (reaction.emoji.name === "📧") {
					ModMailHandler.startThreadedModmailWithMember(manualVerifMember, member, guildDb);
				}
			}
			return;
		}
	}
	//#endregion

	//#region VERIFICATION
	let sectionForVerification: ISection | undefined;
	for (const section of allSections) {
		if (section.channels.verificationChannel === reaction.message.channel.id) {
			sectionForVerification = section;
			break;
		}
	}

	if (typeof sectionForVerification !== "undefined"
		&& ["✅", "❌"].includes(reaction.emoji.name)
		&& reaction.message.embeds.length > 0
		&& reaction.message.embeds[0].footer !== null
		&& typeof reaction.message.embeds[0].footer.text !== "undefined"
		&& ["Server Verification", "Section Verification"].includes(reaction.message.embeds[0].footer.text)) {
		// channel declaration
		// yes, we know these can be textchannels b/c that's the input in configsections
		let verificationSuccessChannel: TextChannel | undefined = guild.channels.cache
			.get(sectionForVerification.channels.logging.verificationSuccessChannel) as TextChannel | undefined;

		if (reaction.emoji.name === "✅") {
			VerificationHandler.verifyUser(member, guild, guildDb, sectionForVerification, "REACT");
			return;
		}
		else {
			if (!member.roles.cache.has(sectionForVerification.verifiedRole)) {
				return;
			}
			await member.roles.remove(sectionForVerification.verifiedRole).catch(() => { });
			// doesn't matter if we can send msg to the user
			await member.send(`**\`[${guild.name}]\`**: You have successfully been unverified from the **\`${sectionForVerification.nameOfSection}\`** section!`).catch(e => { });
			if (typeof verificationSuccessChannel !== "undefined") {
				verificationSuccessChannel.send(`📤 **\`[${sectionForVerification.nameOfSection}]\`** ${member} has been unverified from the section.`).catch(() => { });
			}
		}
	}
	//#endregion

	//#region control panel
	let sectionFromControlPanel: ISection | undefined;
	for (const section of allSections) {
		if (section.channels.controlPanelChannel === reaction.message.channel.id) {
			sectionFromControlPanel = section;
			break;
		}
	}

	const leaderRoles: RoleResolvable[] = [
		guildDb.roles.universalAlmostRaidLeader,
		guildDb.roles.universalRaidLeader,
		guildDb.roles.headRaidLeader
	];

	const allStaffRoles: RoleResolvable[] = [
		guildDb.roles.headRaidLeader,
		guildDb.roles.moderator,
		guildDb.roles.officer,
		guildDb.roles.support,
		guildDb.roles.teamRole,
		guildDb.roles.universalAlmostRaidLeader,
		guildDb.roles.universalRaidLeader,
		guildDb.roles.verifier
	];

	if (typeof sectionFromControlPanel !== "undefined"  // from control panel
		&& reaction.message.embeds.length > 0 // has embed
		&& reaction.message.embeds[0].footer !== null // embed footer isnt null
		&& typeof reaction.message.embeds[0].footer.text !== "undefined" // embed footer text exists
		&& reaction.message.embeds[0].footer.text.startsWith("Control Panel • ")) { // embed footer has control panel
		leaderRoles.push(...GuildUtil.getSectionRaidLeaderRoles(sectionFromControlPanel));
		allStaffRoles.push(...GuildUtil.getSectionRaidLeaderRoles(sectionFromControlPanel));

		// let's check headcounts first
		if (reaction.message.embeds[0].footer.text === "Control Panel • Headcount Ended"
			&& reaction.emoji.name === "🗑️"
			&& (member.roles.cache.some(x => leaderRoles.includes(x.id)) || member.hasPermission("ADMINISTRATOR"))) {
			await reaction.message.delete().catch(() => { });
			return;
		}

		if (reaction.message.embeds[0].footer.text.includes("Control Panel • Headcount")
			&& (member.roles.cache.some(x => leaderRoles.includes(x.id)) || member.hasPermission("ADMINISTRATOR"))) {
			// remember that there can only be one headcount per section
			const headCountData: IHeadCountInfo | undefined = guildDb.activeRaidsAndHeadcounts.headcounts
				.find(x => x.section.channels.controlPanelChannel === reaction.message.channel.id);

			if (typeof headCountData === "undefined") {
				return;
			}

			if (reaction.message.embeds[0].footer.text.endsWith("Pending")
				&& reaction.emoji.name === "❌") {
				RaidHandler.endHeadcount(guild, guildDb, AFKDungeon, member, headCountData);
			}
		}

		// let's check afk checks
		const raidFromReaction: IRaidInfo | undefined = guildDb.activeRaidsAndHeadcounts.raidChannels
			.find(x => x.controlPanelMsgId === reaction.message.id);

		const gameFromReaction: IGameInfo | undefined = guildDb.activeRaidsAndHeadcounts.gameChannels
			.find(x => x.controlPanelMsgId === reaction.message.id);

		if (member.voice.channel === null) {
			return;
		}

		if (typeof gameFromReaction !== "undefined") {
			if (member.voice.channel.id === gameFromReaction.vcId) {
				if (reaction.message.embeds[0].footer.text.includes("Control Panel • Game AFK Check")
					&& gameFromReaction.status === RaidStatus.AFKCheck) {
					if (member.roles.cache.some(x => allStaffRoles.includes(x.id))
						|| member.hasPermission("ADMINISTRATOR")) {
						// end afk
						if (reaction.emoji.name === "⏹️") {
							GameHandler.endAfkCheck(guildDb, guild, gameFromReaction, member.voice.channel, member);
						}
						// abort afk
						else if (reaction.emoji.name === "🗑️") {
							GameHandler.abortAfk(guild, gameFromReaction, member.voice.channel);
						}
						// set message
						else if (reaction.emoji.name === "✏️") {
							await setNewLocationPrompt(guild, guildDb, gameFromReaction, member);
						}
					}
				}
				else if (reaction.message.embeds[0].footer.text.includes("Control Panel • In Game")
					&& gameFromReaction.status === RaidStatus.InRun) {
					if (member.roles.cache.some(x => allStaffRoles.includes(x.id))
						|| member.hasPermission("ADMINISTRATOR")) {
						// end run
						if (reaction.emoji.name === "⏹️") {
							GameHandler.endGamingSession(member, guild, gameFromReaction);
						}
						// set loc
						else if (reaction.emoji.name === "✏️") {
							await setNewLocationPrompt(guild, guildDb, gameFromReaction, member);
						}
						// lock vc
						else if (reaction.emoji.name === "🔒") {
							await member.voice.channel.updateOverwrite(guild.roles.everyone, {
								CONNECT: false
							});
						}
						// unlock vc
						else if (reaction.emoji.name === "🔓") {
							await member.voice.channel.updateOverwrite(guild.roles.everyone, {
								CONNECT: null
							});
						}
					}
				}
			}
		}
		else if (typeof raidFromReaction !== "undefined") {
			// has to be in same vc
			if (member.voice.channel.id === raidFromReaction.vcID) {
				// afk check
				if (reaction.message.embeds[0].footer.text.includes("Control Panel • AFK Check")
					&& raidFromReaction.status === RaidStatus.AFKCheck) {
					if (member.roles.cache.some(x => leaderRoles.includes(x.id))
						|| member.hasPermission("ADMINISTRATOR")) {
						// end afk
						if (reaction.emoji.name === "⏹️") {
							RaidHandler.endAfkCheck(guildDb, guild, raidFromReaction, member.voice.channel, member);
						}
						// abort afk
						else if (reaction.emoji.name === "🗑️") {
							RaidHandler.abortAfk(guild, raidFromReaction, member.voice.channel);
						}
						// set loc
						else if (reaction.emoji.name === "✏️") {
							await setNewLocationPrompt(guild, guildDb, raidFromReaction, member);
						}
					}

					if (member.roles.cache.has(guildDb.roles.teamRole) || member.hasPermission("ADMINISTRATOR")) {
						// get loc
						if (reaction.emoji.name === "🗺️") {
							const locEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(guild)
								.setTitle("Early Location")
								.setDescription(`The location of the raid (information below) is: ${StringUtil.applyCodeBlocks(raidFromReaction.location)}`)
								.addField("Location Rules", "- Do not give this location out to anyone else.\n- Pay attention to any directions your raid leader may have.")
								.addField("Raid Information", `Guild: ${guild.name}\nRaid Section: ${raidFromReaction.section.nameOfSection}\nRaid VC: ${member.voice.channel.name}\nDungeon: ${raidFromReaction.dungeonInfo.dungeonName}`);
							await user.send(locEmbed).catch(() => { });
						}
					}
				}
				// in raid
				else if (reaction.message.embeds[0].footer.text.includes("Control Panel • In Raid")
					&& raidFromReaction.status === RaidStatus.InRun) {
					if (member.roles.cache.some(x => leaderRoles.includes(x.id))
						|| member.hasPermission("ADMINISTRATOR")) {
						// end run
						if (reaction.emoji.name === "⏹️") {
							RaidHandler.endRun(member, guild, raidFromReaction);
						}
						// set loc
						else if (reaction.emoji.name === "✏️") {
							await setNewLocationPrompt(guild, guildDb, raidFromReaction, member);
						}
						// lock vc
						else if (reaction.emoji.name === "🔒") {
							await member.voice.channel.updateOverwrite(guild.roles.everyone, {
								CONNECT: false
							});
						}
						// unlock vc
						else if (reaction.emoji.name === "🔓") {
							await member.voice.channel.updateOverwrite(guild.roles.everyone, {
								CONNECT: null
							});
						}
					}

					if (member.roles.cache.has(guildDb.roles.teamRole) || member.hasPermission("ADMINISTRATOR")) {
						// get loc
						if (reaction.emoji.name === "🗺️") {
							const locEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(guild)
								.setTitle("Early Location")
								.setDescription(`The location of the raid (information below) is: ${StringUtil.applyCodeBlocks(raidFromReaction.location)}`)
								.addField("Location Rules", "- Do not give this location out to anyone else.\n- Pay attention to any directions your raid leader may have.")
								.addField("Raid Information", `Guild: ${guild.name}\nRaid Section: ${raidFromReaction.section.nameOfSection}\nRaid VC: ${member.voice.channel.name}\nDungeon: ${raidFromReaction.dungeonInfo.dungeonName}`);
							await user.send(locEmbed).catch(() => { });
						}
					}
				}
			} // end major if
		}
	}

	//#endregion
}

export async function setNewLocationPrompt(
	guild: Guild,
	guildDb: IRaidGuild,
	info: IRaidInfo | IGameInfo,
	memberRequested: GuildMember
): Promise<IRaidGuild> {
	let dmChannel: DMChannel;
	try {
		dmChannel = await memberRequested.createDM();
	}
	catch (e) {
		// no permission to send msg prob
		return guildDb;
	}

	UserAvailabilityHelper.InMenuCollection.set(memberRequested.id, UserAvailabilityHelper.MenuType.KEY_ASK);

	const isRaid: boolean = "location" in info;
	const vcNameToDisplay: string = "location" in info 
		? info.vcName
		: `${info.gameInfo.gameName} ${info.vcNum}`;

	const resolvedMsg: string | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<string>(
		memberRequested,
		{ content: `**\`[${guild.name} ⇒ ${info.section.nameOfSection} ⇒ ${vcNameToDisplay}\`** Please type the __new__ ${isRaid ? "location" : "message"} for this ${isRaid ? "raid" : "gaming session"}. ${isRaid ? "This location will be sent to people that have reacted with either the key or Nitro Booster emoji." : "This message will be sent to all members in this voice channel."} To cancel this process, type \`cancel\`.` },
		1,
		TimeUnit.MINUTE,
		dmChannel
	).send(GenericMessageCollector.getStringPrompt(dmChannel));

	// delay
	setTimeout(() => {
		UserAvailabilityHelper.InMenuCollection.delete(memberRequested.id);
	}, 2 * 1000);

	if (resolvedMsg === "CANCEL_CMD" || resolvedMsg === "TIME_CMD") {
		return guildDb;
	}

	if ("location" in info) {
		const curRaidDataArrElem: RaidHandler.IStoredRaidData | undefined = RaidHandler.CURRENT_RAID_DATA.get(info.vcID);
		if (typeof curRaidDataArrElem === "undefined") {
			let hasMessaged: string[] = [];
			for await (const person of info.earlyReacts) {
				let memberToMsg: GuildMember | null;
				try {
					memberToMsg = await guild.members.fetch(person);
				}
				catch (e) {
					memberToMsg = null;
				}
	
				if (memberToMsg === null) {
					continue;
				}
				await memberToMsg.send(`**\`[${guild.name} ⇒ ${info.section.nameOfSection}]\`** A __new__ location for this raid has been set by a leader. The location is: ${StringUtil.applyCodeBlocks(resolvedMsg)}Do not tell anyone this location.`).catch(() => { });
				hasMessaged.push(person);
			}
	
			for await (const entry of info.keyReacts) {
				if (hasMessaged.includes(entry.userId)) {
					continue;
				}
				let memberToMsg: GuildMember | null;
				try {
					memberToMsg = await guild.members.fetch(entry.userId);
				}
				catch (e) {
					memberToMsg = null;
				}
				if (memberToMsg === null) {
					continue;
				}
				await memberToMsg.send(`**\`[${guild.name} ⇒ ${info.section.nameOfSection}]\`** A __new__ location for this raid has been set by a leader. The location is: ${StringUtil.applyCodeBlocks(resolvedMsg)}Do not tell anyone this location.`).catch(() => { });
				hasMessaged.push(entry.userId);
			}
		}
		else {
			let hasMessaged: string[] = [];
			for await (const person of curRaidDataArrElem.earlyReacts) {
				await person.send(`**\`[${guild.name} ⇒ ${info.section.nameOfSection}]\`** A __new__ location for this raid has been set by a leader. The location is: ${StringUtil.applyCodeBlocks(resolvedMsg)}Do not tell anyone this location.`).catch(() => { });
				hasMessaged.push(person.id);
			}
	
			for await (const [, members] of curRaidDataArrElem.keyReacts) {
				for (const member of members) {
					if (hasMessaged.includes(member.id)) {
						continue;
					}
					await member.send(`**\`[${guild.name} ⇒ ${info.section.nameOfSection}]\`** A __new__ location for this raid has been set by a leader. The location is: ${StringUtil.applyCodeBlocks(resolvedMsg)}Do not tell anyone this location.`).catch(() => { });
					hasMessaged.push(member.id);
				}
			}
		}

		return await RaidDbHelper.editLocation(guild, (memberRequested.voice.channel as VoiceChannel).id, resolvedMsg);
	}
	else {
		const curGameDataArrElem: GameHandler.IStoredRaidData | undefined = GameHandler.CURRENT_RAID_DATA.get(info.vcId);
		let vc: VoiceChannel | undefined = guild.channels.cache.get(info.vcId) as VoiceChannel | undefined;
		if (info.status === RaidStatus.InRun && typeof vc !== "undefined") {
			for await (const [id, member] of vc.members) {
				await member.send(`**\`[${guild.name} ⇒ ${info.section.nameOfSection}]\`** A __new__ message for this gaming session has been set by a leader. The message is: ${StringUtil.applyCodeBlocks(resolvedMsg)}`).catch(() => { });
			}
		}

		return await GameDbHelper.editMessage(guild, (memberRequested.voice.channel as VoiceChannel).id, resolvedMsg);
	}
}