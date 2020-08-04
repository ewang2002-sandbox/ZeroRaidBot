import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Command } from "../../Templates/Command/Command";
import { Message, Guild, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { RaidHandler } from "../../Helpers/RaidHandler";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";

export class StartAfkCheckCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Start AFK Check",
				"startafk",
				["startafkcheck", "sac", "ac", "afk"],
				"Starts an AFK check.",
				["startafk [Location]"],
				["startafk ussw left"],
				0
			),
			new CommandPermission(
				[],
				["MANAGE_CHANNELS", "ADD_REACTIONS", "EMBED_LINKS"],
				["headRaidLeader", "universalRaidLeader", "universalAlmostRaidLeader"],
				["ALL_RLS"],
				false
			),
			true,
			false,
			false
		);
	}

	public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
		let location: string;
		if (args.length === 0) {
			const m: MessageEmbed = new MessageEmbed()
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.setTitle("Configure Raid Location")
				.setDescription("You need to find a location to host this raid! Find a location where you want to host this raid, and then respond with your location here to advance to the next step. To cancel this process, type `-cancel`. You have 3 minutes.")
				.setColor("RANDOM")
				.setFooter("Raid Management");
			location = await new GenericMessageCollector<string>(
				msg,
				{ embed: m },
				3,
				TimeUnit.MINUTE
			).send(GenericMessageCollector.getStringPrompt(msg.channel), "-cancel");

			if (location === "CANCEL_CMD" || location === "TIME_CMD") {
				return;
			}
		}
		else {
			location = args.join(" ");
		}
		RaidHandler.startAfkCheck(msg, guildData, msg.guild as Guild, location);
	}
}