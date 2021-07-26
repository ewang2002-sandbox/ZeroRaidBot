import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, GuildEmoji, ReactionEmoji, Guild, TextChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { FastReactionMenuManager } from "../../Classes/Reaction/FastReactionMenuManager";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { DateUtil } from "../../Utility/DateUtil";
import { MessageUtil } from "../../Utility/MessageUtil";

export class ResetKeyLeaderboardCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Reset Key Leaderboard Command",
                "resetkeyleaderboard",
                ["resetkey", "resetkeys"],
                "Resets the key popper leaderboard. Does not affect members that have any key popper roles.",
                ["resetkeyleaderboard"],
                ["resetkeyleaderboard"],
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
        const keyLeaderboardChannel: TextChannel | null = guild.channels.cache.has(guildData.generalChannels.keyLeaderboardChannel)
            ? guild.channels.cache.get(guildData.generalChannels.keyLeaderboardChannel) as TextChannel
            : null;

        if (!guildData.properties.keyLeaderboard) {
            await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({
                guildID: guild.id
            }, {
                $set: {
                    "properties.keyLeaderboard": {
                        keyDetails: [],
                        keyMessage: "",
                        lastReset: new Date().getTime()
                    }
                }
            });

            guildData.properties.keyLeaderboard = {
                keyDetails: [],
                keyMessage: "",
                lastReset: new Date().getTime()
            };
        }

        const confirmEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("Confirmation")
            .setDescription("Are you sure you want to reset the key leaderboard?")
            .setColor("RED")
            .setFooter("Key Leaderboard Management");

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
            if (keyLeaderboardChannel === null) {
                return;
            }

            if (guildData.properties.keyLeaderboard.keyMessage) {
                let oldKeyMsg: Message | null = null;
                try {
                    oldKeyMsg = await keyLeaderboardChannel.messages.fetch(guildData.properties.keyLeaderboard.keyMessage).catch();
                }
                catch (e) { }

                if (oldKeyMsg) {
                    // Unlink message so it doesn't get edited
                    guildData = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
                        $set: {
                            "properties.keyLeaderboard.keyMessage": ""
                        }
                    }, { returnOriginal: false })).value as IRaidGuild;

                    const weekOfDate = DateUtil.getTime(guildData.properties.keyLeaderboard.lastReset);
                    const todayDate = DateUtil.getTime();

                   const oldEmbed = oldKeyMsg.embeds[0];
                   oldEmbed.setDescription(`Top 20 key poppers for the time period between **${weekOfDate}** and **${todayDate}**.`);
                    
                   await oldKeyMsg.edit(oldEmbed).catch();
                }
            }

            // construct the embed. 
            const newDate = new Date().getTime();
            const leaderboardEmbed = MessageUtil.generateBlankEmbed(guild, "RANDOM")
                .setDescription(`Top 20 key poppers for the time period between ${DateUtil.getTime(newDate)} and ${DateUtil.getTime()}.`)
                .setTitle(`Top 20 Key Poppers in: ${guild.name}`)
                .setFooter("Last Updated")
                .setTimestamp();


            const m = await keyLeaderboardChannel.send(leaderboardEmbed);

            await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
                $set: {
                    "properties.keyLeaderboard.keyDetails": [],
                    "properties.keyLeaderboard.lastReset": newDate,
                    "properties.keyLeaderboard.keyMessage": m.id
                }
            });
        }
    }
}