import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, DMChannel, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { IRaidUser } from "../../Templates/IRaidUser";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { MessageUtil } from "../../Utility/MessageUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { UserAvailabilityHelper } from "../../Helpers/UserAvailabilityHelper";

export class SwitchMainAltAccountCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Switch Main & Alt Accounts",
                "switchaccount",
                ["switchaccounts"],
                "Allows you to switch your main account with one of your alternative accounts.",
                ["switchaccount"],
                ["switchaccount"],
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

        if (userDb.otherAccountNames.length === 0) {
            MessageUtil.send({ content: "You do not have any alternative accounts logged with the bot. To add an alternative account, simply use the `;addaltaccount` command." }, dmChannel);
            return;
        }

		UserAvailabilityHelper.InMenuCollection.set(msg.author.id, UserAvailabilityHelper.MenuType.USER_PROFILE);

        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("**Switch Main & Alternative Accounts**")
            .setColor("RANDOM")
            .setFooter("User Profile Configuration Command")
            .setDescription(`Your designated main account is: **\`${userDb.rotmgDisplayName}\`**\n\nType the number corresponding to the name you want to make the new main account IGN.`);
        let str: string = "";
        let indexOfField: number = 0;
        for (let i = 0; i < userDb.otherAccountNames.length; i++) {
            const displayStr: string = `[${i + 1}] ${userDb.otherAccountNames[i].displayName}\n`;
            if (str.length + displayStr.length > 1000) {
                embed.addField(`Alternative Acccounts Part ${++indexOfField}`, StringUtil.applyCodeBlocks(str));
                str = displayStr;
            }
            else {
                str += displayStr;
            }
        }

        if (str.length !== 0) {
            embed.addField(`Alternative Accounts`, StringUtil.applyCodeBlocks(str));
        }

        const num: number | "TIME_CMD" | "CANCEL_CMD" = await new GenericMessageCollector<number>(
            msg.author,
            { embed: embed },
            2,
            TimeUnit.MINUTE,
            dmChannel
        ).send(GenericMessageCollector.getNumber(dmChannel, 1, userDb.otherAccountNames.length));

        if (num === "CANCEL_CMD" || num === "TIME_CMD") {
			UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
            return;
        }

        const nameToSwitchWith: string = userDb.otherAccountNames[num - 1].displayName;
        
        await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne({ discordUserId: msg.author.id, "otherAccountNames.lowercase": nameToSwitchWith.toLowerCase() }, {
            $set: {
                rotmgDisplayName: nameToSwitchWith,
                rotmgLowercaseName: nameToSwitchWith.toLowerCase(),
                "otherAccountNames.$.lowercase": userDb.rotmgLowercaseName,
                "otherAccountNames.$.displayName": userDb.rotmgDisplayName
            }
		});
		UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
    }
}