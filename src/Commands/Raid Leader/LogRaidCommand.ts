import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, DMChannel, MessageEmbed, MessageCollector, TextChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";

export class LogRaidCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Log Raid Runs",
				"logruns",
				["logrun"],
				"Logs runs.",
				["logruns"],
				["logruns"],
				0
			),
			new CommandPermission(
				[],
				["EMBED_LINKS"],
				["trialRaidLeader"],
				true
			),
			true, // guild-only command. 
			false,
			false
		);
	}

	/**
	 * @inheritdoc
	 */
	public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
        let dmChannel: DMChannel;
        try {
            dmChannel = await msg.author.createDM();
        }
        catch (e) {
            MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DM_NOT_OPEN", null), msg.channel).catch(e => { });
            return;
        }

        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("Logging Runs")
            .setColor("GREEN")
            .setDescription("Type the amount of runs you did. Please be honest; failure to be honest will result in demotion.")
            .setFooter("Log Raids Command")
            .setTimestamp();
        const botMsg: Message = await dmChannel.send(embed);

        const resp: number | "TIME" | "CANCEL" = await new GenericMessageCollector<number>(
            msg.author, 
            { embed: embed }, 
            2, 
            TimeUnit.MINUTE, 
            dmChannel
        ).send(GenericMessageCollector.getNumber(msg, dmChannel, 1));

    }
}