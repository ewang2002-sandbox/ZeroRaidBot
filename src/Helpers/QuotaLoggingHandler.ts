import { GuildMember, Message, Guild, TextChannel, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "./MongoDbHelper";
import { FilterQuery, UpdateQuery } from "mongodb";
import { IRaidUser } from "../Templates/IRaidUser";
import { IQuotaDbInfo } from "../Definitions/IQuotaDbInfo";
import { DateUtil } from "../Utility/DateUtil";
import { StringBuilder } from "../Classes/String/StringBuilder";
import { GuildUtil } from "../Utility/GuildUtil";
import { ArrayUtil } from "../Utility/ArrayUtil";

export module QuotaLoggingHandler {
    export type LeaderLogAndTotal = IQuotaDbInfo & { total: number };

    export type LeaderLoggingArray = {
        main: {
            members: GuildMember[];
            completed: number;
            failed: number;
        };
        assists: {
            members: GuildMember[];
            assists: number;
        }
    }

    // note: leader arrays will be the same for each object
    export type LeaderLogData = {
        general: LeaderLoggingArray;
        endgame: LeaderLoggingArray;
        realmClearing: LeaderLoggingArray;
        [prop: string]: LeaderLoggingArray;
    }

    /**
     * Logs runs and updates the quota, if applicable.
     * @param {Guild} guild The guild.
     * @param {LeaderLogData} logData The logging data. 
     */
    export async function logRunsAndUpdateQuota(
        guild: Guild,
        logData: LeaderLogData
    ): Promise<void> {
        // first, let's make sure each profile has an individual guild entry for leader logging
        const filterQ: FilterQuery<IRaidUser> = {};
        filterQ.$or = [];
        for (const member of [
            ...logData.endgame.assists.members,
            ...logData.general.assists.members,
            ...logData.realmClearing.assists.members,
            ...logData.endgame.main.members,
            ...logData.general.main.members,
            ...logData.realmClearing.main.members
        ]) {
            filterQ.$or.push({
                discordUserId: member.id
            });
        }
        filterQ.$or = ArrayUtil.removeDuplicate(filterQ.$or);
        const userData: IRaidUser[] = await MongoDbHelper.MongoDbUserManager.MongoUserClient
            .find(filterQ)
            .toArray();

        const noProfileFindQuery: FilterQuery<IRaidUser> = {};
        noProfileFindQuery.$or = [];
        for (const entry of userData) {
            if (entry.general.leaderRuns.findIndex(x => x.server === guild.id) === -1) {
                noProfileFindQuery.$or.push({
                    discordUserId: entry.discordUserId
                });
            }
        }

        if (noProfileFindQuery.$or.length !== 0) {
            await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateMany(noProfileFindQuery, {
                $push: {
                    "general.leaderRuns": {
                        server: guild.id,
                        generalRuns: {
                            completed: 0,
                            failed: 0,
                            assists: 0
                        },
                        endgame: {
                            completed: 0,
                            failed: 0,
                            assists: 0
                        },
                        realmClearing: {
                            completed: 0,
                            failed: 0,
                            assists: 0
                        }
                    }
                }
            });
        }

        // next, let's update each individual profile
        for (const logInfo in logData) {
            // main
            const mainFilterQuery: FilterQuery<IRaidUser> = {
                "general.leaderRuns.server": guild.id
            };
            mainFilterQuery.$or = [];

            for (let i = 0; i < logData[logInfo].main.members.length; i++) {
                mainFilterQuery.$or.push({
                    discordUserId: logData[logInfo].main.members[i].id
                });
            }

            const mainUpdateQuery: UpdateQuery<IRaidUser> = {
                $inc: {
                    [`general.leaderRuns.$.${logInfo}.completed`]: logData[logInfo].main.completed,
                    [`general.leaderRuns.$.${logInfo}.failed`]: logData[logInfo].main.failed
                }
            }

            // assisting
            const assistFilterQuery: FilterQuery<IRaidUser> = {
                "general.leaderRuns.server": guild.id
            };
            assistFilterQuery.$or = [];

            for (let i = 0; i < logData[logInfo].assists.members.length; i++) {
                assistFilterQuery.$or.push({
                    discordUserId: logData[logInfo].assists.members[i].id
                });
            }
            const assistUpdateQuery: UpdateQuery<IRaidUser> = {
                $inc: {
                    [`general.leaderRuns.$.${logInfo}.assists`]: logData[logInfo].assists.assists
                }
            }

            // update all 
            if (mainFilterQuery.$or.length !== 0) {
                await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateMany(mainFilterQuery, mainUpdateQuery);
            }

            if (assistFilterQuery.$or.length !== 0) {
                await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateMany(assistFilterQuery, assistUpdateQuery);
            }
        }

        // ==================

        // update quotas
        const guildDb: IRaidGuild = await new MongoDbHelper.MongoDbGuildManager(guild.id)
            .findOrCreateGuildDb();

        const quotaDbEntry: IQuotaDbInfo[] = guildDb.properties.quotas.quotaDetails;

        // update quota property
        for (const logInfo in logData) {
            for (const leader of logData[logInfo].main.members) {
                let index: number = quotaDbEntry.findIndex(x => x.memberId === leader.id);
                if (index === -1) {
                    quotaDbEntry.push({
                        memberId: leader.id,
                        general: {
                            completed: 0,
                            failed: 0,
                            assists: 0
                        },
                        endgame: {
                            completed: 0,
                            failed: 0,
                            assists: 0
                        },
                        realmClearing: {
                            completed: 0,
                            failed: 0,
                            assists: 0
                        },
                        lastUpdated: 0
                    });

                    index = quotaDbEntry.length - 1;
                }

                // TODO somehow use quotaDbEntry[index][logInfo] instead of having
                // a bunch of random if-statements. 
                if (logInfo === "general") {
                    quotaDbEntry[index].general.completed += logData.general.main.completed;
                    quotaDbEntry[index].general.failed += logData.general.main.failed;
                }
                else if (logInfo === "endgame") {
                    quotaDbEntry[index].endgame.completed += logData.endgame.main.completed;
                    quotaDbEntry[index].endgame.failed += logData.endgame.main.failed;
                }
                else {
                    quotaDbEntry[index].realmClearing.completed += logData.realmClearing.main.completed;
                    quotaDbEntry[index].realmClearing.failed += logData.realmClearing.main.failed;
                }
                quotaDbEntry[index].lastUpdated = new Date().getTime();
            }

            for (const leader of logData[logInfo].assists.members) {
                let index: number = quotaDbEntry.findIndex(x => x.memberId === leader.id);
                if (index === -1) {
                    quotaDbEntry.push({
                        memberId: leader.id,
                        general: {
                            completed: 0,
                            failed: 0,
                            assists: 0
                        },
                        endgame: {
                            completed: 0,
                            failed: 0,
                            assists: 0
                        },
                        realmClearing: {
                            completed: 0,
                            failed: 0,
                            assists: 0
                        },
                        lastUpdated: 0
                    });

                    index = quotaDbEntry.length - 1;
                }

                if (logInfo === "general") {
                    quotaDbEntry[index].general.assists += logData.general.assists.assists;
                }
                else if (logInfo === "endgame") {
                    quotaDbEntry[index].endgame.assists += logData.endgame.assists.assists;
                }
                else {
                    quotaDbEntry[index].realmClearing.assists += logData.realmClearing.assists.assists;
                }
                quotaDbEntry[index].lastUpdated = new Date().getTime();
            }
        }

        await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
            $set: {
                "properties.quotas.quotaDetails": quotaDbEntry
            }
        });

        // sort 
        const quotaDbAndTotal: LeaderLogAndTotal[] = [];
        for (const entry of quotaDbEntry) {
            quotaDbAndTotal.push({
                memberId: entry.memberId,
                endgame: entry.endgame,
                realmClearing: entry.realmClearing,
                general: entry.general,
                lastUpdated: entry.lastUpdated,
                total: entry.endgame.completed + entry.endgame.failed + entry.endgame.assists + entry.general.completed + entry.general.failed + entry.general.assists + entry.realmClearing.completed + entry.realmClearing.failed + entry.realmClearing.assists
            });
        }
        // get quota channel
        const quotaChannel: TextChannel | null = guild.channels.cache.has(guildDb.generalChannels.quotaChannel)
            ? guild.channels.cache.get(guildDb.generalChannels.quotaChannel) as TextChannel
            : null;

        if (quotaChannel === null) {
            return;
        }

        const leaderboardData: [number, LeaderLogAndTotal][] = generateLeaderboardArray(quotaDbAndTotal)
            .filter(x => guild.members.cache.has(x[1].memberId));
        const sb: StringBuilder = new StringBuilder()
            .append(`⇒ **Quota Last Updated:** ${DateUtil.getTime()}`)
            .appendLine()
            .append(`⇒ **Quota Last Reset:** ${DateUtil.getTime(guildDb.properties.quotas.lastReset)}`)
            .appendLine()
            .append(`⇒ **Leaders Accounted:** ${leaderboardData.length}`)
            .appendLine()
            .append(`⇒ **Total Leaders:** ${GuildUtil.getAllLeaders(guild, guildDb).length}`);
        const quotaEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
            .setTitle("**Quota Leaderboard**")
            .setDescription(sb.toString())
            .setFooter("Completed / Failed / Assists")
            .setTimestamp()
            .setColor("RED");

        let str: string = "";
        for (const entry of leaderboardData) {
            const member: GuildMember | null = guild.member(entry[1].memberId);
            if (member === null) {
                continue;
            }

            const preparedStr: string = new StringBuilder()
                .append(`**\`[${entry[0]}]\`** ${member} (${member.displayName})`)
                .appendLine()
                .append(`⇒ TTL: ${entry[1].total}`)
                .appendLine()
                .append(`⇒ General: ${entry[1].general.completed} / ${entry[1].general.failed} / ${entry[1].general.assists}`)
                .appendLine()
                .append(`⇒ Endgame: ${entry[1].endgame.completed} / ${entry[1].endgame.failed} / ${entry[1].endgame.assists}`)
                .appendLine()
                .append(`⇒ Realm Clearing: ${entry[1].realmClearing.completed} / ${entry[1].realmClearing.failed} / ${entry[1].realmClearing.assists}`)
                .appendLine()
                .appendLine()
                .toString();

            if (preparedStr.length + str.length > 1016) {
                quotaEmbed.addField("Leaderboards", str);
                str = preparedStr;
            }
            else {
                str += preparedStr;
            }
        }

        if (str.length !== 0) {
            quotaEmbed.addField("Leaderboards", str);
        }
        
        sendOrUpdateQuotaMessage(guild, guildDb, quotaChannel, quotaEmbed);
    }

    /**
     * Sends or updates the quota message. 
     * @param guild The guild.
     * @param guildDb The guild db.
     * @param quotaChannel The quota channel. This must be defined.
     * @param quotaEmbed The quota embed.
     */
    export async function sendOrUpdateQuotaMessage(
        guild: Guild,
        guildDb: IRaidGuild,
        quotaChannel: TextChannel,
        quotaEmbed: MessageEmbed
    ): Promise<boolean> {
        let quotaMsg: Message;
        let isCreated: boolean = false;
        try {
            quotaMsg = await quotaChannel.messages.fetch(guildDb.properties.quotas.quotaMessage);
        }
        catch (e) {
            // basically means we dont have a message defined
            // so create a new one
            try {
                quotaMsg = await quotaChannel.send(quotaEmbed);
                isCreated = true;
            }
            catch (e) {
                // no permission to send message in channel
                return false;
            }
            // update message id
            await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
                $set: {
                    "properties.quotas.quotaMessage": quotaMsg.id
                }
            });
        }

        // embed was created, so we dont need to edit anymore
        if (isCreated) {
            return true;
        }

        // we need to edit the embed
        // so edit it
        await quotaMsg.edit(quotaEmbed).catch(() => { });
        return true;
    }

    /**
     * Generates a leaderboard array (a 2D array with the first element being the place and the second being the value).
     * @param data The quota data.
     */
    export function generateLeaderboardArray(data: LeaderLogAndTotal[]): [number, LeaderLogAndTotal][] {
        data.sort((x, y) => y.total - x.total);
        let place: number = 1;
        let diff: number = 0;
        let lastIndexOfData: number = 0;
        let returnData: [number, LeaderLogAndTotal][] = [];

        for (let i = 0; i < data.length; i++) {
            if (i === 0) {
                returnData.push([place, data[i]]);
                continue;
            }

            if (data[i].total === returnData[lastIndexOfData][1].total) {
                returnData.push([place, data[i]]);
                diff++;
            }
            else {
                place += diff + 1;
                diff = 0;
                returnData.push([place, data[i]]);
            }
            lastIndexOfData++;
        }

        return returnData;
    }
}