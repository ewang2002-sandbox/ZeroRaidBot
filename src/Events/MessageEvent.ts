import { Message, ClientApplication, User, MessageEmbed, GuildMember } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { DefaultPrefix, BotConfiguration } from "../Configuration/Config";
import { Command } from "../Templates/Command/Command";
import { Zero } from "../Zero";
import { RoleNames } from "../Definitions/Types";
import { StringUtil } from "../Utility/StringUtil";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { MessageUtil } from "../Utility/MessageUtil";

export async function onMessageEvent(msg: Message) {
	// make sure we have a regular message to handle
	if (msg.type === "PINS_ADD") {
		await msg.delete().catch(() => { });
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

	const owners: string[] = [(app.owner as User).id, ...BotConfiguration.botOwners];
	// let's do some checks
	if (command.isBotOwnerOnly() && !owners.some(x => x === msg.author.id)) {
		embed.setTitle("**Bot Owner Command Only**")
			.setDescription("This command can only be used by the bot owner.");
		msg.author.send(embed).catch(() => { });
		return;
	}

	// if the command is executed in dm
	if (msg.guild === null && command.isGuildOnly()) {
		embed.setTitle("**Server Command Only**")
			.setDescription("This command only works in a server. Please try executing this command in a server.");
		msg.author.send(embed).catch(() => { });
		return;
	}

	// if this command is executed in the server. 
	if (msg.guild !== null) {
		// because this is a guild, we have the following vars as NOT null
		let member: GuildMember = msg.member as GuildMember;
		guildHandler = guildHandler as IRaidGuild;

		if (command.isServerOwnerOnly() && msg.author.id !== msg.guild.ownerID) {
			embed.setTitle("**Server Owner Command Only**")
				.setDescription("This command can only be used by the guild server owner.");
			MessageUtil.send(embed, msg.channel, 8 * 1000).catch(() => { });

			return;
		}

		if (command.getGeneralPermissions().length !== 0) {
			let missingPermissions: string = "";
			for (let i = 0; i < command.getGeneralPermissions().length; i++) {
				if (!member.hasPermission(command.getGeneralPermissions()[i])) {
					missingPermissions += command.getGeneralPermissions()[i] + ", ";
				}
			}

			if (missingPermissions.length !== 0) {
				missingPermissions = missingPermissions
					.split(", ")
					.map(x => x.trim())
					.filter(x => x.length !== 0)
					.join(", ");
				embed.setTitle("**No Permissions**")
					.setDescription("You do not have the appropriate server permissions to execute this command.")
					.addFields([
						{
							name: "Permissions Required",
							value: StringUtil.applyCodeBlocks(command.getGeneralPermissions().join(", "))
						},
						{
							name: "Permissions Missing",
							value: StringUtil.applyCodeBlocks(missingPermissions)
						}
					]);
				MessageUtil.send(embed, msg.channel, 8 * 1000).catch(() => { });

				return;
			}
		}

		// check to see if the member has role perms
		if (command.getRolePermissions().length !== 0
			&& !member.permissions.has("ADMINISTRATOR")) {
			const raider: string = guildHandler.roles.raider;
			const universalAlmostRaidLeader: string = guildHandler.roles.universalAlmostRaidLeader;
			const universalRaidLeader: string = guildHandler.roles.universalRaidLeader;
			const officer: string = guildHandler.roles.officer;
			const headRaidLeader: string = guildHandler.roles.headRaidLeader;
			const moderator: string = guildHandler.roles.moderator;
			const support: string = guildHandler.roles.support;
			const suspended: string = guildHandler.roles.suspended;
			const roleOrder: [string, RoleNames][] = [
				[moderator, "moderator"],
				[headRaidLeader, "headRaidLeader"],
				[officer, "officer"],
				[universalRaidLeader, "universalRaidLeader"],
				[universalAlmostRaidLeader, "universalAlmostRaidLeader"],
				[support, "support"],
				[raider, "raider"],
				[suspended, "suspended"]
			];

			let canRunCommand: boolean = false;

			if (command.isRoleInclusive()) {
				for (let [roleID, roleName] of roleOrder) {
					if (member.roles.cache.has(roleID)) {
						canRunCommand = true;
						// break out of THIS loop 
						break;
					}

					// we reached the minimum role
					// break out since we no longer need to check 
					if (roleName === command.getRolePermissions()[0]) {
						break;
					}
				}
			}
			else {
				for (let i = 0; i < command.getRolePermissions().length; i++) {
					for (let [roleID, roleName] of roleOrder) {
						if (command.getRolePermissions()[i] === roleName
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
						value: StringUtil.applyCodeBlocks(command.getRolePermissions().map(x => x.toUpperCase()).join(", "))
					});
				MessageUtil.send(embed, msg.channel, 8 * 1000).catch(() => { });

				return;
			}
		}
	}

	if (command.getBotPermissions().length !== 0
		&& msg.guild !== null
		&& msg.guild.me !== null
		&& !msg.guild.me.hasPermission("ADMINISTRATOR")) {
		let missingPermissions: string = "";
		for (let i = 0; i < command.getBotPermissions().length; i++) {
			if (!msg.guild.me.hasPermission(command.getBotPermissions()[i])) {
				missingPermissions += command.getBotPermissions()[i] + ", ";
			}
		}

		if (missingPermissions.length !== 0) {
			missingPermissions = missingPermissions
				.split(", ")
				.map(x => x.trim())
				.filter(x => x.length !== 0)
				.join(", ");
			embed.setTitle("**Limited Bot Permissions**")
				.setDescription("The bot does not have the appropriate server permissions to execute this command.")
				.addFields([
					{
						name: "Permissions Required",
						value: StringUtil.applyCodeBlocks(command.getBotPermissions().join(", "))
					},
					{
						name: "Permissions Missing",
						value: StringUtil.applyCodeBlocks(missingPermissions)
					}
				]);
			MessageUtil.send(embed, msg.channel, 8 * 1000).catch(() => { });

			return;
		}
	}


	if (command.getArgumentLength() > args.length) {
		embed.setTitle("**Insufficient Arguments**")
			.setDescription("You did not provide the correct number of arguments.")
			.addFields([
				{
					name: "Required",
					value: StringUtil.applyCodeBlocks(command.getArgumentLength().toString()),
					inline: true
				},
				{
					name: "Provided",
					value: StringUtil.applyCodeBlocks(args.length.toString()),
					inline: true
				}
			]);
		MessageUtil.send(embed, msg.channel, 8 * 1000).catch(() => { });

		return;
	}

	await msg.delete().catch(() => { });
	command.executeCommand(msg, args, guildHandler);
}