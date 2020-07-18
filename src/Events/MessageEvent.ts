import { Message, ClientApplication, User, MessageEmbed, GuildMember } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { DefaultPrefix, BotConfiguration } from "../Configuration/Config";
import { Command } from "../Templates/Command/Command";
import { Zero } from "../Zero";
import { StringUtil } from "../Utility/StringUtil";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { MessageUtil } from "../Utility/MessageUtil";
import { OtherUtil } from "../Utility/OtherUtil";
import { ModMailHandler } from "../Helpers/ModMailHandler";
import { UserAvailabilityHelper } from "../Helpers/UserAvailabilityHelper";

export async function onMessageEvent(msg: Message): Promise<void> {
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

	const prefixes: string[] = [DefaultPrefix];
	if (guildHandler !== null) {
		prefixes.push(guildHandler.prefix);
	}

	let prefix: string | undefined;
	for (const possPrefix of prefixes) {
		if (msg.content.indexOf(possPrefix) === 0) {
			prefix = possPrefix;
			break;
		}
	}

	// no prefix = modmail
	if (typeof prefix === "undefined") {
		checkModMail(msg);
		return;
	}

	let messageArray: string[] = msg.content.split(/ +/);
	let cmd: string = messageArray[0];
	let args: string[] = messageArray.slice(1);
	let commandfile: string = cmd.slice(prefix.length);

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
		msg.channel.send(embed).catch(() => { });
		return;
	}

	// if the command is executed in dm
	if (msg.guild === null && command.isGuildOnly()) {
		embed.setTitle("**Server Command Only**")
			.setDescription("This command only works in a server. Please try executing this command in a server.");
		msg.channel.send(embed).catch(() => { });
		return;
	}

	// if this command is executed in the server. 
	if (msg.guild !== null) {
		// because this is a guild, we have the following vars as NOT null
		guildHandler = guildHandler as IRaidGuild;

		if (command.isServerOwnerOnly() && msg.author.id !== msg.guild.ownerID) {
			embed.setTitle("**Server Owner Command Only**")
				.setDescription("This command can only be used by the guild server owner.");
			MessageUtil.send(embed, msg.channel, 8 * 1000).catch(() => { });
			return;
		}

		const [hasServerPerms, hasRolePerms, considerServerPerms]: [boolean, boolean, boolean] = OtherUtil.checkCommandPerms(msg, command, guildHandler);
		
		let canRunCommand: boolean;
		if (considerServerPerms) {
			canRunCommand = hasServerPerms || hasRolePerms;
		}
		else {
			canRunCommand = hasRolePerms;
		}
		if (!canRunCommand) {
			embed.setTitle("**Missing Permissions**")
				.setDescription("You are missing either server or role permissions. Please use the help command to look up the permissions needed to run this command.")
			MessageUtil.send(embed, msg.channel, 8 * 1000).catch(() => { });
			return;
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
		const usageEx: string = command.getUsage().join("\n");
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
				},
				{
					name: "Command Usage",
					value: StringUtil.applyCodeBlocks(usageEx.length === 0 ? "N/A" : usageEx)
				}
			]);
		MessageUtil.send(embed, msg.channel, 8 * 1000).catch(() => { });
		return;
	}

	await msg.delete().catch(() => { });
	command.executeCommand(msg, args, guildHandler);
}

/**
 * Initiates modmail. 
 * @param msg The message.
 */
async function checkModMail(msg: Message): Promise<void> {
	if (msg.guild !== null) {
		return;
	}
	
	// in menu so dont say anything
	if (UserAvailabilityHelper.InMenuCollection.has(msg.author.id)) {
		return;
	}
	ModMailHandler.initiateModMailContact(msg.author, msg);
}