import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, Guild, GuildMember } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { DateUtil } from "../../Utility/DateUtil";
import { IQuotaDbInfo } from "../../Definitions/IQuotaDbInfo";
import { QuotaLoggingHandler } from "../../Helpers/QuotaLoggingHandler";
import { UserHandler } from "../../Helpers/UserHandler";

export class CheckQuotaCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Check Quota Command",
                "checkquota",
                ["checkq", "checkquotas"],
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

        const personToCheck: GuildMember | null = await UserHandler.resolveMember(
            msg,
            guildData
        );

        const resolvedPerson: GuildMember = personToCheck === null
            ? guild.member(msg.author.id) as GuildMember 
            : personToCheck;

        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(resolvedPerson.user.tag, resolvedPerson.user.displayAvatarURL())
            .setTitle(`**Current Quota Status**: ${resolvedPerson.displayName}`)
            .setColor("RANDOM")
            .setFooter("Completed / Failed / Assists");

        const indexOfAuthor: number = guildData.properties.quotas.quotaDetails
            .findIndex(x => x.memberId === resolvedPerson.id);

        const descSb: StringBuilder = new StringBuilder()
            .append(`⇒ **Last Reset:** ${DateUtil.getTime(guildData.properties.quotas.lastReset)}`)
            .appendLine();
        if (indexOfAuthor !== -1) {
            const authorQuotaDetails: IQuotaDbInfo = guildData.properties.quotas.quotaDetails[indexOfAuthor];
            descSb.append(`⇒ **Last Updated:** ${indexOfAuthor === -1 ? "N/A" : DateUtil.getTime(authorQuotaDetails.lastUpdated)}`)
                .appendLine()
                .appendLine()
                .append(`⇒ **General:** ${authorQuotaDetails.general.completed} / ${authorQuotaDetails.general.failed} / ${authorQuotaDetails.general.assists}`)
                .appendLine()
                .append(`⇒ **Endgame Runs Completed:** ${authorQuotaDetails.endgame.completed} / ${authorQuotaDetails.endgame.failed} / ${authorQuotaDetails.endgame.assists}`)
                .appendLine()
                .append(`⇒ **Realm Clearing Runs Completed:** ${authorQuotaDetails.realmClearing.completed} / ${authorQuotaDetails.realmClearing.failed} / ${authorQuotaDetails.realmClearing.assists}`);
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
                : `${person} (${person.displayName}) ${person.id === resolvedPerson.id ? "⭐" : ""}`;

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