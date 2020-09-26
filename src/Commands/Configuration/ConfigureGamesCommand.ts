import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";

export class ConfigureGameCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Configure Games Commands",
                "configuregames",
                ["configgames"],
                "Lets you add or removes games to/from the database, either on a server or global level.",
                ["configuregames"],
                ["configuregames"],
                0
            ),
            new CommandPermission(
                ["ADMINISTRATOR"],
                [],
                [],
                [],
                false
            ),
            true, // guild-only command. 
            false,
            false,
            0
        );
    }

    public async executeCommand(
        msg: Message,
        args: string[],
        guildDb: IRaidGuild
    ): Promise<void> {
        
    }
}