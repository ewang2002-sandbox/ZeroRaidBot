import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, ClientUser, User } from "discord.js";
import { UserHandler } from "../../Helpers/UserHandler";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { IRaidBot } from "../../Templates/IRaidBot";

export class BlacklistSuggestionUserCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Blacklist Suggestion User Command",
				"suggestbl",
				[],
				"Allows the bot owner to blacklist users from using the suggestion module.",
				["suggestbl <ID | @Mention>"],
				["suggestbl 12321312313123"],
				1
			),
			new CommandPermission(
				[],
				[],
				[],
				[],
				false
			),
			false,
			false,
			true,
			5
		);
	}

	public async executeCommand(
		msg: Message,
		args: string[]
	): Promise<void> {
		const personToSuggestBl: User | null = await UserHandler.resolveUserNoGuild(args[0]);
		if (personToSuggestBl === null) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_USER_FOUND_GENERAL", null), msg.channel);
			return;
		}

		if (personToSuggestBl.id === msg.author.id) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "SAME_PERSON_AS_AUTHOR", null), msg.channel);
			return;
		}

		let botDb: IRaidBot = await MongoDbHelper.MongoBotSettingsClient
			.findOne({ botId: (msg.client.user as ClientUser).id }) as IRaidBot;

		if (typeof botDb.dev === "undefined") {
			botDb = (await MongoDbHelper.MongoBotSettingsClient.findOneAndUpdate({ botId: (msg.client.user as ClientUser).id }, {
				$set: {
					dev: {
						isEnabled: true,
						bugs: [],
						feedback: [],
						blacklisted: []
					}
				}
			}, { returnOriginal: false })).value as IRaidBot;
		}


		if (botDb.dev.blacklisted.findIndex(x => x === personToSuggestBl.id) !== -1) {
			await MessageUtil.send(MessageUtil.generateBlankEmbed(msg.author).setTitle("Already Blacklisted From Suggestions").setDescription(`${personToSuggestBl} is already blacklisted from using the bot suggestions feature.`), msg.channel);
			return;
		}

		await MongoDbHelper.MongoBotSettingsClient.updateOne({ botId: (msg.client.user as ClientUser).id }, {
			$push: {
				"dev.blacklisted": personToSuggestBl.id
			}
		});

		MessageUtil.send({ content: `${personToSuggestBl} has been blacklisted from submitting suggestions successfully.` }, msg.channel);
	}
}