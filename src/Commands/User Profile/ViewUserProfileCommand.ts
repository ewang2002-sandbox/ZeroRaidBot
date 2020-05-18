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
                "View Profile Command",
                "userprofile",
                ["viewprofile"],
                "Allows you to view your current profile. If executed in a server, you will see server-specific settings.",
                ["userprofile"],
                ["userprofile"],
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

        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle(`User Profile: ${userDb.rotmgDisplayName}`)
            .setColor("RANDOM");

        const altAccs: string = userDb.otherAccountNames.length === 0
            ? "N/A"
            : userDb.otherAccountNames.map(x => x.displayName).join(", ");
        const descBuilder: StringBuilder = new StringBuilder()
            .append(`⇒ **Main IGN:** ${userDb.rotmgDisplayName}`)
            .appendLine()
            .append(`⇒ **Linked Discord ID:** ${userDb.discordUserId}`)
            .appendLine()
            .append(`⇒ **Alternative Accounts:** ${altAccs}`);


        embed.setDescription(descBuilder.toString())
            .addField("Add Alternative Account", "You can use this command to either add an alternative account to your profile __or__ update your name in case of a name change.\n⇒ Command: `;addaltaccount IGN`\n⇒ Example: `;addaltaccount Testing`")
            .addField("Remove Alternative Account", "You can use this command to remove an alternative account from your profile.\n⇒ Command: `;removealtaccount`\n⇒ Example: `;removealtaccount`")
            .addField("Switch Main & Alternative Accounts", "You can use this account to switch your main account with one of your alternative accounts.\n⇒ Command: `;switchaccount`\n⇒ Example: `;switchaccount`")
            .addField("View Server Profile", "Allows you to view your server statistics, make changes to your profile within the server, and more. Run this command in any server or in DMs.\n⇒ Command: `;serverprofile`\n⇒ Example: `;serverprofile`");
        
        await dmChannel.send(embed);
    }
}