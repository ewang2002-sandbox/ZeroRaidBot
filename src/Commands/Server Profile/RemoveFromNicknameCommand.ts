import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, DMChannel, Guild, GuildMember, MessageEmbed, User } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { IRaidUser } from "../../Templates/IRaidUser";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { MessageUtil } from "../../Utility/MessageUtil";
import { GuildUtil } from "../../Utility/GuildUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { UserAvailabilityHelper } from "../../Helpers/UserAvailabilityHelper";

export class RemoveFromNicknameCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Remove Name from Server Nickname Command",
                "removenameserver",
                [],
                "Removes one of your registered IGNs from your nickname.",
                ["removenameserver"],
                ["removenameserver"],
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

		UserAvailabilityHelper.InMenuCollection.set(msg.author.id, UserAvailabilityHelper.MenuType.SERVER_PROFILE);
        let guild: Guild;
        if (msg.guild === null) {
            const response: Guild | "CANCEL_CMD" | null = await GuildUtil.getGuild(msg, dmChannel);
            if (response === "CANCEL_CMD") {
				UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
                return;
            }

            if (response === null) {
				MessageUtil.send({ content: "You are unable to use this command because you are not verified in any servers that the bot is in." }, msg.channel);
				UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
                return;
            }

            guild = response;
        }
        else {
            guild = msg.guild;
        }

        // first, get nickname
        const resolvedMember: GuildMember | null = guild.member(msg.author.id);
        if (resolvedMember === null) {
			UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
            return;
        }

        const symbols: string = StringUtil.getSymbolsFromStartOfString(resolvedMember.displayName);
        const names: string[] = resolvedMember.displayName
            .split("|")
            .map(x => x.replace(/[^a-zA-Z0-9]/g, "").trim());

        if (names.length - 1 < 1) { // or i could just do name.length - 1 === 0
            MessageUtil.send({ content: "You only have 1 IGN in your nickname. You will need to add another IGN before you can remove your old one." }, dmChannel, 6000);
			UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
            return;
        }

        let str: string = "";
        for (let i = 0; i < names.length; i++) {
            str += `[${i + 1}] ${names[i]}\n`;
        }

        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("Remove IGN from Nickname Command")
            .setDescription("All your in-game names from your nickname are displayed below. __Type__ the number corresponding to the in-game name you want to remove from your nickname.\n\nNOTE: Make sure you read your server's general and raiding rules before removing your in-game name from your nickname. Staff members will be able to see all your alternative accounts, regardless of whether you have it displayed it or not. And finally, you may be suspended if the account you bring into a raid does NOT correspond to the accounts listed in your nickname.")
            .setColor("RANDOM")
            .setFooter(guild.name)
            .addField("IGNs", StringUtil.applyCodeBlocks(str));

        const num: number | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<number>(
            msg.author,
            { embed: embed },
            2,
            TimeUnit.MINUTE,
            dmChannel
        ).send(GenericMessageCollector.getNumber(msg.author, 1, names.length));

        if (num === "CANCEL_CMD" || num === "TIME_CMD") {
			UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
            return;
        }

        names.splice(num - 1, 1);

        try {
            await resolvedMember.setNickname(`${symbols}${names.join(" | ")}`);
        }
        catch (e) {
            await msg.author.send("Something went wrong when trying to change your nickname in the server. This is most likely due to a permission error.");
        }
		UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
    }
}