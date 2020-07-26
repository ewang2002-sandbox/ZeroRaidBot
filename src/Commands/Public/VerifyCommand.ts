import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildMember, Guild } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { VerificationHandler } from "../../Helpers/VerificationHandler";
import { GuildUtil } from "../../Utility/GuildUtil";

export class VerifyCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Verify",
                "verify",
                [],
                "The verification command. Use this command if you didn't set up the verification embed. This can only be used to verify the person in the main section.",
                ["verify"],
                ["verify"],
                0
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
            false
        );
    }

	public async executeCommand(message: Message, args: string[], guildData: IRaidGuild): Promise<void> {
		VerificationHandler.verifyUser(message.member as GuildMember, message.guild as Guild, guildData, GuildUtil.getDefaultSection(guildData));
	}
}