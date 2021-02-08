import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildMember, TextChannel, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { ModMailHandler } from "../../Helpers/ModMailHandler";
import { MessageUtil } from "../../Utility/MessageUtil";

export class CloseModmailThreadCommand extends Command { 
	public constructor() {
		super(
			new CommandDetail(
				"Close Modmail Thread Command",
				"closemodmailthread",
				["closemodmail", "closemm"],
				"Closes a modmail thread. This command must be used in the channel corresponding to the thread you want to close.",
				["closemodmail"],
				["closemodmail"],
				0
			),
			new CommandPermission(
				[],
				["MANAGE_CHANNELS"],
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
                ModMailHandler.closeModmailThread(
                    msg.channel as TextChannel,
                    modmailThread,
                    guildDb,
                    msg.member as GuildMember
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