import { GuildMember, PartialGuildMember, TextChannel, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { StringUtil } from "../Utility/StringUtil";
import { DateUtil } from "../Utility/DateUtil";

export async function onGuildMemberRemove(
    member: GuildMember | PartialGuildMember
): Promise<void> {
    // TODO will this work/
    member = await member.fetch();

    const db: IRaidGuild = await new MongoDbHelper.MongoDbGuildManager(member.guild.id).findOrCreateGuildDb();
    const joinLeaveChannel: TextChannel | undefined = member.guild.channels.cache
        .get(db.generalChannels.logging.joinLeaveChannel) as TextChannel | undefined;
    if (typeof joinLeaveChannel !== "undefined") {
        const joinEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(member.user.tag, member.user.displayAvatarURL())
            .setTitle("📥 New Member Joined")
            .setDescription(`${member} has joined **\`${member.guild.name}\`**.`)
            .addField("Joined Server", StringUtil.applyCodeBlocks(DateUtil.getTime(new Date())))
            .addField("Registered Account", StringUtil.applyCodeBlocks(DateUtil.getTime(member.user.createdAt)))
            .addField("User ID", StringUtil.applyCodeBlocks(member.id))
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp()
            .setColor("RANDOM")
            .setFooter(member.guild.name);
        await joinLeaveChannel.send(joinEmbed).catch(e => { });
    }
}