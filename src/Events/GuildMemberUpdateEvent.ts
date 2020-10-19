import { GuildMember, Guild, PartialGuildMember } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { UserHandler } from "../Helpers/UserHandler";
import { BotConfiguration } from "../Configuration/Config";
import { MuteCommand } from "../Commands/Moderator/MuteCommand";
import { SuspendCommand } from "../Commands/Moderator/SuspendCommand";

export async function onGuildMemberUpdate(
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember | PartialGuildMember
): Promise<void> {
    if (BotConfiguration.exemptGuild.includes(oldMember.guild.id)) {
        return;
    }
    const resolvedNewMember: GuildMember = await newMember.fetch();

    const guild: Guild = oldMember.guild;
    const guildDb: IRaidGuild = await new MongoDbHelper.MongoDbGuildManager(guild.id).findOrCreateGuildDb();

    // someone took off the muted role
    if (oldMember.roles.cache.has(guildDb.roles.optRoles.mutedRole)
        && !resolvedNewMember.roles.cache.has(guildDb.roles.optRoles.mutedRole)) {
        await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
            $pull: {
                "moderation.mutedUsers": {
                    userId: resolvedNewMember.id,
                }
            }
        });

        const index: number = MuteCommand.currentTimeout.findIndex(x => x.id === resolvedNewMember.id);
        if (index !== -1) {
            clearTimeout(MuteCommand.currentTimeout[index].timeout);
            MuteCommand.currentTimeout.splice(index, 1);
        }
    }

    if (oldMember.roles.cache.has(guildDb.roles.suspended)
        && !resolvedNewMember.roles.cache.has(guildDb.roles.suspended)) {
        const indexOfSuspend: number = guildDb.moderation.suspended.findIndex(x => x.userId === resolvedNewMember.id);
        if (indexOfSuspend !== -1) {
            await resolvedNewMember.roles.set(guildDb.moderation.suspended[indexOfSuspend].roles).catch(e => { });
        }
        
        await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
            $pull: {
                "moderation.suspended": {
                    userId: resolvedNewMember.id,
                }
            }
        });

        const index: number = SuspendCommand.currentTimeout.findIndex(x => x.id === resolvedNewMember.id);
        if (index !== -1) {
            clearTimeout(SuspendCommand.currentTimeout[index].timeout);
            SuspendCommand.currentTimeout.splice(index, 1);
        }
    }

    await UserHandler.manageStaffRole(resolvedNewMember, guildDb);
}