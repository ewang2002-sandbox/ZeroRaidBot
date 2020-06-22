import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildMember, Guild, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { GuildUtil } from "../../Utility/GuildUtil";
import { StringUtil } from "../../Utility/StringUtil";

export class NoLoggedRunsCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Leaders With No Runs Logged Checker",
                "nologgedruns",
                [],
                "Checks to see who hasn't done any runs (i.e. who hasn't logged any runs yet).",
                ["nologgedruns"],
                ["nologgedruns"],
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
        const leadersWithNoRuns: GuildMember[] = [];
        const allLeaders: GuildMember[] = GuildUtil.getAllLeaders(guild, guildData);
        for (const leader of allLeaders) {
            const index: number = guildData.properties.quotas.quotaDetails
                .findIndex(x => x.memberId === leader.id);
            if (index === -1) {
                leadersWithNoRuns.push(leader);
            }
        }

        const all: number = allLeaders.length;
        const noRuns: number = leadersWithNoRuns.length;
        const percent: number = (((all - noRuns) / all) * 100);

        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("Leaders With No Runs Logged")
            .setDescription(`⇒ Total Leaders: ${allLeaders.length}\n⇒ Leaders With No Runs: ${leadersWithNoRuns.length}`)
            .setColor(leadersWithNoRuns.length === 0 ? "GREEN" : "RED")
            .setFooter(`Responsible Leaders: ${all - noRuns}/${all} (${percent.toFixed(5)}%)`);

        const fields: string[] = StringUtil.arrayToStringFields<GuildMember>(
            leadersWithNoRuns, 
            (i, elem) => `${elem} (\`${elem.displayName}\`)\n`,
            1012
        );

        for (const field of fields) {
            embed.addField("Leaders With No Logged Runs", field);
        }

        const m: Message = await msg.channel.send(embed);
        if (leadersWithNoRuns.length === 0) {
            await m.delete({ timeout: 5000 }).catch(e => { });
        }
    }
}