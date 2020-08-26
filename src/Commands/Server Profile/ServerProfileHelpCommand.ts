import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, DMChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { StringBuilder } from "../../Classes/String/StringBuilder";

export class ServerProfileHelpCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Server Profile Commands",
                "sphelp",
                ["helpsp"],
                "Allows you to view all server profile commands and an explanation of each command.",
                ["sphelp"],
                ["sphelp"],
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
        let dmChannel: DMChannel;
        try {
            dmChannel = await msg.author.createDM();
        }
        catch (e) {
            await msg.channel.send(`${msg.member}, I cannot DM you. Please make sure your privacy settings are set so anyone can send messages to you.`).catch(() => { });
            return;
        }
        
        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("Server Profile Help Command")
            .setFooter("Server Profile Command")
            .setColor("RANDOM");
        const commandSB: StringBuilder = new StringBuilder()
            .append("⇒ Manage Profile")
            .appendLine()
            .append("To manage your profile (including the ability to add an alternative account IGN to your profile so you can use it in any server or remove an alternative account IGN), run the `;userprofile` command.")
            .appendLine()
            .appendLine()
            .append("⇒ Add Name To Display")
            .appendLine()
            .append("To add a linked alternative account IGN to your server nickname, use the `;addnameserver` command.")
            .appendLine()
            .appendLine()
            .append("⇒ Remove Name From Display")
            .appendLine()
            .append("To remove an alternative account IGN from your server nickname, use the `;removenameserver` command.")
            .appendLine()
            .appendLine()
            .append("⇒ Unverify From Server")
            .appendLine()
            .append("To unverify yourself from this server, use the `;serverunverify` command. You will no longer be able to manage your server profile for this server and your nickname will be reset.");
        embed.setDescription(commandSB.toString());
        await dmChannel.send(embed).catch(e => { });
    }
}