import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, DMChannel, Guild, GuildMember, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { IRaidUser } from "../../Templates/IRaidUser";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { MessageUtil } from "../../Utility/MessageUtil";
import { GuildUtil } from "../../Utility/GuildUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";

export class AddToNicknameCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Add Name to Server Nickname Command",
                "addnameserver",
                [],
                "Adds one of your registered IGNs to your nickname.",
                ["addnameserver"],
                ["addnameserver"],
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


        let guild: Guild;
        if (msg.guild === null) {
            const response: Guild | "CANCEL_CMD" | null = await GuildUtil.getGuild(msg, dmChannel);
            if (response === "CANCEL_CMD") {
                return;
            }

            if (response === null) {
                MessageUtil.send({ content: "You are unable to use this command because you are not verified in any servers that the bot is in." }, msg.channel);
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
            return;
        }

        const symbols: string = StringUtil.getSymbolsFromStartOfString(resolvedMember.displayName);
        const names: string[] = resolvedMember.displayName
            .split("|")
            .map(x => x.replace(/[^a-zA-Z0-9]/g, "").trim());

        if (names.length + 1 > 2) {
            MessageUtil.send({ content: "You may only have two IGNs per server. Consider removing one of your IGNs first." }, dmChannel, 6000);
            return;
        }

        const possibleNames: string[] = [];
        let str: string = "";
        let index: number = 0;
        for (const name of names) {
            if (name.toLowerCase() !== userDb.rotmgLowercaseName) {
                possibleNames.push(userDb.rotmgDisplayName);
                str += `[${++index}] ${userDb.rotmgDisplayName}\n`;
            }

            for (const alt of userDb.otherAccountNames) {
                if (alt.lowercase !== name.toLowerCase()) {
                    possibleNames.push(alt.displayName);
                    str += `[${++index}] ${alt.displayName}\n`;
                }
            }
        }

        if (possibleNames.length === 0) {
            MessageUtil.send({ content: "You do not have any linked alternative accounts, or the alternative accounts you have linked are currently in use. To add another alternative account, use this command: `;addaltaccount`." }, dmChannel, 6000);
            return;
        }

        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("Add IGN To Nickname Command")
            .setDescription(`Your current server nickname is: ${StringUtil.applyCodeBlocks(resolvedMember.displayName)}\n\nThe in-game names you can add to your nickname is below. __Type__ the number corresponding to the in-game name you want to add to your nickname.`)
            .setColor("RANDOM")
            .setFooter(guild.name)
            .addField("Available IGNs", StringUtil.applyCodeBlocks(str));

        const num: number | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<number>(
            msg.author,
            { embed: embed },
            2,
            TimeUnit.MINUTE,
            dmChannel
        ).send(GenericMessageCollector.getNumber(msg.author, 1, possibleNames.length));

        if (num === "CANCEL_CMD" || num === "TIME_CMD") {
            return;
        }
        
        const newName: string = `${symbols}${names.join(" | ")} | ${possibleNames[num - 1]}`;
        try {
            await resolvedMember.setNickname(newName);
        }
        catch (e) {
            await msg.author.send("Something went wrong when trying to change your nickname in the server. This is most likely due to a permission error.");
        }
    }
}