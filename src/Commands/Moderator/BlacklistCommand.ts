import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildMember, Guild, MessageEmbed, TextChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { UserHandler } from "../../Helpers/UserHandler";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { IRaidUser } from "../../Templates/IRaidUser";
import { FilterQuery } from "mongodb";
import { ArrayUtil } from "../../Utility/ArrayUtil";

export class BlacklistCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Blacklist",
				"blacklist",
				["bl"],
				"Blacklists a user, preventing them from verifying. If they are verified in the server, they will be banned.",
				["blacklist <IGN> <Reason: STRING> [--silent]"],
				["blacklist EpicTest harassment of staff member", "blacklist SomeBadBoi cheating"],
				2
			),
			new CommandPermission(
				["BAN_MEMBERS"],
				["BAN_MEMBERS", "EMBED_LINKS"],
				["officer", "moderator", "headRaidLeader"],
				[],
				false
			),
			true,
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
		const mod: GuildMember = msg.member as GuildMember;
		let silent: boolean = false;
		if (args.join(" ").includes("--silent")) {
			args = args.join(" ").replace("--silent", "").split(" ");
		}

		const nameToBlacklist: string = args.shift() as string;

		const isBlacklisted: boolean = guildDb.moderation.blacklistedUsers
			.some(x => x.inGameName.toLowerCase().trim() === nameToBlacklist.toLowerCase().trim());

		if (isBlacklisted) {
			await MessageUtil.send({ content: `**\`${nameToBlacklist}\`** is already blacklisted.` }, msg.channel);
			return;
		}

		const reason: string = args.join(" ") // there will always be at least 2 elements
		if (reason.length > 800) {
			await MessageUtil.send({ content: `The reason you provided is too long; your reasoning is ${reason.length} characters long, and the maximum length is 800 characters.` }, msg.channel);
			return;
		}

		const memberToBlacklist: GuildMember | null = await UserHandler.resolveMember(msg, guildDb);

		// check to see if in server 
		if (memberToBlacklist !== null) {
			if (memberToBlacklist.id === msg.author.id) {
				await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "SAME_PERSON_AS_AUTHOR", null), msg.channel);
				return;
			}

			if (msg.author.id !== guild.ownerID && mod.roles.highest.comparePositionTo(memberToBlacklist.roles.highest) <= 0) {
				MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("Role Hierarchy Error").setDescription("The person you are trying to blacklist is equal to or has higher role permissions than you."), msg.channel);
				return;
			}
		}

		// look for database
		const filterQuery: FilterQuery<IRaidUser> = {};
		filterQuery.$or = [];

		let isIgn: boolean = false;
		let isId: boolean = false; 
		// mention (in server)
		if (memberToBlacklist !== null) {
			filterQuery.$or.push({
				discordUserId: memberToBlacklist.id
			});
		}

		// id only
		if (/^\d+$/.test(nameToBlacklist)) {
			filterQuery.$or.push({
				discordUserId: nameToBlacklist
			});
			isId = true;
		}

		if (/^[a-zA-Z]+$/.test(nameToBlacklist) && nameToBlacklist.length <= 10) {
			filterQuery.$or.push(
				{
					rotmgLowercaseName: nameToBlacklist.toLowerCase()
				},
				{
					"otherAccountNames.lowercase": nameToBlacklist.toLowerCase()
				}
			);
			isIgn = true;
		}

		const invalidInputEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("Invalid Input Detected")
			.setDescription(`Your input, ${(isIgn || isId) ? `\`${nameToBlacklist}\`` : nameToBlacklist}, is invalid. Please try again.`)
			.setColor("RED")
			.setFooter("Blacklist");

		if (filterQuery.$or.length === 0) {
			msg.channel.send(invalidInputEmbed)
				.then(x => x.delete({ timeout: 5000 }));
			return;
		}

		let ignsToBlacklist: string[] = [];
		const searchResults: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.MongoUserClient.findOne(filterQuery);
		if (searchResults === null) {
			if (isIgn) {
				ignsToBlacklist.push(nameToBlacklist);
			}
			else {
				invalidInputEmbed.addField("Reason", "The input you provided either wasn't a valid in-game name (10 __letters__ or less), or the ID/mention corresponding to the person that you wanted to blacklist wasn't found in the database.");
				MessageUtil.send({ embed: invalidInputEmbed }, msg.channel);
				return;
			}
		}
		else {
			ignsToBlacklist.push(searchResults.rotmgLowercaseName, ...searchResults.otherAccountNames.map(x => x.lowercase));
		}

		ignsToBlacklist = ArrayUtil.removeDuplicate<string>(ignsToBlacklist);
		let namesThatWereBlacklisted: string[] = [];
		let desc: StringBuilder = new StringBuilder();
		for await (const ign of ignsToBlacklist) {
			const index: number = guildDb.moderation.blacklistedUsers.findIndex(x => x.inGameName === ign);
			if (index === -1) {
				await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
					$push: {
						"moderation.blacklistedUsers": {
							inGameName: ign.toLowerCase(),
							reason: reason,
							date: new Date().getTime(),
							moderator: mod.displayName
						}
					}
				});
				namesThatWereBlacklisted.push(ign);
			}
		}

		desc.append(`⇒ **Blacklisted Names:** ${namesThatWereBlacklisted.join(", ")}`)
			.appendLine();

		if (memberToBlacklist !== null) {
			if (!silent) {
				await memberToBlacklist.send(`**\`[${guild.name}]\`** You have been blacklisted from the server for the following reason: ${reason}`).catch(() => { });
			}
			await memberToBlacklist.ban({
				reason: `${ignsToBlacklist[0]} | ${reason}`
			}).catch(() => { });
			desc.append(`⇒ Banned: ${memberToBlacklist} (ID: ${memberToBlacklist.displayName})`)
				.appendLine();
		}

		desc.append(`⇒ Reason: ${reason}`)
			.appendLine();

		MessageUtil.send({ content: `${isIgn || isId ? `\`${nameToBlacklist}\`` : `${nameToBlacklist}`} has been blacklisted successfully.` }, msg.channel);

		const moderationChannel: TextChannel | undefined = guild.channels.cache.get(guildDb.generalChannels.logging.moderationLogs) as TextChannel | undefined;

		if (typeof moderationChannel === "undefined") {
			return;
		}

		const embed: MessageEmbed = new MessageEmbed()
			.setTitle("🚩 Blacklisted")
			.setDescription(desc.toString())
			.setColor("RED")
			.setFooter("Blacklisted on")
			.setTimestamp();
		if (memberToBlacklist === null) {
			embed.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string);
		}
		else {
			embed.setAuthor(memberToBlacklist.user.tag, memberToBlacklist.user.displayAvatarURL());
		}
		await moderationChannel.send(embed).catch(() => { });
	}
}