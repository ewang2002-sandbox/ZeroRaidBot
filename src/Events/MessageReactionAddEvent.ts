import { MessageReaction, User, Message, Guild, GuildMember, TextChannel, RoleResolvable, MessageCollector, DMChannel, VoiceChannel, Collection, PartialUser, Role, MessageEmbedFooter, MessageEmbed, Emoji } from "discord.js";
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

export async function onMessageReactionAdd(
	reaction: MessageReaction,
	user: User | PartialUser
): Promise<void> {
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

	if (user.bot) {
		return;
	}

	const guild: Guild = reaction.message.guild;
	const guildDb: IRaidGuild = await (new MongoDbHelper.MongoDbGuildManager(guild.id)).findOrCreateGuildDb();
	const allSections: ISection[] = [GuildUtil.getDefaultSection(guildDb), ...guildDb.sections];

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

	if (reaction.message.type !== "DEFAULT") {
		return;
	}

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

	if (channelsWhereReactionsCanBeDeleted.includes(reaction.message.channel.id)) {
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
			ModMailHandler.respondToModmail(reaction.message, member);
		}
		else if (reaction.emoji.name === "🗑️") {
			const oldEmbed: MessageEmbed = reaction.message.embeds[0];
			if (typeof oldEmbed.description !== "undefined" && oldEmbed.description.length > 20) {
				await reaction.message.reactions.removeAll().catch(e => { });
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
					await reaction.message.edit(oldEmbed).catch(e => { });
					// respond reaction
					await reaction.message.react("📝").catch(() => { });
					// garbage reaction
					await reaction.message.react("🗑️").catch(() => { });
					// blacklist
					await reaction.message.react("🚫").catch(() => { });

					return;
				}
			}
			await reaction.message.delete().catch(e => { });
		}
		else if (reaction.emoji.name === "🚫") {
			ModMailHandler.blacklistFromModmail(reaction.message, member, guildDb);
		}
		return;
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
			&& ["☑️", "❌"].includes(reaction.emoji.name)) {
			const manualVerifMember: GuildMember | undefined = guild.members.cache
				.get(manualVerificationProfile.userId);
			const sectionVerifiedRole: Role | undefined = guild.roles.cache
				.get(sectionForManualVerif.verifiedRole);

			if (typeof manualVerifMember === "undefined" || typeof sectionVerifiedRole === "undefined") {
				return; // GuildMemberRemove should auto take care of this
			}

			await reaction.message.delete().catch(() => { });
			if (reaction.emoji.name === "☑️") {
				VerificationHandler.acceptManualVerification(manualVerifMember, member, sectionForManualVerif, manualVerificationProfile, guildDb);
			}
			else {
				VerificationHandler.denyManualVerification(manualVerifMember, member, sectionForManualVerif, manualVerificationProfile);
			}
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
			VerificationHandler.verifyUser(member, guild, guildDb, sectionForVerification);
			return;
		}
		else {
			if (!member.roles.cache.has(sectionForVerification.verifiedRole)) {
				return;
			}
			await member.roles.remove(sectionForVerification.verifiedRole).catch(() => { });
			await member.send(`**\`[${guild.name}]\`**: You have successfully been unverified from the **\`${sectionForVerification.nameOfSection}\`** section!`);
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

	if (typeof sectionFromControlPanel !== "undefined"  // from control panel
		&& reaction.message.embeds.length > 0 // has embed
		&& reaction.message.embeds[0].footer !== null // embed footer isnt null
		&& typeof reaction.message.embeds[0].footer.text !== "undefined" // embed footer text exists
		&& reaction.message.embeds[0].footer.text.startsWith("Control Panel • ")) { // embed footer has control panel
		leaderRoles.push(...GuildUtil.getSectionRaidLeaderRoles(sectionFromControlPanel));

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

		if (typeof raidFromReaction === "undefined") {
			return;
		}

		// has to be in same vc
		if (member.voice.channel !== null && member.voice.channel.id === raidFromReaction.vcID) {
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
						await user.send(locEmbed).catch(e => { });
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
						await user.send(locEmbed).catch(e => { });
					}
				}
			}
		} // end major if
	}

	//#endregion
}

export async function setNewLocationPrompt(
	guild: Guild,
	guildDb: IRaidGuild,
	raidInfo: IRaidInfo,
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

	const collector: string | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<string>(
		memberRequested,
		{ content: `**\`[${guild.name} ⇒ ${raidInfo.section.nameOfSection} ⇒ ${raidInfo.vcName}\`** Please type the __new__ location for this raid. This location will be sent to people that have reacted with either the key or Nitro Booster emoji. To cancel this process, type \`cancel\`.` },
		1,
		TimeUnit.MINUTE,
		dmChannel
	).send(GenericMessageCollector.getStringPrompt(dmChannel));

	// delay
	setTimeout(() => {
		UserAvailabilityHelper.InMenuCollection.delete(memberRequested.id);
	}, 2 * 1000);

	if (collector === "CANCEL_CMD" || collector === "TIME_CMD") {
		return guildDb;
	}

	const curRaidDataArrElem = RaidHandler.CURRENT_RAID_DATA.get(raidInfo.vcID);
	if (typeof curRaidDataArrElem === "undefined") {
		let hasMessaged: string[] = [];
		for await (const person of raidInfo.earlyReacts) {
			const memberToMsg: GuildMember | null = guild.member(person);
			if (memberToMsg === null) {
				continue;
			}
			await memberToMsg.send(`**\`[${guild.name} ⇒ ${raidInfo.section.nameOfSection}]\`** A __new__ location for this raid has been set by a leader. The location is: ${StringUtil.applyCodeBlocks(collector)}Do not tell anyone this location.`).catch(() => { });
			hasMessaged.push(person);
		}

		for await (const entry of raidInfo.keyReacts) {
			if (hasMessaged.includes(entry.userId)) {
				continue;
			}
			const memberToMsg: GuildMember | null = guild.member(entry.userId);
			if (memberToMsg === null) {
				continue;
			}
			await memberToMsg.send(`**\`[${guild.name} ⇒ ${raidInfo.section.nameOfSection}]\`** A __new__ location for this raid has been set by a leader. The location is: ${StringUtil.applyCodeBlocks(collector)}Do not tell anyone this location.`).catch(() => { });
			hasMessaged.push(entry.userId);
		}
	}
	else {
		let hasMessaged: string[] = [];
		for await (const person of curRaidDataArrElem.earlyReacts) {
			await person.send(`**\`[${guild.name} ⇒ ${raidInfo.section.nameOfSection}]\`** A __new__ location for this raid has been set by a leader. The location is: ${StringUtil.applyCodeBlocks(collector)}Do not tell anyone this location.`).catch(() => { });
			hasMessaged.push(person.id);
		}

		for await (const [, members] of curRaidDataArrElem.keyReacts) {
			for (const member of members) {
				if (hasMessaged.includes(member.id)) {
					continue;
				}
				await member.send(`**\`[${guild.name} ⇒ ${raidInfo.section.nameOfSection}]\`** A __new__ location for this raid has been set by a leader. The location is: ${StringUtil.applyCodeBlocks(collector)}Do not tell anyone this location.`).catch(() => { });
				hasMessaged.push(member.id);
			}
		}
	}

	return await RaidDbHelper.editLocation(guild, (memberRequested.voice.channel as VoiceChannel).id, collector);
}