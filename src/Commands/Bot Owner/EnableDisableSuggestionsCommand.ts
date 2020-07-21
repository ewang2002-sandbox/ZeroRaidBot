import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, ClientUser, User } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { UserHandler } from "../../Helpers/UserHandler";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { IRaidBot } from "../../Templates/IRaidBot";

export class EnableDisableSuggestionsCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Enable or Disable Suggestions",
				"switchsuggestions",
				[],
				"Allows you to enable or disable the suggestions module.",
				["switchsuggestions"],
				["switchsuggestions"],
				0
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
			true
		);
	}

	public async executeCommand(
		msg: Message,
		args: string[],
		guildDb: IRaidGuild
	): Promise<void> {
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

		await MongoDbHelper.MongoBotSettingsClient.updateOne({ botId: (msg.client.user as ClientUser).id }, {
			$set: {
				"dev.isEnabled": !botDb.dev.isEnabled
			}
		});

		await msg.react("✅").catch(e => { });
		await msg.react(!botDb.dev.isEnabled ? "🟢" : "🔴").catch(e => { });
	}
}