import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildMember, MessageEmbed, User } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { UserHandler } from "../../Helpers/UserHandler";
import { DateUtil } from "../../Utility/DateUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { IRaidUser } from "../../Templates/IRaidUser";
import { Zero } from "../../Zero";

export class FindUserCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Find Member",
				"find",
				[],
				"Finds a user's Discord profile in the server based on the in-game name provided.",
				["find <Target Name> [--deep]"],
				["find Testing", "find NotSoEpic --deep"],
				1
			),
			new CommandPermission(
				[],
				["EMBED_LINKS"],
				["support"],
				[],
				true
			),
			true, // guild-only command. 
			false,
			false
		);
	}

	/**
	 * @inheritdoc
	 */
	public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
		// required due to the fact that guild can be null.
		if (msg.guild === null || msg.member === null) {
			return;
		}

		let deepSearch: boolean = false;
		if (args.join(" ").includes("--deep")) {
			args = args.join(" ").replace("--deep", "").trim().split(/ +/);
			deepSearch = true;
		}

		const nameToSearchFor: string = args[0];

		const embed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
			.setColor("RANDOM")
			.setFooter(msg.guild.name);
		if (deepSearch) {
			embed.setTitle("🔍 Deep Search Results");

			const deepSearchRes: IRaidUser[] = await new MongoDbHelper.MongoDbUserManager(nameToSearchFor).getUserDB();
			// this should be the only possibility
			if (deepSearchRes.length === 1) {
				let result: GuildMember | undefined;
				let ignsToSearch: string[] = [deepSearchRes[0].rotmgLowercaseName, ...deepSearchRes[0].otherAccountNames.map(x => x.lowercase)];

				for (const name of ignsToSearch) {
					let serverSearchResult: GuildMember | GuildMember[] = UserHandler.findUserByInGameName(msg.guild, name, guildData);
					if (!Array.isArray(serverSearchResult)) {
						result = serverSearchResult;
						break;
					}
				}
				let desc: string = `**\`${nameToSearchFor}\`** has been found in the database. `;
				if (typeof result !== "undefined") {
					desc += `Additionally, the person you are looking for __is__ in the server.\nMention: ${result}`;

					embed.addField("Discord Nickname", StringUtil.applyCodeBlocks(result.displayName));
					if (result.joinedAt !== null) {
						embed.addField("Joined Server", StringUtil.applyCodeBlocks(DateUtil.getTime(result.joinedAt)));
					}
				}
				else {
					const user: User = await Zero.RaidClient.users.fetch(deepSearchRes[0].discordUserId);
					desc += `The person you are looking for is __not__ in the server.\nResolved Mention: ${user}`
				}

				embed
					.setDescription(desc)
					.addField("Main Account Name", StringUtil.applyCodeBlocks(deepSearchRes[0].rotmgDisplayName))
					.addField("Alternative Account Names", StringUtil.applyCodeBlocks(deepSearchRes[0].otherAccountNames.length === 0 ? "N/A" : deepSearchRes[0].otherAccountNames.map(x => x.displayName).join(", ")))
					.addField("Data Last Altered", StringUtil.applyCodeBlocks(DateUtil.getTime(deepSearchRes[0].lastModified)), true)
					.addField("Linked Discord ID", StringUtil.applyCodeBlocks(deepSearchRes[0].discordUserId), true);
			}
			else {
				embed.setDescription(`Something went wrong with the database results.\nError: ${deepSearchRes.length === 0 ? "No results were found" : "There were more than one results found for that specified user."}`);
			}
		}
		else {
			embed.setTitle("🔍 Find User Result");
			const result: GuildMember | GuildMember[] = UserHandler.findUserByInGameName(msg.guild, nameToSearchFor, guildData);

			if (Array.isArray(result)) {
				if (result.length === 0) {
					embed.setDescription("The user you were looking for could not be found. Ensure you spelled the name right and try again.");
				}
				else {
					embed.setDescription(`The user you were looking for could not be found. Do you mean one of these members?\n${result.join(" ")}`);
				}
			}
			else {
				embed.setDescription(result)
					.addField("Discord Nickname", StringUtil.applyCodeBlocks(result.displayName));
				if (result.joinedAt !== null) {
					embed.addField("Joined Server", StringUtil.applyCodeBlocks(DateUtil.getTime(result.joinedAt)));
				}
			}
		}


		await msg.channel.send(embed).catch(e => { });
	}
}
