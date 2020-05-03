import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, ClientUser, MessageEmbed, Guild, Role } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { IRaidBot } from "../../Templates/IRaidBot";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { INetworkBlacklistedUser, IBlacklistedUser } from "../../Definitions/IBlacklistedUser";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { IRaidUser } from "../../Templates/IRaidUser";
import { DateUtil } from "../../Utility/DateUtil";

export class CheckBlacklistCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Check Blacklist.",
				"checkblacklist",
				["cbl", "sbl", "scanblacklist"],
				"Checks the server's blacklist for a target user.",
				["checkblacklist <Name>"],
				["checkblacklist ConsoleMC"],
				1
			),
			new CommandPermission(
				[],
				["EMBED_LINKS"],
				["support"],
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
		const guild: Guild = msg.guild as Guild;

		const personToLookFor: string = args[0].toLowerCase();
		const botDb: IRaidBot | null = await MongoDbHelper.MongoBotSettingsClient.findOne({
			botId: (msg.client.user as ClientUser).id
		});
		const userDb: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.MongoUserClient.findOne({
			$or: [
				{
					rotmgLowercaseName: personToLookFor
				},
				{
					"otherAccountNames.lowercase": personToLookFor
				}
			]
		});

		const allNamesToSearch: string[] = [];
		if (userDb === null) {
			allNamesToSearch.push(personToLookFor);
		}
		else {
			allNamesToSearch.push(...[userDb.rotmgLowercaseName, ...userDb.otherAccountNames.map(x => x.lowercase)]);
		}

		// check network blacklists
		let networkBlacklistEntry: INetworkBlacklistedUser | undefined;
		if (botDb !== null) {
			for (const entry of botDb.moderation.networkBlacklisted) {
				for (const allNames of allNamesToSearch) {
					if (entry.inGameName.toLowerCase() === allNames) {
						networkBlacklistEntry = entry;
					}
				}
			}
		}
		// check server blacklists
		let serverBlacklistEntry: IBlacklistedUser | undefined;
		for (const entry of guildData.moderation.blacklistedUsers) {
			for (const allNames of allNamesToSearch) {
				if (entry.inGameName.toLowerCase() === allNames) {
					serverBlacklistEntry = entry;
				}
			}
		}

		const embed: MessageEmbed = new MessageEmbed()
			.setAuthor(guild.name, typeof guild.iconURL() === "undefined" ? undefined : guild.iconURL() as string)
			.setColor("RED")
			.setTitle(`Blacklist Search: ${args[0]}`);
		const sb: StringBuilder = new StringBuilder()
			.append(`Found in Database: ${userDb === null ? "No" : "Yes"}`)
			.appendLine()
			.append(`Checked Names: ${allNamesToSearch.join(", ")}`)
			.appendLine()
			.appendLine();

		if (typeof networkBlacklistEntry !== "undefined") {
			sb.append("Network Blacklisted: Yes")
				.appendLine()
				.append(`⇒ Blacklisted Name: ${networkBlacklistEntry.inGameName}`)
				.appendLine()
				.append(`⇒ Reason: ${networkBlacklistEntry.reason}`)
				.appendLine()
				.append(`⇒ Date: ${DateUtil.getTime(networkBlacklistEntry.date)}`)
				.appendLine()
				.append(`⇒ Moderator: ${networkBlacklistEntry.moderator}`)
				.appendLine()
				.appendLine();
		}
		else {
			sb.append("Network Blacklisted: No")
				.appendLine()
				.appendLine();
		}

		if (typeof serverBlacklistEntry !== "undefined") {
			sb.append("Server Blacklisted: Yes")
				.appendLine()
				.append(`⇒ Blacklisted Name: ${serverBlacklistEntry.inGameName}`)
				.appendLine()
				.append(`⇒ Reason: ${serverBlacklistEntry.reason}`)
				.appendLine()
				.append(`⇒ Date: ${DateUtil.getTime(serverBlacklistEntry.date)}`)
				.appendLine()
				.append(`⇒ Moderator: ${serverBlacklistEntry.moderator}`)
				.appendLine()
				.appendLine();
		}
		else {
			sb.append("Server Blacklisted: No")
				.appendLine()
				.appendLine();
		}

		embed.setDescription(sb.toString());
		await msg.channel.send(embed).catch(e => { });
	}
}