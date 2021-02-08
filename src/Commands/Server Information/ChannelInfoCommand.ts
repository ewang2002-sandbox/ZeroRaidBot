import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildChannel, Guild, MessageEmbed, CategoryChannel, TextChannel, VoiceChannel, NewsChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { DateUtil } from "../../Utility/DateUtil";

export class ChannelInfoCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Channel Information",
                "channelinfo",
                [],
                "Gets details about a channel.",
                ["channelinfo <#Mention | Name | ID>"],
                ["channelinfo #get-verified", "channelinfo 703911436631670805", "channelinfo get-verified"],
                0
            ),
            new CommandPermission(
                [],
                [],
                ["suspended"],
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
        const guild: Guild = msg.guild as Guild;
        // get role
        let channel: GuildChannel | undefined = msg.mentions.channels.first()
            || guild.channels.cache.find(x => x.name === args.join(" ").trim())
            || guild.channels.cache.get(args.join(" ").trim());

        if (typeof channel === "undefined") {
            const embed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "NO_CHANNELS_FOUND", null);
            await msg.channel.send(embed).catch(e => { });
            return;
        }

        const channelBuilder: StringBuilder = new StringBuilder()
            .append(`⇒ Channel Name: \`${channel.name}\``)
            .appendLine()
            .append(`⇒ Channel ID: \`${channel.id}\``)
            .appendLine()
            .append(`⇒ Channel Type: \`${channel.type.toUpperCase()}\``)
            .appendLine()
            .append(`⇒ Members: \`${channel.members.size}\``)
            .appendLine()
            .append(`⇒ Created On: \`${DateUtil.getTime(channel.createdTimestamp)}\``)
            .appendLine();

        const channelEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle(`Channel Information: #${channel.name}`)
            .setDescription(channelBuilder.toString())
            .setTimestamp()
            .setFooter(guild.name)
            .setColor("RANDOM");

        const builder: StringBuilder = new StringBuilder();
        // channel specific time
        // using instanceof for automatic cast
        if (channel instanceof CategoryChannel) {
            builder
                .append(`⇒ Channels: ${channel.children.size}`)
                .appendLine();
        }
        else if (channel instanceof TextChannel || channel instanceof NewsChannel) {
            builder
                .append(`⇒ Mention: ${channel}`)
                .appendLine()
                .append(`⇒ Members: ${channel.members.size}`)
                .appendLine()
                .append(`⇒ Parent: ${channel.parent === null ? "N/A" : channel.parent.name}`)
                .appendLine();

            if (channel instanceof TextChannel) {
                builder
                    .append(`⇒ Slowmode: ${channel.rateLimitPerUser} Seconds`)
                    .appendLine();
            }
            if (channel.topic !== null) {
                builder
                    .append(`⇒ Topic`)
                    .appendLine()
                    .append(`>>> ${channel.topic.length > 920 ? channel.topic.substring(0, 920) : channel.topic}...`)
                    .appendLine();
            }
        }
        else if (channel instanceof VoiceChannel) {
            builder
                .append(`⇒ Members: ${channel.members.size}`)
                .appendLine()
                .append(`⇒ Bitrate: ${channel.bitrate / 1000} KBPs`)
                .appendLine()
                .append(`⇒ VC Limit: ${channel.userLimit === 0 ? "None" : channel.userLimit}`)
                .appendLine()
                .append(`⇒ Parent: ${channel.parent === null ? "N/A" : channel.parent.name}`)
                .appendLine();
        }
        
        channelEmbed.addField("Channel-Specific Properties", builder.toString());
        msg.channel.send(channelEmbed);
    }
}