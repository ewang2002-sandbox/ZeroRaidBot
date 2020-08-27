import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildMember, TextChannel, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { ModMailHandler } from "../../Helpers/ModMailHandler";
import { MessageUtil } from "../../Utility/MessageUtil";

export class ReplyModmailThreadCommand extends Command { 
	public constructor() {
		super(
			new CommandDetail(
				"Reply to Modmail Thread Command",
				"replymodmailthread",
				["replymodmail", "replymm"],
				"Replies to a modmail thread. This command must be used in the channel corresponding to the thread you want to close.",
				["replymodmailthread"],
				["replymodmailthread"],
				0
			),
			new CommandPermission(
				[],
				[],
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
		for (const modmailThread of guildDb.properties.modMail) {
            if (modmailThread.channel === msg.channel.id) {
                ModMailHandler.respondToThreadModmail(
                    modmailThread,
					msg.member as GuildMember,
					guildDb,
                    msg.channel as TextChannel
                );
                return;
            }
        }

        const noChanEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author, "RED")
            .setTitle("No Modmail Thread Found")
            .setDescription("There is no modmail thread corresponding to this channel. Run this command in any modmail thread channels.")
            .setFooter("No Thread Found");
        MessageUtil.send({ embed: noChanEmbed }, msg.channel);
    }
}