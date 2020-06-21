import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, GuildEmoji, ReactionEmoji, Guild, TextChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { FastReactionMenuManager } from "../../Classes/Reaction/FastReactionMenuManager";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { DateUtil } from "../../Utility/DateUtil";
import { GuildUtil } from "../../Utility/GuildUtil";
import { QuotaLoggingHandler } from "../../Helpers/QuotaLoggingHandler";

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
                ["headRaidLeader"],
                [],
                true
            ),
            true,
            false,
            false
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

        const result: GuildEmoji | ReactionEmoji | "TIME" = await new FastReactionMenuManager(
            botMsg,
            msg.author,
            ["✅", "❌"],
            1,
            TimeUnit.MINUTE
        ).react();

        await botMsg.delete().catch(() => { });
        if (result === "TIME") {
            return;
        }

        if (result.name === "✅") {
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
                .append(`⇒ **Total Leaders:** ${GuildUtil.getNumberOfLeaders(guild, guildData)}`);
            const quotaEmbed: MessageEmbed = new MessageEmbed()
                .setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
                .setTitle("**Quota Leaderboard**")
                .setDescription(sb.toString())
                .setFooter("Completed / Failed / Assists")
                .setTimestamp()
                .setColor("RED");

            const quotaChannel: TextChannel | null = guild.channels.cache.has(guildData.generalChannels.quotaChannel)
                ? guild.channels.cache.get(guildData.generalChannels.quotaChannel) as TextChannel
                : null;

            if (quotaChannel === null) {
                return;
            }

            QuotaLoggingHandler.sendOrUpdateQuotaMessage(guild, guildData, quotaChannel, quotaEmbed);
        }
    }
}