import { Emoji, Guild, GuildMember, Message, MessageEmbed } from "discord.js";
import { FastReactionMenuManager } from "../../Classes/Reaction/FastReactionMenuManager";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { QuotaLoggingHandler } from "../../Helpers/QuotaLoggingHandler";
import { UserHandler } from "../../Helpers/UserHandler";
import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { IRaidUser } from "../../Templates/IRaidUser";
import { MessageUtil } from "../../Utility/MessageUtil";

export class QuickLogFailCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Log Fail Command",
                "logfail",
                ["fail"],
                "Logs main contributors of a failing raid for a person.",
                ["logfail <@Member> [Amount]"],
                ["logfail User#0001 4", "logmain User#0001"],
                1
            ),
            new CommandPermission(
                [],
                [],
                ["universalAlmostRaidLeader"],
                ["ALL_RLS"],
                true
            ),
            true,
            false,
            false,
            5
        );
    }

    public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
        const member: GuildMember | null = await UserHandler.resolveMember(msg, guildData);
        if (member === null) {
            MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_MEMBER_FOUND", null), msg.channel);
            return;
        }

        args.shift();

        let num: number = Number.parseInt(args[0]);
        if (Number.isNaN(num)) {
            num = 1;
        }

        const dbEntry: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.MongoUserClient.findOne({
            discordUserId: member.id
        });

        if (dbEntry === null) {
            MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_DB_ENTRY_FOUND", null), msg.channel);
            return;
        }

        const logTypeEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("Quick Logging: Failed")
            .setDescription(`You are going to log ${num} failed runs for ${member}. Please select the most appropriate option.`)
            .addField("Failed General Dungeon Runs", `React with 🟥 if ${member} failed ${num} __general__ dungeon runs (for example, Snake Pits, Ocean Trench, Parasite Chambers, etc.).`)
            .addField(`Failed Endgame Dungeon Runs`, `React with 🟪 if ${member} failed with ${num} __endgame__ dungeon runs (for example, Shatters, Lost Halls, O3, etc.).`)
            .addField(`Failed Realm Clearing Runs`, `React with 🟧 if ${member} failed with ${num} __realm clearing__ runs.`)
            .addField("Cancel", "React with ❌ to cancel this process. Nothing will be saved.")
            .setFooter("Logging Type.");

        const botMsg = await msg.channel.send(logTypeEmbed);
        const selectedType: Emoji | "TIME_CMD" = await new FastReactionMenuManager(
            botMsg,
            msg.author,
            ["🟥", "🟪", "🟧", "❌"],
            5,
            TimeUnit.MINUTE
        ).react();

        await botMsg.delete().catch(() => { });
        if (selectedType === "TIME_CMD" || selectedType.name === "❌") {
            return;
        }

        // maybe find a way to optimize this? :) 
		let realmClearingLeadersLog: QuotaLoggingHandler.LeaderLoggingArray = {
			main: {
				members: [],
				completed: 0,
				failed: 0
			},
			assists: {
				members: [],
				assists: 0
			}
		};
		let endgameLeadersLog: QuotaLoggingHandler.LeaderLoggingArray = {
			main: {
				members: [],
				completed: 0,
				failed: 0
			},
			assists: {
				members: [],
				assists: 0
			}
		};
		let generalLeadersLog: QuotaLoggingHandler.LeaderLoggingArray = {
			main: {
				members: [],
				completed: 0,
				failed: 0
			},
			assists: {
				members: [],
				assists: 0
			}
		};

        
        if (selectedType.name === "🟥") {
            generalLeadersLog.main.failed = num;
            generalLeadersLog.main.members.push(member);
        }
        else if (selectedType.name === "🟪") {
            endgameLeadersLog.main.failed = num;
            endgameLeadersLog.main.members.push(member);
        }
        else {
            realmClearingLeadersLog.main.failed = num;
            realmClearingLeadersLog.main.members.push(member);
        }

        QuotaLoggingHandler.logRunsAndUpdateQuota(msg.guild as Guild, {
			general: generalLeadersLog,
			endgame: endgameLeadersLog,
			realmClearing: realmClearingLeadersLog
		});
    }
}