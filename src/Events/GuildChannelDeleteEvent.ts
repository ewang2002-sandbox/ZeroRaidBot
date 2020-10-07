import { Channel, PartialDMChannel, DMChannel, GuildChannel, Guild, VoiceChannel, GuildMember } from "discord.js";
import { GuildUtil } from "../Utility/GuildUtil";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { RaidStatus } from "../Definitions/RaidStatus";
import { RaidHandler } from "../Helpers/RaidHandler";
import { BotConfiguration } from "../Configuration/Config";

export async function onChannelDelete(channel: Channel | PartialDMChannel): Promise<void> {    
    // we only care if it's a guild channel
    if (channel instanceof DMChannel || !(channel instanceof GuildChannel)) {
        return;
    }

    const guild: Guild = channel.guild;

    if (BotConfiguration.exemptGuild.includes(guild.id)) {
        return;
    }

    const guildDb: IRaidGuild = await new MongoDbHelper.MongoDbGuildManager(guild.id)
        .findOrCreateGuildDb();

    if (channel.type === "voice") {
        // check & see if any raid vcs were deleted
        for (const raidInfo of guildDb.activeRaidsAndHeadcounts.raidChannels) {
            if (raidInfo.vcID === channel.id) {
                // found vc that was deleted
                if (raidInfo.status === RaidStatus.AFKCheck) {
                    await RaidHandler.abortAfk(guild, raidInfo, channel.id);
                }
                else {
                    let personThatCreatedVc: GuildMember;
                    try {
                        personThatCreatedVc = await guild.members.fetch(raidInfo.startedBy);
                    }
                    catch (e) {
                        personThatCreatedVc = guild.me as GuildMember;
                    }

                    await RaidHandler.endRun(personThatCreatedVc, guild, raidInfo, true);
                }
            }
        }
    }
}