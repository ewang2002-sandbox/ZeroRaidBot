import { GuildMember, Role, PartialGuildMember, TextChannel, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { IMutedData, ISuspendedData } from "../Definitions/IPunishmentObject";
import { MuteCommand } from "../Commands/Moderator/MuteCommand";
import { StringUtil } from "../Utility/StringUtil";
import { DateUtil } from "../Utility/DateUtil";
import { BotConfiguration } from "../Configuration/Config";

export async function onGuildMemberAdd(
    member: GuildMember | PartialGuildMember
): Promise<void> {
    if (BotConfiguration.exemptGuild.includes(member.guild.id)) {
        return;
    }
    
    const guildMember: GuildMember = await member.fetch();

    const db: IRaidGuild = await new MongoDbHelper.MongoDbGuildManager(guildMember.guild.id).findOrCreateGuildDb();
    const joinLeaveChannel: TextChannel | undefined = guildMember.guild.channels.cache
        .get(db.generalChannels.logging.joinLeaveChannel) as TextChannel | undefined;
    if (typeof joinLeaveChannel !== "undefined") {
        const joinEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(guildMember.user.tag, guildMember.user.displayAvatarURL())
            .setTitle("📥 New Member Joined")
            .setDescription(`${member} has joined **\`${member.guild.name}\`**.`)
            .addField("Joined Server", StringUtil.applyCodeBlocks(DateUtil.getTime(new Date())))
            .addField("Registered Account", StringUtil.applyCodeBlocks(DateUtil.getTime(guildMember.user.createdAt)))
            .addField("User ID", StringUtil.applyCodeBlocks(member.id))
            .setThumbnail(guildMember.user.displayAvatarURL())
            .setTimestamp()
            .setColor("GREEN")
            .setFooter(member.guild.name);
        await joinLeaveChannel.send(joinEmbed).catch(e => { });
    }

    // check if muted
    const mutedRole: Role | undefined = guildMember.guild.roles.cache.get(db.roles.optRoles.mutedRole) as Role | undefined;

    let muteData: IMutedData | undefined;

    for (const muteEntry of db.moderation.mutedUsers) {
        if (muteEntry.userId === guildMember.id) {
            muteData = muteEntry;
            break;
        }
    }

    if (typeof muteData !== "undefined" && typeof mutedRole !== "undefined") {
        // they left while muted
        await guildMember.roles.add(mutedRole).catch(e => { });
        // because they left the server to avoid their mute
        // they will be muted for another full duration
        if (muteData.duration !== -1) {
            await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({
                guildID: guildMember.guild.id,
                "moderation.mutedUsers.userId": guildMember.id
            }, {
                $set: {
                    "moderation.mutedUsers.$.endsAt": (new Date().getTime() + muteData.duration)
                }
            });
            MuteCommand.timeMute(guildMember.guild, guildMember, muteData.duration);
        }
    }


    // check if suspended
    const suspendedRole: Role | undefined = guildMember.guild.roles.cache.get(db.roles.suspended) as Role | undefined;

    let suspendedData: ISuspendedData | undefined;

    for (const suspendedEntry of db.moderation.suspended) {
        if (suspendedEntry.userId === guildMember.id) {
            suspendedData = suspendedEntry;
            break;
        }
    }

    if (typeof suspendedData !== "undefined" && typeof suspendedRole !== "undefined") {
        // they left while muted
        await guildMember.roles.add(suspendedRole).catch(e => { });
        // because they left the server to avoid their suspension
        // they will be suspended for another full duration
        if (suspendedData.duration !== -1) {
            await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({
                guildID: guildMember.guild.id,
                "moderation.suspended.userId": guildMember.id
            }, {
                $set: {
                    "moderation.suspended.$.endsAt": (new Date().getTime() + suspendedData.duration)
                }
            });
            MuteCommand.timeMute(guildMember.guild, guildMember, suspendedData.duration);
        }
    }
}