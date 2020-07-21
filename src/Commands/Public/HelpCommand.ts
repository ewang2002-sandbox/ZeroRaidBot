import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, ClientApplication, User, MessageCollector, TextChannel } from "discord.js";
import { StringUtil } from "../../Utility/StringUtil";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { Zero } from "../../Zero";
import { RoleNames } from "../../Definitions/Types";
import { OtherUtil } from "../../Utility/OtherUtil";
import { BotConfiguration } from "../../Configuration/Config";

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
				[],
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
			let app: ClientApplication = await msg.client.fetchApplication();
			const owners: string[] = [(app.owner as User).id, ...BotConfiguration.botOwners];

			for (const [name, cmds] of Zero.CmdManager.getCommands()) {
				let commands: string = "";
				for (const command of cmds) {
					cmdCount += cmds.length;
					// guild only command but not in guild
					// so we skip
					if (command.isGuildOnly()) {
						if (msg.guild === null) {
							continue;
						}
					}
					else {
						if (command.isBotOwnerOnly()) {
							if (owners.some(x => x === msg.author.id)) {
								commands += command.getMainCommandName() + "\n";
							}
						}
						else {
							commands += command.getMainCommandName() + "\n";
						}
						continue;
					}

					if (command.isBotOwnerOnly() && !owners.some(x => x === msg.author.id)) {
						continue;
					}

					const cmdUserPerm: [boolean, boolean, boolean] = OtherUtil.checkCommandPerms(msg, command, guildDb);
					let canRunCommand: boolean;
					if (cmdUserPerm[2]) {
						canRunCommand = cmdUserPerm[0] || cmdUserPerm[1];
					}
					else {
						canRunCommand = cmdUserPerm[1];
					}

					if (canRunCommand) {
						commands += command.getMainCommandName() + "\n";
					}
				}

				if (commands.length !== 0) {
					cmdEmbed.addField(name, StringUtil.applyCodeBlocks(commands));
					commands = "";
				}
			}
			cmdEmbed.setFooter(`${cmdCount} Total Commands.`);
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