import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, ClientUser, Client } from "discord.js";
import { IRaidBot } from "../../Templates/IRaidBot";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";

export class BugReportCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Bug Report Command",
                "bugreport",
                [],
                "Lets you report a bug to the developers.",
                ["bugreport"],
                ["bugreport"],
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
        args: string[]
    ): Promise<void> {
		const botDb: IRaidBot = await MongoDbHelper.MongoBotSettingsClient
			.findOne({ botId: (msg.client.user as ClientUser).id }) as IRaidBot;
		
	}
}