import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Command } from "../../Templates/Command/Command";
import { Message, Guild, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { GameHandler } from "../../Helpers/GameHandler";

export class StartGameAfkCheckCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Start Game AFK Check",
				"startgameafk",
				["startgameafkcheck", "sgac", "gac", "gafk"],
				"Starts a game AFK check.",
				["startgameafk [Message]"],
				["startgameafk Invite code is: 12345"],
				0
			),
			new CommandPermission(
				[],
				["MANAGE_CHANNELS", "ADD_REACTIONS", "EMBED_LINKS"],
				["headRaidLeader", "moderator", "officer", "support", "trialLeader", "universalAlmostRaidLeader", "universalRaidLeader", "verifier"],
				["ALL_RLS"],
				false
			),
			true,
			false,
			false,
			0
		);
	}

	public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
		let location: string;
		if (args.length === 0) {
			const m: MessageEmbed = new MessageEmbed()
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.setTitle("Configure Message")
				.setDescription("You need to set a message to host this gaming event! This message will be DMed to all members in the voice channel after the AFK check is over. To cancel this process, type `-cancel`. You have 3 minutes.")
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
		GameHandler.startGameAfkCheck(msg, guildData, msg.guild as Guild, location);
	}
}