import { MessageReaction, User, Message, Guild, GuildMember, TextChannel, RoleResolvable, MessageCollector, DMChannel, VoiceChannel, Collection, PartialUser, Role } from "discord.js";
import { GuildUtil } from "../Utility/GuildUtil";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { ISection } from "../Definitions/ISection";
import { VerificationHandler } from "../Helpers/VerificationHandler";
import { IRaidInfo } from "../Definitions/IRaidInfo";
import { RaidStatus } from "../Definitions/RaidStatus";
import { RaidHandler } from "../Helpers/RaidHandler";
import { AFKDungeon } from "../Constants/AFKDungeon";
import { IHeadCountInfo } from "../Definitions/IHeadCountInfo";
import { RaidDbHelper } from "../Helpers/RaidDbHelper";
import { StringUtil } from "../Utility/StringUtil";
import { IManualVerification } from "../Definitions/IManualVerification";

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
    const member: GuildMember | null = guild.member(user.id);
    if (member === null) {
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

    let idOfPerson: string | undefined = reaction.message.embeds.length > 0 // has embed
        && reaction.message.embeds[0].footer !== null // embed footer isnt null
        && typeof reaction.message.embeds[0].footer.text !== "undefined"
        && /^\d+$/.test(reaction.message.embeds[0].footer.text)
        ? reaction.message.embeds[0].footer.text
        : undefined; // embed footer text exists
    if (typeof idOfPerson !== "undefined") {
        //#region MANUAL VERIFICATION
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
                .get(sectionForManualVerif.roles.verifiedRole);

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
            if (!member.roles.cache.has(sectionForVerification.roles.verifiedRole)) {
                return;
            }
            await member.roles.remove(sectionForVerification.roles.verifiedRole).catch(() => { });
            await member.send(`**\`[${guild.name}]\`**: You have successfully been unverified from the **\`${sectionForVerification.nameOfSection}\`** section!`);
            if (typeof verificationSuccessChannel !== "undefined") {
                verificationSuccessChannel.send(`📤 **\`[${sectionForVerification.nameOfSection}]\`** ${member} has been unverified from the section.`).catch(() => { });
            }
        }
    }

    //#endregion

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

    let staffRoles: RoleResolvable[] = [
        guildDb.roles.support,
        guildDb.roles.officer,
        guildDb.roles.moderator
    ];

    if (typeof sectionFromControlPanel !== "undefined"  // from control panel
        && reaction.message.embeds.length > 0 // has embed
        && reaction.message.embeds[0].footer !== null // embed footer isnt null
        && typeof reaction.message.embeds[0].footer.text !== "undefined" // embed footer text exists
        && reaction.message.embeds[0].footer.text.startsWith("Control Panel • ")) { // embed footer has control panel
        leaderRoles.push(...GuildUtil.getSectionRaidLeaderRoles(sectionFromControlPanel));

        // let's check headcounts first
        if (reaction.message.embeds[0].footer.text === "Control Panel • Headcount Ended"
            && reaction.emoji.name === "🗑️") {
            await reaction.message.delete().catch(() => { });
            return;
        }

        if (reaction.message.embeds[0].footer.text.includes("Control Panel • Headcount")) {
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

                if (member.roles.cache.some(x => leaderRoles.includes(x.id))) {
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

                if (member.roles.cache.some(x => [...staffRoles, ...leaderRoles].includes(x.id))) {
                    // get loc
                    if (reaction.emoji.name === "🗺️") {
                        user.send(`**\`[${guild.name} ⇒ ${sectionFromControlPanel.nameOfSection} ⇒ Raiding ${raidFromReaction.raidNum}]\`** The location of this raid is: \`${raidFromReaction.location}\``);
                    }
                }
            }
            // in raid
            else if (reaction.message.embeds[0].footer.text.includes("Control Panel • In Raid")
                && raidFromReaction.status === RaidStatus.InRun) {
                if (member.roles.cache.some(x => leaderRoles.includes(x.id))) {
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

                if (member.roles.cache.some(x => [...staffRoles, ...leaderRoles].includes(x.id))) {
                    // get loc
                    if (reaction.emoji.name === "🗺️") {
                        user.send(`**\`[${guild.name} ⇒ ${sectionFromControlPanel.nameOfSection} ⇒ Raiding ${raidFromReaction.raidNum}]\`** The location of this raid is: \`${raidFromReaction.location}\``);
                    }
                }
            }
        } // end major if
    }
}

