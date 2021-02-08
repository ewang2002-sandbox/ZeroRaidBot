import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, Guild, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { ConfigureSectionCommand } from "./ConfigureSectionCommand";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { MessageUtil } from "../../Utility/MessageUtil";
import { Zero } from "../../Zero";
import { ArrayUtil } from "../../Utility/ArrayUtil";

export class ConfigureBlockCmdCommand extends Command {
    public static UnblockableCommands: (typeof Command)[] = [
        ConfigureBlockCmdCommand,
        ConfigureSectionCommand
    ];

    public constructor() {
        super(
            new CommandDetail(
                "Block/Unblock Commands",
                "configureblockedcommands",
                ["configblockedcommands", "blockedcmd", "blockcmd", "configblockedcmd", "cmdblock"],
                "Configures all blocked commands.",
                ["cmdblock <Command>", "cmdblock"],
                ["cmdblock", "cmdblock help"],
                0
            ),
            new CommandPermission(
                ["ADMINISTRATOR"],
                [],
                [],
                [],
                false
            ),
            true, // guild-only command. 
            false,
            false,
            5
        );
    }

    public async executeCommand(
        msg: Message,
        args: string[],
        guildDb: IRaidGuild
    ): Promise<void> {
        const guild: Guild = msg.guild as Guild;
        if (typeof guildDb.properties.blockedCommands === "undefined") {
            guildDb = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
                $set: {
                    "properties.blockedCommands": []
                }
            }, { returnOriginal: false })).value as IRaidGuild;
        }

        const resultEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
            .setTimestamp();

        if (args.length === 0) {
            // check commands blocked
            if (guildDb.properties.blockedCommands.length === 0) {
                resultEmbed.setTitle("No Commands Blocked")
                    .setColor("RED")
                    .setDescription("There are currently no commands blocked.");
                MessageUtil.send({ embed: resultEmbed }, msg.channel);
                return;
            }
            else {
                const fields: string[] = ArrayUtil.arrayToStringFields<string>(
                    guildDb.properties.blockedCommands,
                    (i, e) => `**\`[${i + 1}]\`** ${e}\n`
                );

                resultEmbed.setTitle(`${guildDb.properties.blockedCommands.length} Commands Blocked`)
                    .setDescription(`${guildDb.properties.blockedCommands.length} commands have been blocked. Note that administrators will be able to use any command, even if the command is blocked.`)
                    .setColor("RED");

                for (const field of fields) {
                    resultEmbed.addField("Blocked Command(s)", field);
                }
                await msg.channel.send(resultEmbed).catch(e => { });
                return;
            }
        }
        else {
            // alright cool
            let command: Command | null = Zero.CmdManager.findCommand(args.join(" ").trim());
            if (command === null) {
                resultEmbed.setTitle("Command Not Found")
                    .setDescription(`The command, \`${args.join(" ").trim()}\`, was not found. Please try again.`);
            }
            else if (ConfigureBlockCmdCommand.UnblockableCommands.map(x => x.name).includes(command.constructor.name)) {
                resultEmbed.setTitle("Command Unblockable")
                    .setDescription(`The command, \`${command.getMainCommandName()}\`, cannot be blocked.`);
            }
            else {
                let isFound: boolean = guildDb.properties.blockedCommands
                    .indexOf(command.getMainCommandName()) !== -1;

                if (isFound) {
                    await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
                        $pull: {
                            "properties.blockedCommands": command.getMainCommandName()
                        }
                    });
                }
                else {
                    await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
                        $push: {
                            "properties.blockedCommands": command.getMainCommandName()
                        }
                    });
                }

                resultEmbed.setTitle(isFound ? "Command Unblocked" : "Command Blocked")
                    .setDescription(`The command, \`${command.getMainCommandName()}\`, was ${isFound ? "unblocked." : "blocked."}`);
            }
            MessageUtil.send({ embed: resultEmbed }, msg.channel);
        }
    }
}