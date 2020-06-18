import { GuildMember, Message, Guild, TextChannel } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "./MongoDbHelper";
import { FilterQuery, UpdateQuery } from "mongodb";
import { IRaidUser } from "../Templates/IRaidUser";
import { IQuotaDbInfo } from "../Definitions/IQuotaDbInfo";

export module QuotaLoggingHandler { 
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
    }

    /**
     * Logs runs and updates the quota, if applicable.
     * @param {Guild} guild The guild.
     * @param {LeaderLogData} logData The logging data. It is assumed that the `members` defined in each of the properties of this variable is equal in length and content.
     */
    export async function logRunsAndUpdateQuota(
        guild: Guild,
        logData: LeaderLogData
    ): Promise<void> {
        // first, let's update each individual profile

        // main
        const mainFilterQuery: FilterQuery<IRaidUser> = {
            "general.leaderRuns.server": guild.id
        };
        mainFilterQuery.$or = [];

        for (let i = 0; i < logData.general.main.members.length; i++) {
            mainFilterQuery.$or.push({
                discordUserId: logData.general.main.members[i].id
            });
        }

        const mainUpdateQuery: UpdateQuery<IRaidUser> = {
            $inc: {
                "general.leaderRuns.$.generalRuns.completed": logData.general.main.completed,
                "general.leaderRuns.$.generalRuns.failed": logData.general.main.failed,
                "general.leaderRuns.$.endgame.completed": logData.endgame.main.completed,
                "general.leaderRuns.$.endgame.failed": logData.endgame.main.failed,
                "general.leaderRuns.$.realmClearing.completed": logData.realmClearing.main.completed,
                "general.leaderRuns.$.realmClearing.failed": logData.realmClearing.main.failed,
            }
        }

        // assisting
        const assistFilterQuery: FilterQuery<IRaidUser> = {
            "general.leaderRuns.server": guild.id
        };
        assistFilterQuery.$or = [];

        for (let i = 0; i < logData.general.assists.members.length; i++) {
            mainFilterQuery.$or.push({
                discordUserId: logData.general.assists.members[i].id
            });
        }
        const assistUpdateQuery: UpdateQuery<IRaidUser> = {
            $inc: {
                "general.leaderRuns.$.generalRuns.assists": logData.general.assists.assists,
                "general.leaderRuns.$.endgame.assists": logData.endgame.assists.assists,
                "general.leaderRuns.$.realmClearing.assists": logData.realmClearing.assists.assists
            }
        }

        // update all 
        await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateMany(mainFilterQuery, mainUpdateQuery);
        await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateMany(assistFilterQuery, assistUpdateQuery);

        // ==================
        
        // update quotas
        const guildDb: IRaidGuild = await new MongoDbHelper.MongoDbGuildManager(guild.id)
            .findOrCreateGuildDb();


        const quotaDbEntry: IQuotaDbInfo[] = [];
        

        // get quota channel
        const quotaChannel: TextChannel | null = guild.channels.cache.has(guildDb.generalChannels.quotaChannel)
            ? guild.channels.cache.get(guildDb.generalChannels.quotaChannel) as TextChannel
            : null;
        
        if (quotaChannel === null) {

        }
    }
}