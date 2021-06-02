import { GuildMember, Message, MessageAttachment, MessageEmbed, VoiceChannel } from "discord.js";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { PrivateApiDefinitions } from "../../Definitions/PrivateApiDefinitions";
import { RealmSharperWrapper } from "../../Helpers/RealmSharperWrapper";
import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { ArrayUtil } from "../../Utility/ArrayUtil";
import { MessageUtil } from "../../Utility/MessageUtil";
import { StringUtil } from "../../Utility/StringUtil";

export class ParseWhoCommand extends Command {
	public static readonly FOOTER_TEXT: string = "Note: /who parsing is in testing. Please double check and make sure these results are accurate. If something is seriously wrong (completely inaccurate parse results, for example), please message ConsoleMC or Deatttthhh with the offending screenshot and parse results, or use the \"bugreport\" command to report this (note that you may need to upload your screenshot and send the link to your uploaded screenshot).";
	
	public constructor() {
		super(
			new CommandDetail(
				"Parse Who",
				"parsewho",
				["parse"],
				"Parses a cropped /who screenshot.",
				["parsewho <Attachment>"],
				["parsewho"],
				0
			),
			new CommandPermission(
				[],
				["MANAGE_CHANNELS", "ADD_REACTIONS", "EMBED_LINKS"],
				["team"],
				[],
				true
			),
			true,
			false,
			false,
			10
		);
	}

	public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
		if (!(await RealmSharperWrapper.isOnline())) {
			MessageUtil.send({
				embed: MessageUtil.generateBlankEmbed(msg.author, "RED")
					.setTitle("Private API Offline.")
					.setDescription("The Private API, which is responsible for verification and parsing, is currently offline. Try again later.")
			}, msg.channel);
			return;
		}

		const member: GuildMember = msg.member as GuildMember;
		if (member.voice.channel === null) {
			MessageUtil.send({ embed: MessageUtil.generateBuiltInEmbed(msg, "NOT_IN_VC", null) }, msg.channel);
			return;
		}

		if (msg.attachments.size === 0) {
			MessageUtil.send({
				embed: MessageUtil.generateBlankEmbed(msg.author, "RED")
					.setTitle("No Attachments Found.")
					.setDescription("When sending the `parsewho` command, please attach your cropped /who screenshot.")
			}, msg.channel);
			return;
		}

		const firstAttachment: MessageAttachment = msg.attachments.first() as MessageAttachment;
		if (firstAttachment.height === null) {
			MessageUtil.send({
				embed: MessageUtil.generateBlankEmbed(msg.author, "RED")
					.setTitle("No Image Found.")
					.setDescription("You need to send a valid screenshot.")
			}, msg.channel);
			return;
		}
		await msg.react("⌛").catch();

		const vc: VoiceChannel = member.voice.channel;
		const res: PrivateApiDefinitions.IParseWhoResult = await RealmSharperWrapper.parseWhoScreenshot(firstAttachment.url);
		if (res.code !== "SUCCESS") {
			MessageUtil.send({
				embed: MessageUtil.generateBlankEmbed(msg.author, "RED")
					.setTitle("API Error Occurred")
					.setDescription("An error occurred when trying to process the given screenshot.")
					.addField("Error Code", StringUtil.applyCodeBlocks(res.code))
					.addField("Error Reason", StringUtil.applyCodeBlocks(res.issues))
					.setFooter(ParseWhoCommand.FOOTER_TEXT)
			}, msg.channel);
			return;
		}
		
		const parsedNames = res.whoResult;
		if (parsedNames.length === 0) {
			MessageUtil.send({
				embed: MessageUtil.generateBlankEmbed(msg.author, "RED")
					.setTitle("No Names Found.")
					.setDescription("Your /who screenshot does not contain any names. If you believe this is an error, please send the developer the /who screeenshot.")
					.setFooter(ParseWhoCommand.FOOTER_TEXT)
			}, msg.channel);
			return;
		}

		const membersNotInVcInRaid: string[] = [];
		const membersInVcNotInRaid: GuildMember[] = [];
		vc.members.forEach(member => {
			const igns: string[] = member.displayName.split("|")
				.map(x => x.trim().replace(/[^A-Za-z]/g, "").toLowerCase());
			for (const name of parsedNames) {
				if (igns.includes(name.toLowerCase())) {
					return;
				}
			}

			membersInVcNotInRaid.push(member);
		});

		parsedNames.forEach(name => {
			for (const [, member] of vc.members) {
				const igns: string[] = member.displayName.split("|")
					.map(x => x.trim().replace(/[^A-Za-z]/g, "").toLowerCase());
				if (igns.includes(name.toLowerCase())) {
					return;
				}
			}

			membersNotInVcInRaid.push(`/kick ${name}`);
		});

		const descSb: string = new StringBuilder()
			.append(`⇒ **People In VC:** ${vc.members.size}`)
			.appendLine()
			.append(`⇒ **People in /who:** ${parsedNames.length}`)
			.toString();
		const resultEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author, "RANDOM")
			.setTitle(`/who Parse Results: **${vc.name}**`)
			.setDescription(descSb)
			.setFooter(ParseWhoCommand.FOOTER_TEXT);

		const memberNotVcInRaidSplit: string[] = ArrayUtil.arrayToStringFields<string>(
			membersNotInVcInRaid,
			(_, elem) => elem + "\n",
			1000
		);
		for (const elem of memberNotVcInRaidSplit) {
			resultEmbed.addField(`In Raid, Not In VC (${membersNotInVcInRaid.length})`, StringUtil.applyCodeBlocks(elem));
		}

		const memberVcNotRaidSplit: string[] = ArrayUtil.arrayToStringFields<GuildMember>(
			membersInVcNotInRaid,
			(i, elem) => `**\`[${i + 1}]\`** ${elem.displayName} (${elem})\n`,
			1000
		);

		for (const elem of memberVcNotRaidSplit) {
			resultEmbed.addField(`In VC, Not In Raid (${membersInVcNotInRaid.length})`, elem);
		}

		msg.channel.send(resultEmbed).catch(e => { });
	}
}