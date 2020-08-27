import { GuildMember, Guild, PartialGuildMember } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { UserHandler } from "../Helpers/UserHandler";
import { BotConfiguration } from "../Configuration/Config";

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
    await UserHandler.manageStaffRole(resolvedNewMember, guildDb);
}