import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, Guild, GuildMember } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { DateUtil } from "../../Utility/DateUtil";
import { IQuotaDbInfo } from "../../Definitions/IQuotaDbInfo";
import { QuotaLoggingHandler } from "../../Helpers/QuotaLoggingHandler";

export class CheckQuotaCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Check Quota Command",
                "checkquota",
                ["checkq"],
                "Checks all quotas.",
                ["checkquota"],
                ["checkquota"],
                0
            ),
            new CommandPermission(
                [],
                [],
                ["support"],
                ["ALL_RL_TYPE"],
                true
            ),
            true,
            false,
            false
        );
    }

    public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
        const guild: Guild = msg.guild as Guild;

        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("**Current Quota Status**")
            .setColor("RANDOM")
            .setFooter("Completed / Failed / Assists");

        const indexOfAuthor: number = guildData.properties.quotas.quotaDetails
            .findIndex(x => x.memberId === msg.author.id);

        const descSb: StringBuilder = new StringBuilder()
            .append(`⇒ **Last Reset:** ${DateUtil.getTime(guildData.properties.quotas.lastReset)}`)
            .appendLine();
        if (indexOfAuthor !== -1) {
            const authorQuotaDetails: IQuotaDbInfo = guildData.properties.quotas.quotaDetails[indexOfAuthor];
            descSb.append(`⇒ **Last Updated:** ${indexOfAuthor === -1 ? "N/A" : DateUtil.getTime(authorQuotaDetails.lastUpdated)}`)
                .appendLine()
                .appendLine()
                .append(`⇒ **General Runs Completed:** ${authorQuotaDetails.general.completed}`)
                .appendLine()
                .append(`⇒ **General Runs Failed:** ${authorQuotaDetails.general.failed}`)
                .appendLine()
                .append(`⇒ **General Runs Assisted:** ${authorQuotaDetails.general.assists}`)
                .appendLine()
                .append(`⇒ **Endgame Runs Completed:** ${authorQuotaDetails.endgame.completed}`)
                .appendLine()
                .append(`⇒ **Endgame Runs Failed:** ${authorQuotaDetails.endgame.failed}`)
                .appendLine()
                .append(`⇒ **Endgame Runs Assisted:** ${authorQuotaDetails.endgame.assists}`)
                .appendLine()
                .append(`⇒ **Realm Clearing Runs Completed:** ${authorQuotaDetails.realmClearing.completed}`)
                .appendLine()
                .append(`⇒ **Realm Clearing Runs Failed:** ${authorQuotaDetails.realmClearing.failed}`)
                .appendLine()
                .append(`⇒ **Realm Clearing Runs Assisted:** ${authorQuotaDetails.realmClearing.assists}`);
        }
        else {
            descSb.append("⇒ **Notice:** You do not have any runs logged for this quota period.");
        }

        const quotas: IQuotaDbInfo[] = guildData.properties.quotas.quotaDetails;
        const quotaDbAndTotal: QuotaLoggingHandler.LeaderLogAndTotal[] = [];
        for (const entry of quotas) {
            quotaDbAndTotal.push({
                memberId: entry.memberId,
                endgame: entry.endgame,
                realmClearing: entry.realmClearing,
                general: entry.general,
                lastUpdated: entry.lastUpdated,
                total: entry.endgame.completed + entry.endgame.failed + entry.endgame.assists + entry.general.completed + entry.general.failed + entry.general.assists + entry.realmClearing.completed + entry.realmClearing.failed + entry.realmClearing.assists
            });
        }

        const leaderBoardQuotas: [number, QuotaLoggingHandler.LeaderLogAndTotal][] = QuotaLoggingHandler
            .generateLeaderboardArray(quotaDbAndTotal);

        let str: string = "";
        let finalAdded: boolean = false;
        for (const [place, logInfo] of leaderBoardQuotas) {
            const person: GuildMember | null = guild.member(logInfo.memberId);
            const introStr: string = person === null
                ? `${logInfo.memberId} (Not In Server)`
                : `${person} (${person.displayName})`;

            const tempStr: string = new StringBuilder()
                .append(`**\`[${place}]\`** ${introStr}`)
                .appendLine()
                .append(`⇒ **Total**: ${logInfo.total}`)
                .appendLine()
                .appendLine()
                .toString();

            if (tempStr.length + str.length > 1016) {
                embed.addField("Quota Information", str);
                str = tempStr;
                finalAdded = true;
            }
            else {
                str += tempStr;
                finalAdded = false;
            }
        }

        if (!finalAdded) {
            embed.addField("Quota Information", str);
        }
        embed.setDescription(descSb.toString());

        msg.channel.send(embed);
    }
}