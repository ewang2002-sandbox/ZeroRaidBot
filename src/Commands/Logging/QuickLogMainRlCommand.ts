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

export class QuickLogMainRlCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Log Main Command",
                "logmain",
                ["main"],
                "Logs main contributors for a person.",
                ["logmain <@Member> [Amount]"],
                ["logmain User#0001 4", "logmain User#0001"],
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
            .setTitle("Quick Logging: Main")
            .setDescription(`You are going to log ${num} main runs for ${member}. Please select the most appropriate option.`)
            .addField("Main General Dungeon Runs", `React with 🟥 if ${member} led ${num} __general__ dungeon runs (for example, Snake Pits, Ocean Trench, Parasite Chambers, etc.).`)
            .addField(`Main Endgame Dungeon Runs`, `React with 🟪 if ${member} led ${num} __endgame__ dungeon runs (for example, Shatters, Lost Halls, O3, etc.).`)
            .addField(`Main Realm Clearing Runs`, `React with 🟧 if ${member} led ${num} __realm clearing__ runs.`)
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
            generalLeadersLog.main.completed = num;
            generalLeadersLog.main.members.push(member);
        }
        else if (selectedType.name === "🟪") {
            endgameLeadersLog.main.completed = num;
            endgameLeadersLog.main.members.push(member);
        }
        else {
            realmClearingLeadersLog.main.completed = num;
            realmClearingLeadersLog.main.members.push(member);
        }

        QuotaLoggingHandler.logRunsAndUpdateQuota(msg.guild as Guild, {
			general: generalLeadersLog,
			endgame: endgameLeadersLog,
			realmClearing: realmClearingLeadersLog
		});
    }
}