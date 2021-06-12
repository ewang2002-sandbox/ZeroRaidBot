import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildMember, Guild, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { GuildUtil } from "../../Utility/GuildUtil";
import { ArrayUtil } from "../../Utility/ArrayUtil";

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

    public static getStaffWithNoRuns(guild: Guild, guildData: IRaidGuild): [GuildMember, number][] {
        const staffWithNoRuns: [GuildMember, number][] = [];
        const allStaff: GuildMember[] = GuildUtil.getAllStaffMembers(guild, guildData);
        for (const staff of allStaff) {
            const index: number = guildData.properties.quotas.quotaDetails
                .findIndex(x => x.memberId === staff.id);
            if (index === -1) {
                staffWithNoRuns.push([staff, 0]);
                continue;
            }

            let assistSum = guildData.properties.quotas.quotaDetails[index].endgame.assists
                + guildData.properties.quotas.quotaDetails[index].general.assists
                + guildData.properties.quotas.quotaDetails[index].realmClearing.assists;

            if (guildData.properties.quotas.quotaDetails[index].endgame.completed === 0
                && guildData.properties.quotas.quotaDetails[index].endgame.failed === 0
                && guildData.properties.quotas.quotaDetails[index].general.completed === 0
                && guildData.properties.quotas.quotaDetails[index].general.failed === 0 
                && guildData.properties.quotas.quotaDetails[index].realmClearing.completed === 0
                && guildData.properties.quotas.quotaDetails[index].realmClearing.failed === 0
                && guildData.properties.quotas.quotaDetails[index].endgame.assists
                && assistSum > 0) {
                    staffWithNoRuns.push([staff, assistSum]);
                }
        }

        return staffWithNoRuns;
    }

    public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
        const guild: Guild = msg.guild as Guild;
        const staffWithNoRuns = NoLoggedRunsCommand.getStaffWithNoRuns(guild, guildData);
        const allStaff = GuildUtil.getAllStaffMembers(guild, guildData);

        const all: number = allStaff.length;
        const noRuns: number = staffWithNoRuns.length;
        const percent: number = (((all - noRuns) / all) * 100);

        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("Staff Members With No Runs Logged")
            .setDescription(`⇒ Total Staff Members: ${allStaff.length}\n⇒ Staff Members With No Runs: ${staffWithNoRuns.length}`)
            .setColor(staffWithNoRuns.length === 0 ? "GREEN" : "RED")
            .setFooter(`Responsible Staff Members: ${all - noRuns}/${all} (${percent.toFixed(5)}%)`);

        const fields: string[] = ArrayUtil.arrayToStringFields<[GuildMember, number]>(
            staffWithNoRuns, 
            (i, elem) => `${elem[0]} \`${elem[0].displayName}\` (${elem[1]})\n`,
            1012
        );

        for (const field of fields) {
            embed.addField("Staff Members With No Logged Runs", field);
        }

        const m: Message = await msg.channel.send(embed);
        if (staffWithNoRuns.length === 0) {
            await m.delete({ timeout: 5000 }).catch(e => { });
        }
    }
}