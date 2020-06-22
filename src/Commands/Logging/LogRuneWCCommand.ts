import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, EmojiResolvable, Guild, GuildMember, MessageEmbed, Emoji } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { IGeneralProperties, IRaidUser } from "../../Templates/IRaidUser";
import { UserHandler } from "../../Helpers/UserHandler";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { FastReactionMenuManager } from "../../Classes/Reaction/FastReactionMenuManager";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { IWineCellarOryx } from "../../Definitions/UserDBProps";

type KeyLogType = {
    emoji: EmojiResolvable;
    propType: "WC_SHIELD" | "WC_INC" | "WC_SWORD" | "WC_HELM";
    formalName: string;
}

export class LogRuneWCCommand extends Command {
    private readonly _keyData: KeyLogType[] = [
        {
            emoji: "⚔️",
            propType: "WC_SWORD",
            formalName: "Sword Rune(s)"
        },
        {
            emoji: "⛑️",
            propType: "WC_HELM",
            formalName: "Helm Rune(s)"
        },
        {
            emoji: "🛡️",
            propType: "WC_SHIELD",
            formalName: "Shield Rune(s)"
        },
        {
            emoji: "🏅",
            propType: "WC_INC",
            formalName: "Wine Cellar Incantation(s)"
        }
    ];