export async function setNewLocationPrompt(
    guild: Guild,
    guildDb: IRaidGuild,
    raidInfo: IRaidInfo,
    memberRequested: GuildMember
): Promise<IRaidGuild> {
    return new Promise(async (resolve) => {
        let dmChannel: DMChannel;
        try {
            dmChannel = await memberRequested.createDM();
        }
        catch (e) {
            resolve(guildDb); // no permission to send msg prob
            return;
        }

        const promptMsg: Message = await dmChannel.send(`**\`[${guild.name} ⇒ ${raidInfo.section.nameOfSection} ⇒ Raiding ${raidInfo.raidNum}]\`** Please type the __new__ location for this raid. This location will be sent to people that have reacted with either the key or Nitro Booster emoji. To cancel this process, type \`cancel\`.`);
        const hcCollector: MessageCollector = new MessageCollector(dmChannel, m => m.author.id === memberRequested.id, {
            time: 30 * 1000 // 30 sec
        });

        hcCollector.on("collect", async (m: Message) => {
            hcCollector.stop();
            if (m.content.toLowerCase() === "cancel") {
                return resolve(guildDb);
            }
            // send location out to ppl
            const curRaidDataArrElem = RaidHandler.CURRENT_RAID_DATA.get(raidInfo.vcID);
            if (typeof curRaidDataArrElem === "undefined") {
                let hasMessaged: string[] = [];
                for await (const person of raidInfo.earlyReacts) {
                    const memberToMsg: GuildMember | null = guild.member(person);
                    if (memberToMsg === null) {
                        continue;
                    }
                    await memberToMsg.send(`**\`[${guild.name} ⇒ ${raidInfo.section.nameOfSection}]\`** A __new__ location for this raid has been set by a leader. The location is: ${StringUtil.applyCodeBlocks(m.content)}Do not tell anyone this location.`).catch(() => { });
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
                    await memberToMsg.send(`**\`[${guild.name} ⇒ ${raidInfo.section.nameOfSection}]\`** A __new__ location for this raid has been set by a leader. The location is: ${StringUtil.applyCodeBlocks(m.content)}Do not tell anyone this location.`).catch(() => { });
                    hasMessaged.push(entry.userId);
                }
            }
            else {
                let hasMessaged: string[] = [];
                for await (const person of curRaidDataArrElem.earlyReacts) {
                    await person.send(`**\`[${guild.name} ⇒ ${raidInfo.section.nameOfSection}]\`** A __new__ location for this raid has been set by a leader. The location is: ${StringUtil.applyCodeBlocks(m.content)}Do not tell anyone this location.`).catch(() => { });
                    hasMessaged.push(person.id);
                }

                for await (const [, members] of curRaidDataArrElem.keyReacts) {
                    for (const member of members) {
                        if (hasMessaged.includes(member.id)) {
                            continue;
                        }
                        await member.send(`**\`[${guild.name} ⇒ ${raidInfo.section.nameOfSection}]\`** A __new__ location for this raid has been set by a leader. The location is: ${StringUtil.applyCodeBlocks(m.content)}Do not tell anyone this location.`).catch(() => { });
                        hasMessaged.push(member.id);
                    }
                }
            }

            return resolve(await RaidDbHelper.editLocation(guild, (memberRequested.voice.channel as VoiceChannel).id, m.content));
        });

        hcCollector.on("end", (collected: Collection<string, Message>, reason: string) => {
            promptMsg.delete().catch(() => { });
            if (reason === "time") {
                return resolve(guildDb);
            }
        });
    });
}