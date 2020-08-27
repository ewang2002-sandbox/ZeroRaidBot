import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildMember, Guild } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { ModMailHandler } from "../../Helpers/ModMailHandler";
import { UserHandler } from "../../Helpers/UserHandler";
import { MessageUtil } from "../../Utility/MessageUtil";

export class StartModmailThreadCommand extends Command { 
	public constructor() {
		super(
			new CommandDetail(
				"Start Modmail Thread Command",
				"startmodmailthread",
				["startmodmail", "startmm"],
				"Starts a modmail thread with someone; if the person already has an active thread, you will be pinged.",
				["startmodmailthread <IGN> [Message]"],
				["startmodmailthread SomeBadBoi", "startmodmailthread I need to talk about something."],
				1
			),
			new CommandPermission(
				[],
				["EMBED_LINKS"],
				["officer", "moderator", "headRaidLeader", "support", "verifier"],
				[],
				false
			),
			true,
			false,
			false,
			5
		);
    }
    
    public async executeCommand(msg: Message, args: string[], guildDb: IRaidGuild): Promise<void> {
		const guild: Guild = msg.guild as Guild;
		let target: GuildMember | null = await UserHandler.resolveMemberWithStr(args.shift() as string, guild, guildDb);

		if (target === null) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_MEMBER_FOUND", null), msg.channel);
			return;
		}

		if (target.id === msg.author.id) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "SAME_PERSON_AS_AUTHOR", null), msg.channel);
			return;
        }
        
        if (args.length === 0) {
            ModMailHandler.startThreadedModmailWithMember(target, msg.member as GuildMember, guildDb);
        }
        else {
            ModMailHandler.startThreadedModmailWithMember(target, msg.member as GuildMember, guildDb, args.join(" "));
        }
    }
}