import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, DMChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { IRaidUser } from "../../Templates/IRaidUser";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { MessageUtil } from "../../Utility/MessageUtil";

export class ViewUserProfileCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "View User Profile Command",
                "userprofile",
                ["viewuserprofile"],
                "Allows you to view your current profile.",
                ["userprofile"],
                ["userprofile"],
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
            false
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

        const userDb: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.getUserDbByDiscordId(msg.author.id);
        if (userDb === null) {
            MessageUtil.send({ content: "You do not have a profile registered with the bot. Please contact an administrator or try again later." }, dmChannel, 1 * 60 * 1000);
            return;
        }

        const altAccs: string = userDb.otherAccountNames.length === 0
            ? "N/A"
            : userDb.otherAccountNames.map(x => x.displayName).join(", ");
        const descBuilder: StringBuilder = new StringBuilder()
            .append(`⇒ **Main IGN:** ${userDb.rotmgDisplayName}`)
            .appendLine()
            .append(`⇒ **Linked Discord ID:** ${userDb.discordUserId}`)
            .appendLine()
            .append(`⇒ **Alternative Accounts:** ${altAccs}`)
            .appendLine()
            .appendLine()
            .append("To see all available user profile commands, run the `;uphelp` command. To view your profile for a specific server, run the `;serverprofile` command.");


        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle(`User Profile: ${userDb.rotmgDisplayName}`)
            .setFooter("User Profile Command")
            .setDescription(descBuilder.toString())
            .setColor("RANDOM");
        await dmChannel.send(embed);
    }
}