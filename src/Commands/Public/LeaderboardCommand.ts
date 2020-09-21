import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";

export class LeaderboardCommand extends Command {

    public constructor() {
        super(
            new CommandDetail(
                "Leaderboard Command",
                "leaderboard",
                [],
                "Lets you add or removes games to/from the database, either on a server or global level.",
                ["leaderboard [leaders | keys | runes | runs]"],
                ["leaderboard keys"],
                1
            ),
            new CommandPermission(
                [],
                [],
                [],
                [],
                true
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
        const argType: string = args[0];
        
    }
}