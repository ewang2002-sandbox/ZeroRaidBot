import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, GuildEmoji, ReactionEmoji, Guild, TextChannel, GuildMember, ColorResolvable } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { FastReactionMenuManager } from "../../Classes/Reaction/FastReactionMenuManager";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { DateUtil } from "../../Utility/DateUtil";
import { GuildUtil } from "../../Utility/GuildUtil";
import { QuotaLoggingHandler } from "../../Helpers/QuotaLoggingHandler";
import { NoLoggedRunsCommand } from "./NoLoggedRunsCommand";
import { ArrayUtil } from "../../Utility/ArrayUtil";
import { MessageUtil } from "../../Utility/MessageUtil";

export class ResetQuotaCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Reset Quotas Command",
                "resetquota",
                ["resetq", "resetquotas"],
                "Resets the quota board.",
                ["resetquota"],
                ["resetquota"],
                0
            ),
            new CommandPermission(
                [],
                [],
                ["officer"],
                [],
                true
            ),
            true,
            false,
            false,
            0
        );
    }

    public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
        const guild: Guild = msg.guild as Guild;
        const confirmEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("Confirmation")
            .setDescription("Are you sure you want to reset quotas?")
            .setColor("RED")
            .setFooter("Quota Management");

        let botMsg: Message;

        try {
            botMsg = await msg.channel.send(confirmEmbed);
        }
        catch (e) {
            return;
        }

        const result: GuildEmoji | ReactionEmoji | "TIME_CMD" = await new FastReactionMenuManager(
            botMsg,
            msg.author,
            ["✅", "❌"],
            1,
            TimeUnit.MINUTE
        ).react();

        await botMsg.delete().catch(() => { });
        if (result === "TIME_CMD") {
            return;
        }

        if (result.name === "✅") {
            const quotaChannel: TextChannel | null = guild.channels.cache.has(guildData.generalChannels.quotaChannel)
                ? guild.channels.cache.get(guildData.generalChannels.quotaChannel) as TextChannel
                : null;

            if (quotaChannel === null) {
                return;
            }

            if (guildData.properties.quotas.quotaMessage) {
                let oldQuotaMsg: Message | null = null;
                try {
                    oldQuotaMsg = await quotaChannel.messages.fetch(guildData.properties.quotas.quotaMessage).catch();
                }
                catch (e) {}

                if (oldQuotaMsg) {
                    // Unlink message so it doesn't get edited
                    guildData = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
                        $set: {
                            "properties.quotas.quotaMessage": ""
                        }
                    }, { returnOriginal: false })).value as IRaidGuild;

                    const allStaffMembers = GuildUtil.getAllStaffMembers(guild, guildData);
                    const weekOfDate = new Date(guildData.properties.quotas.lastReset).toLocaleDateString("en-US");
                    const todayDate = new Date().toLocaleDateString("en-US");

                    const desc = new StringBuilder()
                        .append(`From the time period of ${weekOfDate} up to ${todayDate}, there were **${allStaffMembers.length}** staff members.`)
                        .appendLine().appendLine()
                        .append("__**Legends**__").appendLine()
                        .append("- C = Completed").appendLine()
                        .append("- A = Assisted").appendLine()
                        .append("- F = Failed").appendLine()
                        .append("- Ordered: Endgame / General / Realm Clearing / Sum");
                    const summaryEmbed = MessageUtil.generateBlankEmbed(guild, "RANDOM")
                        .setTitle("Quota Summary")
                        .setDescription(desc.toString())
                        .setFooter(`Summary for the time period of ${weekOfDate} up to ${todayDate}.`);

                    let membersWithOnlyAssists = 0;
                    let membersWithNoRuns = 0;
                    const fields = ArrayUtil.arrayToStringFields<GuildMember>(
                        allStaffMembers,
                        (i, elem) => {
                            const details = guildData.properties.quotas.quotaDetails.find(x => x.memberId === elem.id);
                            if (!details) {
                                membersWithNoRuns++;
                                return `\`[❌]\` ${elem} (\`${elem.displayName}\`): No Runs Logged\n`;
                            }

                            const totalComplete = details.endgame.completed + details.general.completed + details.realmClearing.completed;
                            const totalAssist = details.endgame.assists + details.general.assists + details.realmClearing.assists;
                            const totalFails = details.endgame.failed + details.general.failed + details.realmClearing.failed;

                            if (totalComplete <= 0 && totalFails <= 0 && totalAssist <= 0) {
                                membersWithNoRuns++;
                                return `\`[❌]\` ${elem} (\`${elem.displayName}\`): No Runs Logged\n`;
                            }

                            if (totalComplete <= 0 && totalFails <= 0 && totalAssist > 0) {
                                membersWithOnlyAssists++;
                                return new StringBuilder()
                                    .append(`\`[⚠️]\` ${elem} (\`${elem.displayName}\`)`).append(": ")
                                    .append("Only Assists Logged")
                                    .appendLine()
                                    .append("```").appendLine()
                                    .append(`⇒ A: ${details.endgame.assists} / ${details.general.assists} / ${details.realmClearing.assists} / Σ = ${totalAssist}`)
                                    .append("```")
                                    .appendLine()
                                    .toString();
                            }

                            return new StringBuilder()
                                .append(`\`[📋]\` ${elem} (\`${elem.displayName}\`)`).appendLine()
                                .append("```").appendLine()
                                .append(`⇒ C: ${details.endgame.completed} / ${details.general.completed} / ${details.realmClearing.completed} / Σ = ${totalComplete}`)
                                .appendLine()
                                .append(`⇒ A: ${details.endgame.assists} / ${details.general.assists} / ${details.realmClearing.assists} / Σ = ${totalAssist}`)
                                .appendLine()
                                .append(`⇒ F: ${details.endgame.failed} / ${details.general.failed} / ${details.realmClearing.failed} / Σ = ${totalFails}`)
                                .append("```")
                                .appendLine()
                                .toString();
                        }
                    );

                    while (fields.length > 0 && summaryEmbed.length <= 5980) {
                        const field = fields.shift();
                        summaryEmbed.addField("Summary", field);
                    }

                    await oldQuotaMsg.edit(summaryEmbed).catch();

                    if (fields.length > 0) {
                        // Take care of leftover fields
                        const otherEmbed: MessageEmbed[] = [];
                        const linkToOldMessage = `https://discord.com/channels/${guild.id}/${msg.channel.id}/${oldQuotaMsg.id}`;
                        while (true) {
                            const embed = MessageUtil.generateBlankEmbed(guild, oldQuotaMsg.embeds[0].color as ColorResolvable)
                                .setTitle("Quota Summary (Continued)")
                                .setDescription(`Continued from [this summary message](${linkToOldMessage}).`)
                                .setFooter(`Summary for the time period of ${weekOfDate} up to ${todayDate}.`);
                            while (fields.length > 0 && embed.length <= 5980) {
                                const field = fields.shift();
                                embed.addField("Summary", field);
                            }

                            otherEmbed.push(embed);
                            if (fields.length <= 0) break;
                        }

                        // send the remaining embeds
                        for await (const e of otherEmbed) {
                            await quotaChannel.send(e).catch();
                        }
                    }
                }
            }

            await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
                $set: {
                    "properties.quotas.quotaDetails": [],
                    "properties.quotas.lastReset": new Date().getTime()
                }
            });

            const sb: StringBuilder = new StringBuilder()
                .append(`⇒ **Quota Last Updated:** ${DateUtil.getTime()}`)
                .appendLine()
                .append(`⇒ **Quota Last Reset:** ${DateUtil.getTime()}`)
                .appendLine()
                .append(`⇒ **Leaders Accounted:** 0`)
                .appendLine()
                .append(`⇒ **Total Leaders:** ${GuildUtil.getAllLeaders(guild, guildData).length}`);
            const quotaEmbed: MessageEmbed = new MessageEmbed()
                .setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
                .setTitle("**Quota Leaderboard**")
                .setDescription(sb.toString())
                .setFooter("Completed / Failed / Assists")
                .setTimestamp()
                .setColor("RED");


            QuotaLoggingHandler.sendOrUpdateQuotaMessage(guild, guildData, quotaChannel, quotaEmbed);
        }
    }
}