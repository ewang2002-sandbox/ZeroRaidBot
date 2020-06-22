import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";

export class ConfigureBotSettings extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Configure Bot Settings",
                "configbotsettings",
                [],
                "Restarts the MongoDB connection. Run this in direct messages!",
                ["reconnectdb"],
                ["reconnectdb"],
                0
            ),
            new CommandPermission(
                [],
                [],
                [],
                [],
                false
            ),
            false, // guild-only command. 
            false,
            true
        );
    }

    public async executeCommand(
        msg: Message,
        args: string[],
        guildDb: IRaidGuild
    ): Promise<void> {


    }
}