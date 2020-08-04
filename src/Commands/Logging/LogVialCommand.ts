import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, Guild, GuildMember, MessageEmbed, Emoji } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { IRaidUser } from "../../Templates/IRaidUser";
import { UserHandler } from "../../Helpers/UserHandler";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { FastReactionMenuManager } from "../../Classes/Reaction/FastReactionMenuManager";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { IVoidVials } from "../../Definitions/UserDBProps";

export class LogVialCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Log Vials Command",
                "logvials",
                ["logvial", "vial", "vials"],
                "Logs vials used or stored by other people.",
                ["logvials <@Mention | ID | IGN> [Amount: NUMBER]"],
                ["logvials User#0001 4"],
                1
            ),
            new CommandPermission(
                [],
                [],
                ["headRaidLeader", "universalRaidLeader", "universalAlmostRaidLeader"],
                ["ALL_RLS"],
                false
            ),
            true,
            false,
            false
        );
    }

    public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
        const guild: Guild = msg.guild as Guild;
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

        let logType: "STORE" | "POP";
        const logTypeEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("Select Logging Type")
            .setDescription(`You are going to log ${num} vials for ${member}. Did this person use the vial(s) or did he/she pop it?`)
            .addField(`Stored Vial(s)`, `React with 📥 if ${member} __stored__ ${num} vials for future use (in this server).`)
            .addField(`Used Vial(s)`, `React with 📤 if ${member} __used__ ${num} vials for a server raid.`)
            .addField("Cancel", "React with ❌ to cancel this process. Nothing will be saved.")
            .setFooter("Logging Type.");

        const botMsg = await msg.channel.send(logTypeEmbed);
        const selectedType: Emoji | "TIME_CMD" = await new FastReactionMenuManager(
            botMsg,
            msg.author,
            ["📥", "📤", "❌"],
            5,
            TimeUnit.MINUTE
        ).react();

        if (selectedType === "TIME_CMD" || selectedType.name === "❌") {
            await botMsg.delete().catch(() => { });
            return;
        }

        if (selectedType.name === "📥") {
            logType = "STORE";
        }
        else {
            logType = "POP";
        }

        // CONSTANTS FOR EASY LOGGING
        let vialUSED: number = logType === "POP"
            ? num
            : 0;
        let vialSTORED: number = logType === "STORE"
            ? num
            : 0;

        const indexOfLogs: number = dbEntry.general.voidVials.findIndex(x => x.server === guild.id);
        if (indexOfLogs === -1) {
            await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne({ discordUserId: member.id }, {
                $push: {
                    "general.voidVials": {
                        popped: vialUSED,
                        stored: vialSTORED,
                        server: guild.id
                    }
                }
            });
        }
        else {
            const vialData: IVoidVials = dbEntry.general.voidVials[indexOfLogs];
            vialSTORED = vialData.stored - vialSTORED >= 0
                ? vialData.stored - vialSTORED
                : 0
            vialUSED += vialData.popped;

            await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne({
                discordUserId: member.id,
                "general.voidVials.server": guild.id
            }, {
                $set: {
                    "general.voidVials.$.popped": vialUSED,
                    "general.voidVials.$.stored": vialSTORED
                }
            });
        }

        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("Keys Logged!")
            .setDescription(logType === "POP" ? `${member} has popped ${num} Vial(s) for us.` : `${num} Vial(s) has been stored for ${member}.`)
            .setColor("GREEN")
            .setFooter("Logged Keys")
            .setTimestamp();
        await botMsg.edit(embed).catch(() => { });
        await botMsg.delete({ timeout: 5000 }).catch(() => { });
    }
}