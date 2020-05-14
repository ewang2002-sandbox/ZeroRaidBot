import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed } from "discord.js";
import { StringUtil } from "../../Utility/StringUtil";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { Zero } from "../../Zero";
import { RoleNames } from "../../Definitions/Types";

export class HelpCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Help Command",
                "help",
                [],
                "A command that lists all current commands or, if a parameter is specified, the command information.",
                ["help [Command: STRING]"],
                ["help", "help startafk"],
                0
            ),
            new CommandPermission(
                [],
                [],
                ["raider"],
                [],
                true
            ),
            false, // guild-only command. 
            false,
            false
        );
    }

    public async executeCommand(
        msg: Message,
        args: string[],
        guildDb: IRaidGuild
    ): Promise<void> {
        const commandToLookFor: string = args[0] || "";
        const resolvedCommand: Command | null = Zero.CmdManager.findCommand(commandToLookFor);

        const cmdEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTimestamp()
            .setColor("RANDOM");
        if (resolvedCommand === null) {
            cmdEmbed
                .setTitle("Current Bot Modules")
                .setDescription(`${commandToLookFor === "" ? "Below are a list of bot commands" : `The command, \`${commandToLookFor}\`, could not be found. Try one of the below commands`}. To learn how to use a command, type \`;help <Command Name>\` (do not include the < >).`);

            let cmdCount: number = 0;
            for (const [name, cmd] of Zero.CmdManager.getCommands()) {
                cmdEmbed.addField(name, StringUtil.applyCodeBlocks(
                    cmd.map(x => x.getMainCommandName()
                    ).join(", ")));
                cmdCount += cmd.length;
            }
            cmdEmbed.setFooter(`${cmdCount} Commands Available.`);
            await msg.channel.send(cmdEmbed).catch(e => { });
            return;
        }
        else {
            const formalCmdName: string = resolvedCommand.getFormalCommandName();
            const commandName: string = resolvedCommand.getMainCommandName();
            const aliases: string = resolvedCommand.getAliases().length > 0
                ? resolvedCommand.getAliases().join(", ")
                : "-";
            const discordPerms: string = resolvedCommand.getGeneralPermissions().length > 0
                ? resolvedCommand.getGeneralPermissions().join(", ")
                : "-";
            let userRolePerms: string = "";

            if (resolvedCommand.isRoleInclusive()) {
                const roleOrder: RoleNames[] = [
                    "moderator",
                    "headRaidLeader",
                    "officer",
                    "universalRaidLeader",
                    "support",
                    "raider",
                    "suspended"
                ];

                for (let roleName of roleOrder) {
                    userRolePerms += `${roleName}\n`;
                    if (roleName === resolvedCommand.getRolePermissions()[0]) {
                        break;
                    }
                }

                userRolePerms = userRolePerms.split("\n").join(", ");
            }
            else {
                userRolePerms = resolvedCommand.getRolePermissions().length > 0
                    ? resolvedCommand.getRolePermissions().join(", ")
                    : "-";
            }
            cmdEmbed
                .setTitle(`Command Found: **${formalCmdName}**`)
                .setDescription(resolvedCommand.getDescription())
                .addField("Main Name", StringUtil.applyCodeBlocks(commandName), true)
                .addField("Aliases", StringUtil.applyCodeBlocks(aliases), true)
                .addField("User Discord Permissions", StringUtil.applyCodeBlocks(discordPerms), true)
                .addField("User Role Permissions", StringUtil.applyCodeBlocks(userRolePerms), true)
                .addField("Usage", StringUtil.applyCodeBlocks(resolvedCommand.getUsage().join("\n")))
                .addField("Examples", StringUtil.applyCodeBlocks(resolvedCommand.getExamples().join("\n")))
                .addField("Bot Owner Only?", StringUtil.applyCodeBlocks(resolvedCommand.isBotOwnerOnly() ? "Yes" : "No"), true)
                .addField("Guild Only?", StringUtil.applyCodeBlocks(resolvedCommand.isGuildOnly() ? "Yes" : "No"), true)
                .addField("Minimum Arguments", StringUtil.applyCodeBlocks(resolvedCommand.getArgumentLength().toString()), true);
            await msg.channel.send(cmdEmbed).catch(e => { });
        }
    }
}