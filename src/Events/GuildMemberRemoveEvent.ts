import { GuildMember, PartialGuildMember, TextChannel, MessageEmbed, Message, User } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { StringUtil } from "../Utility/StringUtil";
import { DateUtil } from "../Utility/DateUtil";
import { FilterQuery } from "mongodb";
import { ISection } from "../Templates/ISection";
import { GuildUtil } from "../Utility/GuildUtil";
import { IManualVerification } from "../Definitions/IManualVerification";
import { BotConfiguration } from "../Configuration/Config";

export async function onGuildMemberRemove(
    member: GuildMember | PartialGuildMember
): Promise<void> {
    if (BotConfiguration.exemptGuild.includes(member.guild.id)) {
        return;
    }

    const user: User = member.user as User;

    const db: IRaidGuild = await new MongoDbHelper.MongoDbGuildManager(member.guild.id).findOrCreateGuildDb();
    const joinLeaveChannel: TextChannel | undefined = member.guild.channels.cache
        .get(db.generalChannels.logging.joinLeaveChannel) as TextChannel | undefined;
    if (typeof joinLeaveChannel !== "undefined") {
        const joinEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(user.tag, user.displayAvatarURL())
            .setTitle("📤 Member Left")
            .setDescription(`${member} has left **\`${member.guild.name}\`**.`)
            .addField("Left Server", StringUtil.applyCodeBlocks(DateUtil.getTime(new Date())))
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp()
            .setColor("RED")
            .setFooter(member.guild.name);
        await joinLeaveChannel.send(joinEmbed).catch(e => { });
    }

    // TODO figure out why this isnt working
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
                    continue;
                }
                await m.delete().catch(e => { });
            }
        }
    }
}