    public constructor() {
        super(
            new CommandDetail(
                "Log Rune/WC Command",
                "logrunes",
                ["logwc"],
                "Logs runes or WC used or stored by other people.",
                ["logrunes <@Mention | ID | IGN> [Amount: NUMBER]"],
                ["logrunes User#0001 4"],
                1
            ),
            new CommandPermission(
                [],
                [],
                ["headRaidLeader", "universalRaidLeader", "universalAlmostRaidLeader"],
                ["ALL_RL_TYPE"],
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

        // get key type
        const keyTypeEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("Select Key Type")
            .setDescription(`Logging For: ${member}\n\nPlease select what special key you will be logging.`)
            .addField("Log Sword Rune(s)", `React with ⚔️ to either log **${num}** used Sword Runes or **${num}** stored Sword Runes for ${member}.`)
            .addField("Log Helm Rune(s)", `React with ⛑️ to either log **${num}** used Helm Runes or **${num}** stored Helm Runes for ${member}.`)
            .addField("Log Shield Rune(s)", `React with 🛡️ to either log **${num}** used Shield Rune(s) or **${num}** stored Shield Rune(s) for ${member}.`)
            .addField("Log Wine Cellar Incantation(s)", `React with 🏅 to either log **${num}** used Wine Cellar Incantation(s) or **${num}** stored Wine Cellar Incantation(s) for ${member}.`)
            .addField("Cancel", "React with ❌ to cancel this process. Nothing will be saved.")
            .setFooter("Logging Keys.");

        const botMsg: Message = await msg.channel.send(keyTypeEmbed);
        const selectedKey: Emoji | "TIME_CMD" = await new FastReactionMenuManager(
            botMsg,
            msg.author,
            [...this._keyData.map(x => x.emoji), "❌"],
            5,
            TimeUnit.MINUTE
        ).react();

        if (selectedKey === "TIME_CMD" || selectedKey.name === "❌") {
            await botMsg.delete().catch(e => { });
            return;
        }

        const keyToUse: KeyLogType | undefined = this._keyData.find(x => x.emoji === selectedKey.name);
        // this won't hit but might as well
        if (typeof keyToUse === "undefined") {
            return;
        }

        let logType: "STORE" | "POP";
        const logTypeEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("Select Logging Type")
            .setDescription(`You are going to log ${num} ${keyToUse.formalName.toLowerCase()} for ${member}. Did this person use the ${keyToUse.formalName.toLowerCase()} or did he/she pop it?`)
            .addField(`Stored ${keyToUse.formalName}`, `React with 📥 if ${member} __stored__ ${num} ${keyToUse.formalName.toLowerCase()} for future use (in this server).`)
            .addField(`Used ${keyToUse.formalName}`, `React with 📤 if ${member} __used__ ${num} ${keyToUse.formalName.toLowerCase()} for a server raid.`)
            .addField("Cancel", "React with ❌ to cancel this process. Nothing will be saved.")
            .setFooter("Logging Type.");

        await botMsg.edit(logTypeEmbed).catch(e => { });
        const selectedType: Emoji | "TIME_CMD" = await new FastReactionMenuManager(
            botMsg,
            msg.author,
            ["📥", "📤", "❌"],
            5,
            TimeUnit.MINUTE
        ).react();

        if (selectedType === "TIME_CMD" || selectedType.name === "❌") {
            await botMsg.delete().catch(e => { });
            return;
        }

        if (selectedType.name === "📥") {
            logType = "STORE";
        }
        else {
            logType = "POP";
        }

        // CONSTANTS FOR EASY LOGGING
        let incPOPPED: number = keyToUse.propType === "WC_INC" && logType === "POP"
            ? num
            : 0;
        let incSTORED: number = keyToUse.propType === "WC_INC" && logType === "STORE"
            ? num
            : 0;
        let shieldPOPPED: number = keyToUse.propType === "WC_SHIELD" && logType === "POP"
            ? num
            : 0;
        let shieldSTORED: number = keyToUse.propType === "WC_SHIELD" && logType === "STORE"
            ? num
            : 0;
        let swordPOPPED: number = keyToUse.propType === "WC_SWORD" && logType === "POP"
            ? num
            : 0;
        let swordSTORED: number = keyToUse.propType === "WC_SWORD" && logType === "STORE"
            ? num
            : 0;
        let helmPOPPED: number = keyToUse.propType === "WC_HELM" && logType === "POP"
            ? num
            : 0;
        let helmSTORED: number = keyToUse.propType === "WC_HELM" && logType === "STORE"
            ? num
            : 0;

        const indexOfLogs: number = dbEntry.general.wcOryx.findIndex(x => x.server === guild.id);
        if (indexOfLogs === -1) {
            await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne({ discordUserId: member.id }, {
                $push: {
                    "general.wcOryx": {
                        wcIncs: {
                            amt: incSTORED,
                            popped: incPOPPED
                        },
                        swordRune: {
                            amt: swordSTORED,
                            popped: swordPOPPED
                        },
                        shieldRune: {
                            amt: shieldSTORED,
                            popped: shieldPOPPED
                        },
                        helmRune: {
                            amt: helmSTORED,
                            popped: helmPOPPED
                        },
                        server: guild.id
                    }
                }
            });
        }
        else {
            const wcOryxData: IWineCellarOryx = dbEntry.general.wcOryx[indexOfLogs];

            // wc
            incSTORED = wcOryxData.wcIncs.amt - incPOPPED >= 0
                ? wcOryxData.wcIncs.amt - incPOPPED
                : 0
            incPOPPED += wcOryxData.wcIncs.popped;

            // shield
            shieldSTORED = wcOryxData.shieldRune.amt - shieldPOPPED >= 0
                ? wcOryxData.shieldRune.amt - shieldPOPPED
                : 0
            shieldPOPPED += wcOryxData.shieldRune.popped;

            // sword
            swordSTORED = wcOryxData.swordRune.amt - swordPOPPED >= 0
                ? wcOryxData.swordRune.amt - swordPOPPED
                : 0
            swordPOPPED += wcOryxData.swordRune.popped;

            // helm
            helmSTORED = wcOryxData.helmRune.amt - helmPOPPED >= 0
                ? wcOryxData.helmRune.amt - helmPOPPED
                : 0
            helmPOPPED += wcOryxData.helmRune.popped;

            await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne({
                discordUserId: member.id,
                "general.wcOryx.server": guild.id
            }, {
                $set: {
                    "general.wcOryx.$.wcIncs.amt": incSTORED,
                    "general.wcOryx.$.wcIncs.popped": incPOPPED,
                    "general.wcOryx.$.swordRune.amt": swordSTORED,
                    "general.wcOryx.$.swordRune.popped": swordPOPPED,
                    "general.wcOryx.$.shieldRune.amt": shieldSTORED,
                    "general.wcOryx.$.shieldRune.popped": shieldPOPPED,
                    "general.wcOryx.$.helmRune.amt": helmSTORED,
                    "general.wcOryx.$.helmRune.popped": helmPOPPED,
                }
            });
        }

        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("Keys Logged!")
            .setDescription(logType === "POP" ? `${member} has popped ${num} ${keyToUse.formalName} for us.` : `${num} ${keyToUse.formalName} has been stored for ${member}.`)
            .setColor("GREEN")
            .setFooter("Logged Keys")
            .setTimestamp();
        await botMsg.edit(embed).catch(e => { });
        await botMsg.delete({ timeout: 5000 }).catch(e => { });
    }
}