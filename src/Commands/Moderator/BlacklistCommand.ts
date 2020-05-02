import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildMember, Guild, MessageEmbed, Collection, Role, TextChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { StringUtil } from "../../Utility/StringUtil";
import { UserHandler } from "../../Helpers/UserHandler";
import { IRaidUser } from "../../Templates/IRaidUser";
import { StringBuilder } from "../../Classes/String/StringBuilder";

export class BlacklistCommand extends Command {
	public static currentTimeout: { timeout: NodeJS.Timeout, id: string }[] = [];

	public constructor() {
		super(
			new CommandDetail(
				"Blacklist",
				"blacklist",
				["bl"],
				"Blacklists a user, preventing them from verifying. If they are verified in the server, they will be banned.",
				["blacklist <@Mention | ID | IGN> <Reason: STRING> [--silent]"],
				["blacklist EpicTest harassment of staff member", "blacklist SomeBadBoi cheating"],
				2
			),
			new CommandPermission(
				["BAN_MEMBERS", "MANAGE_GUILD"],
				["BAN_MEMBERS", "EMBED_LINKS"],
				["officer", "moderator"],
				false
			),
			true,
			false,
			false
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

		let nameToBlacklist: string = args[0];

		const isBlacklisted: boolean = guildDb.moderation.blacklistedUsers
			.some(x => x.inGameName.toLowerCase().trim() === nameToBlacklist.toLowerCase().trim());

		if (isBlacklisted) {
			await MessageUtil.send({ content: `**\`${nameToBlacklist}\`** is already blacklisted.` }, msg.channel);
			return;
		}

		const reason: string = args.pop() as string; // there will always be at least 2 elements
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

		let desc: StringBuilder = new StringBuilder();
		await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
			$push: {
				"moderation.blacklistedUsers": {
					inGameName: nameToBlacklist.toLowerCase(),
					reason: reason,
					date: new Date().getTime(),
					moderator: mod.id,
					isNetworkBlacklist: false
				}
			}
		});

		desc.append(`⇒ **\`${nameToBlacklist}\`** has been blacklisted from the server.`)
			.appendLine();

		//#region commented out stuff
		/*
		const userMongo: MongoDbHelper.MongoDbUserManager = new MongoDbHelper.MongoDbUserManager(nameToBlacklist);
		const dbInfo: IRaidUser[] = await userMongo.getUserDB();

		if (dbInfo.length === 0) {
			// this should never hit UNLESS
			// the person has never verified
			// with the bot

			await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
				$push: {
					"moderation.blacklistedUsers": {
						inGameName: nameToBlacklist.toLowerCase(),
						reason: reason,
						date: new Date().getTime(),
						moderator: mod.id,
						isNetworkBlacklist: false
					}
				}
			});

			desc.append(`**\`${nameToBlacklist}\`** has been blacklisted from the server.`)
				.appendLine();
		}
		else {
			const firstEntry: IRaidUser = dbInfo[0];
			nameToBlacklist = firstEntry.rotmgDisplayName; // main acc
			let accountsBlacklisted: string[] = [];
			for await (const entry of [firstEntry.rotmgDisplayName, ...firstEntry.otherAccountNames.map(x => x.displayName)]) {
				const isBlacklisted: boolean = guildDb.moderation.blacklistedUsers
					.some(x => x.inGameName.toLowerCase().trim() === entry.toLowerCase().trim());
				if (isBlacklisted) {
					continue;
				}

				accountsBlacklisted.push(entry);

				MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
					$push: {
						"moderation.blacklistedUsers": {
							inGameName: entry.toLowerCase(),
							reason: reason,
							date: new Date().getTime(),
							moderator: mod.id,
							isNetworkBlacklist: false
						}
					}
				});
			}

			desc.append(`Accounts Blacklisted: ${accountsBlacklisted.length === 0 ? "None" : accountsBlacklisted.join(", ")}`)
				.appendLine();
		}*/

		//#endregion end comments

		if (memberToBlacklist !== null) {
			if (!silent) {
				await memberToBlacklist.send(`**\`[${guild.name}]\`** You have been blacklisted from the server for the following reason: ${reason}`).catch(e => { });
			}
			await memberToBlacklist.ban({
				reason: `${nameToBlacklist} | ${reason}`
			}).catch(e => { });
			desc.append(`⇒ Banned: ${memberToBlacklist} (ID: ${memberToBlacklist.displayName})`)
				.appendLine();
		}

        desc.append(`⇒ Reason: ${reason}`)
			.appendLine();
			
		MessageUtil.send({ content: `**\`${nameToBlacklist}\`** has been blacklisted successfully.` }, msg.channel);

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
		await moderationChannel.send(embed).catch(e => { });
	}
}