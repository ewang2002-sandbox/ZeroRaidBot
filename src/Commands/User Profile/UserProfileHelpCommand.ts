import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { StringBuilder } from "../../Classes/String/StringBuilder";

export class UserProfileHelpCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "User Profile Help Command",
                "uphelp",
                ["helpup"],
                "Allows you to view all user profile commands and an explanation of each command.",
                ["uphelp"],
                ["uphelp"],
                0
            ),
            new CommandPermission(
                [],
                [],
                ["suspended"],
                [],
                true
            ),
            false, // guild-only command. 
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
        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("User Profile Help Command")
            .setFooter("User Profile Command")
            .setColor("RANDOM");
        const sb: StringBuilder = new StringBuilder()
            .append("⇒ Add Alternative Account")
            .appendLine()
            .append("You can use this command to either add an alternative account to your profile __or__ update your name in case of a name change.\n⇒ Command: `;addaltaccount`")
            .appendLine()
            .appendLine()
            .append("⇒ Remove Alternative Account")
            .appendLine()
            .append("This command is currently not available. Please contact an administrator for assistance.")
            .appendLine()
            .appendLine()
            .append("⇒ Switch Main & Alternative Accounts")
            .appendLine()
            .append("You can use this account to switch your main account with one of your alternative accounts.\n⇒ Command: `;switchaccount`")
            .appendLine()
            .appendLine()
            .append("⇒ View Server Profile")
            .appendLine()
            .append("Allows you to view your server statistics, make changes to your profile within the server, and more. Run this command in any server or in DMs.\n⇒ Command: `;serverprofile`");
        embed.setDescription(sb.toString());
        await msg.author.send(embed).catch(e => { });
    }
}