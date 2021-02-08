import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { StringUtil } from "../../Utility/StringUtil";
import { Zero } from "../../Zero";

export class PingCommand extends Command {
	private static readonly pingTimes: number[] = [];
    private static readonly apiTimes: number[] = [];
    
    public constructor() {
        super(
            new CommandDetail(
                "Ping",
                "ping",
                [],
                "A simple ping command.",
                ["ping"],
                ["ping"],
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
            false,
            0
        );
    }

    public async executeCommand(
        msg: Message,
        args: string[],
        guildDb: IRaidGuild
    ): Promise<void> {
		const msgEmbed: MessageEmbed = new MessageEmbed()
			.setColor("RED")
			.setDescription("🏓 Pinging.")
			.setFooter(msg.guild !== null ? msg.guild.name : "Zero");

		const sentMessage: Message = await msg.channel.send(msgEmbed);

		PingCommand.pingTimes.push(sentMessage.createdTimestamp - msg.createdTimestamp);
		PingCommand.apiTimes.push(Zero.RaidClient.ws.ping);

		const resultEmbed: MessageEmbed = new MessageEmbed()
            .setColor("GREEN")
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("**Ping Results**")
			.setDescription("🏓 Pong!")
			.addField("Latency", StringUtil.applyCodeBlocks(`${(sentMessage.createdTimestamp - msg.createdTimestamp).toFixed(2)} MS.`), true)
            .addField("WebSocket/API Ping", StringUtil.applyCodeBlocks(`${(Zero.RaidClient.ws.ping).toFixed(2)} MS`), true)
            .addField("Average Latency", StringUtil.applyCodeBlocks(`${PingCommand.pingTimes.reduce((x, y) => x + y) / PingCommand.pingTimes.length} MS.`), true)
            .addField("Average Websocket/API Ping", StringUtil.applyCodeBlocks(`${PingCommand.apiTimes.reduce((x, y) => x + y) / PingCommand.pingTimes.length} MS.`), true)
			.setFooter(msg.guild !== null ? msg.guild.name : "Zero");
		sentMessage.edit(resultEmbed);
    }
}