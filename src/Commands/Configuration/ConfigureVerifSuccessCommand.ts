import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, Guild } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { StringUtil } from "../../Utility/StringUtil";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";

export class ConfigureVerifSuccessCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Configure Verification Success Command",
                "configverifsuccessmsg",
                ["configverificationsuccessmessage", "configverifmsg"],
                "Allows you to change the verification success message.",
                ["configverifsuccessmsg [--view]"],
                ["configverifsuccessmsg", "configverifsuccessmsg --view"],
                0
            ),
            new CommandPermission(
                ["MANAGE_GUILD"],
                [],
                ["moderator"],
                [],
                true
            ),
            true, // guild-only command. 
            false,
            false
        );
    }

    public async executeCommand(
        msg: Message,
        args: string[],
        guildDb: IRaidGuild
    ): Promise<void> {
        const guild: Guild = msg.guild as Guild;
        if (args.includes("--view")) {
            const descEmbed: MessageEmbed = new MessageEmbed()
                .setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
                .setDescription(guildDb.properties.successfulVerificationMessage.length === 0 ? "N/A" : guildDb.properties.successfulVerificationMessage)
                .setColor("RANDOM")
                .setFooter(guildDb.properties.successfulVerificationMessage.length === 0 ? "No Configured Message" : `${guildDb.properties.successfulVerificationMessage.length}/1800 Characters.`);
            msg.channel.send(descEmbed).catch(() => { });
            return;
        }

        const desc: string = guildDb.properties.successfulVerificationMessage.length === 0
            ? "You have not configured any successful verification message."
            : `Your current successful verification message is below.\n${StringUtil.applyCodeBlocks(guildDb.properties.successfulVerificationMessage)}`;
        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setColor("RANDOM")
            .setTitle("Configure Verification Success Message")
            .setDescription(desc)
            .addField("Prompt", "Type the message that you want members that successfully verify to see. This can contain information like important channels, rules, and more. Maximum 1800 characters. To cancel this process, type `-cancel`.")
            .setFooter("The process will automatically stop at")
            .setTimestamp(new Date().getTime() + 600000);
        const newDesc: string | "CANCEL" | "TIME" = await new GenericMessageCollector<string>(
            msg,
            { embed: embed },
            10,
            TimeUnit.MINUTE
        ).send(GenericMessageCollector.getStringPrompt(msg.channel, { maxCharacters: 1800 }), "-cancel");

        if (newDesc === "CANCEL" || newDesc === "TIME") {
            return;
        }

        await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
            $set: {
                "properties.successfulVerificationMessage": newDesc
            }
        });
    }
}