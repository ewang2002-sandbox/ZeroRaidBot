import { GuildMember, PartialGuildMember, TextChannel, MessageEmbed, Message } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { StringUtil } from "../Utility/StringUtil";
import { DateUtil } from "../Utility/DateUtil";
import { FilterQuery } from "mongodb";
import { ISection } from "../Definitions/ISection";
import { GuildUtil } from "../Utility/GuildUtil";
import { IManualVerification } from "../Definitions/IManualVerification";

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

    // check and see if they were under manual verif
    const allSections: ISection[] = [GuildUtil.getDefaultSection(db), ...db.sections];
    for (const section of allSections) {
        const manualVerifEntry: IManualVerification | undefined = section.properties.manualVerificationEntries
            .find(x => x.userId === member.id);
        if (typeof manualVerifEntry === "undefined") {
            continue;
        }
        if (manualVerifEntry.userId === member.id) {
            const filterQuery: FilterQuery<IRaidGuild> = section.isMain
                ? { guildID: member.guild.id }
                : {
                    guildID: member.guild.id,
                    "sections.channels.manualVerification": section.channels.manualVerification
                };

            const updateKey: string = section.isMain
                ? "properties.manualVerificationEntries"
                : "sections.$.properties.manualVerificationEntries";


            await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne(filterQuery, {
                $pull: {
                    [updateKey]: {
                        userId: member.id
                    }
                }
            });
            const manualVerifyChannel: TextChannel | undefined = member.guild.channels.cache
                .get(manualVerifEntry.manualVerificationChannel) as TextChannel | undefined;
            if (typeof manualVerifyChannel !== "undefined") {
                let m: Message;
                try {
                    m = await manualVerifyChannel.messages.fetch(manualVerifEntry.msgId);
                }
                catch (e) {
                    return;
                }
                await m.delete().catch(e => { });
            }
        }
    }
}