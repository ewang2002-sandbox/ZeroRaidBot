import { Client, Message, Guild, ClientApplication, User, MessageEmbed, GuildMember } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { DefaultPrefix } from "../Configuration/Config";
import { Command } from "../Templates/Command/Command";
import { Zero } from "../Zero";
import { RoleNames } from "../Definitions/Types";
import { StringUtil } from "../Utility/StringUtil";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";

export async function onMessageEvent(msg: Message) {
	// make sure we have a regular message to handle
	if (msg.type === "PINS_ADD") {
		await msg.delete().catch(e => { });
		return;
	}
	
	if (msg.type !== "DEFAULT") {
		return;
	}

	// ensure no bot.
	if (msg.author.bot) {
		return;
	}

	if (msg.guild !== null) {
		const mongoGuild: MongoDbHelper.MongoDbGuildManager = new MongoDbHelper.MongoDbGuildManager(msg.guild.id);
		await commandHandler(msg, await mongoGuild.findOrCreateGuildDb());
	}
	else {
		await commandHandler(msg, null);
	}
}

/**
 * The command handler function. 
 * @param {Client} client The client. 
 * @param {Message} msg The message. 
 * @param {IRaidGuild | null} guildHandler The guild handler. 
 */
async function commandHandler(msg: Message, guildHandler: IRaidGuild | null): Promise<void> {
	let app: ClientApplication = await msg.client.fetchApplication();

	if (msg.webhookID !== null) {
		return; // no webhooks
	}

	if (msg.content.indexOf(DefaultPrefix) !== 0) {
		return;
	}

	let messageArray: string[] = msg.content.split(/ +/);
	let cmd: string = messageArray[0];
	let args: string[] = messageArray.slice(1);
	let commandfile: string = cmd.slice(DefaultPrefix.length);

	// make sure the command exists
	let command: Command | null = Zero.CmdManager.findCommand(commandfile);

	if (command === null) {
		return;
	}
	const embed: MessageEmbed = new MessageEmbed()
		.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
		.setColor("RED")
		.setFooter(msg.guild === null ? "Zero" : msg.guild.name);

	// let's do some checks
	if (command.isBotOwnerOnly() && msg.author.id !== (app.owner as User).id) {
		embed.setTitle("**Bot Owner Command Only**")
			.setDescription("This command can only be used by the bot owner.");
		msg.author.send(embed).catch(e => { });
		return;
	}

	// if the command is executed in dm
	if (msg.guild === null && command.isGuildOnly()) {
		embed.setTitle("**Server Command Only**")
			.setDescription("This command only works in a server. Please try executing this command in a server.");
		msg.author.send(embed).catch(e => { });
		return;
	}

	// if this command is executed in the server. 
	if (msg.guild !== null) {
		// because this is a guild, we have the following vars as NOT null
		let member: GuildMember = msg.member as GuildMember;
		guildHandler = guildHandler as IRaidGuild;

		if (command.isServerOwnerOnly() && msg.author.id !== msg.guild.id) {
			embed.setTitle("**Server Owner Command Only**")
				.setDescription("This command can only be used by the guild server owner.");
			msg.channel.send(embed).catch(e => { });
			return;
		}

		if (command.getCommandPermissions().getGeneralPermissions().length !== 0) {
			let missingPermissions: string = "";
			for (let i = 0; i < command.getCommandPermissions().getGeneralPermissions().length; i++) {
				if (!member.hasPermission(command.getCommandPermissions().getGeneralPermissions()[i])) {
					missingPermissions += command.getCommandPermissions().getGeneralPermissions()[i] + ", ";
				}
			}

			if (missingPermissions.length !== 0) {
				embed.setTitle("**No Permissions**")
					.setDescription("You do not have the appropriate server permissions to execute this command.")
					.addFields([
						{
							name: "Permissions Required",
							value: StringUtil.applyCodeBlocks(command.getCommandPermissions().getGeneralPermissions().join(", "))
						},
						{
							name: "Permissions Missing",
							value: StringUtil.applyCodeBlocks(missingPermissions)
						}
					]);
				msg.channel.send(embed).catch(e => { });
				return;
			}
		}

		// check to see if the member has role perms
		if (command.getCommandPermissions().getRolePermissions().length !== 0
			&& !member.permissions.has("ADMINISTRATOR")) {
			const raider: string = guildHandler.roles.raider;
			const trialRaidLeader: string = guildHandler.roles.trialRaidLeader;
			const almostRaidLeader: string = guildHandler.roles.almostRaidLeader;
			const raidLeader: string = guildHandler.roles.raidLeader;
			const officer: string = guildHandler.roles.officer;
			const headRaidLeader: string = guildHandler.roles.headRaidLeader;
			const moderator: string = guildHandler.roles.moderator;
			const support: string = guildHandler.roles.support;
			const roleOrder: [string, RoleNames][] = [
				[moderator, "moderator"],
				[headRaidLeader, "headRaidLeader"],
				[officer, "officer"],
				[raidLeader, "raidLeader"],
				[almostRaidLeader, "almostRaidLeader"],
				[trialRaidLeader, "trialRaidLeader"],
				[support, "support"],
				[raider, "raider"]
			]; // because we really care about suspended users.

			let canRunCommand: boolean = false;

			if (command.getCommandPermissions().isRoleInclusive()) {
				for (let [roleID, roleName] of roleOrder) {
					if (member.roles.cache.has(roleID)) {
						canRunCommand = true;
						// break out of THIS loop 
						break;
					}

					// we reached the minimum role
					// break out since we no longer need to check 
					if (roleName === command.getCommandPermissions().getRolePermissions()[0]) {
						break;
					}
				}
			}
			else {
				for (let i = 0; i < command.getCommandPermissions().getRolePermissions().length; i++) {
					for (let [roleID, roleName] of roleOrder) {
						if (command.getCommandPermissions().getRolePermissions()[i] === roleName
							&& member.roles.cache.has(roleID)) {
							canRunCommand = true;
							break;
						}
					}
				}

			}

			if (!canRunCommand) {
				embed.setTitle("**Missing Role Permissions**")
					.setDescription("You do not have the required roles needed to execute this command.")
					.addFields({
						name: "Required Roles",
						value: StringUtil.applyCodeBlocks(command.getCommandPermissions().getRolePermissions().map(x => x.toUpperCase()).join(", "))
					});
				msg.channel.send(embed).catch(e => { });
				return;
			}
		}
	}

	if (command.getCommandDetails().getArgumentLength() > args.length) {
		embed.setTitle("**Insufficient Arguments**")
			.setDescription("You did not provide the correct number of arguments.")
			.addFields([
				{
					name: "Required",
					value: StringUtil.applyCodeBlocks(command.getCommandDetails().getArgumentLength().toString()),
					inline: true
				},
				{
					name: "Provided",
					value: StringUtil.applyCodeBlocks(args.length.toString()),
					inline: true
				}
			]);
		msg.channel.send(embed).catch(e => { });
		return;
	}

	await msg.delete().catch(e => { });
	command.executeCommand(msg, args, guildHandler);
}