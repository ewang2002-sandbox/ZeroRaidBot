import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, TextChannel, MessageEmbed, GuildMember } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { ArrayUtil } from "../../Utility/ArrayUtil";
import { StringUtil } from "../../Utility/StringUtil";

export class PollCommand extends Command {

    private readonly reactions: string[][] = [
		//#region emojis
		[
			"1⃣",
			"2⃣",
			"3⃣",
			"4⃣",
			"5⃣",
			"6⃣",
			"7⃣",
			"8⃣",
			"9⃣",
			"🔟",
			"🇦",
			"🇧",
			"🇨",
			"🇩",
			"🇪",
			"🇫",
			"🇬",
			"🇭",
			"🇮",
			"🇯"
		],
		[
			"🍇",
			"🍈",
			"🍉",
			"🍊",
			"🍋",
			"🍌",
			"🍍",
			"🥭",
			"🍎",
			"🍏",
			"🍐",
			"🍑",
			"🍒",
			"🍓",
			"🥝",
			"🍅",
			"🥥",
			"🥑",
			"🍆",
			"🥔",
			"🥕",
			"🌽",
			"🌶️",
			"🥒",
			"🥬",
			"🥦",
			"🧄",
			"🧅",
			"🍄",
			"🥜",
			"🌰",
			"🍞",
			"🥐",
			"🥖",
			"🥨",
			"🥯",
			"🥞",
			"🧇",
			"🧀",
			"🍖",
			"🍗",
			"🥩",
			"🥓",
			"🍔",
			"🍟",
			"🍕",
			"🌭",
			"🥪",
			"🌮",
			"🌯",
			"🥙",
			"🧆",
			"🍳",
			"🥘",
			"🍲",
			"🥗",
			"🍿",
			"🍘",
			"🍙",
			"🍚",
			"🍛",
			"🍜",
			"🍝",
			"🍠",
			"🍣",
			"🥮",
			"🍡",
			"🥟",
			"🥠",
			"🦪",
			"🍦",
			"🍧",
			"🍨",
			"🍩",
			"🍪",
			"🎂",
			"🍰",
			"🧁",
			"🥧",
			"🍫",
			"🍬",
			"🍭",
			"🍮",
			"🍯",
			"🥛",
			"☕",
			"🍵",
			"🍺",
			"🍻",
			"🧊"
		]
		//#endregion
    ];
    
	public constructor() {
		super(
			new CommandDetail(
				"Poll",
				"poll",
				[],
				"A simple poll command.",
				["poll <Question>; <Choice 1>; <Choice 2>; ...; [Choice 20]", "poll <Question>"],
				["poll Who is `@calcytakeit`?; Dakota; Edward; Huy; Some random stranger.", "poll Does Dakota Suck?"],
				1
			),
			new CommandPermission(
				[],
				["support"],
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
	public async executeCommand(
		msg: Message,
		args: string[],
		guildDb: IRaidGuild
	): Promise<void> {
		// any choices
		console.log(args);
		args = args.join(" ").split(/;+/).map(x => x.trim()).filter(y => y.length !== 0);
		if (args.length === 0) {
			return; // do i really want to make an error msg? 
		}
		console.log("S");

		const pollEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor((`${(msg.member as GuildMember).displayName} • ${msg.author.tag}`), msg.author.displayAvatarURL())
			.setColor("RANDOM")
			.setFooter("Zero")
			.setTimestamp();

		// yes/no/maybe choices
		if (args.length === 1) {
			pollEmbed.setDescription(`📊 ${args.join(" ")}`)

			const m: Message | void = await msg.channel.send(pollEmbed).catch(e => console.error(e));
			if (typeof m === "undefined") {
				return;
			}

			await m.react("⬇️").catch(e => { });
			await m.react("↔️").catch(e => { });
			await m.react("⬆️").catch(e => { });
			return;
		}

		if (args.length >= 22) {
			const embed: MessageEmbed = new MessageEmbed()
				.setTitle("Too Many Choices!")
				.setDescription("You can only have 1 question and 20 choices.")
				.setAuthor(`${(msg.member as GuildMember).displayName} • ${msg.author.tag}`, msg.author.displayAvatarURL())
				.setColor("RANDOM")
				.setFooter("Zero")
				.setTimestamp();
			MessageUtil.send(embed, msg.channel as TextChannel).catch(e => { });
			return;
		}

		// custom choices
		pollEmbed.setDescription(`📊 ${args.shift()}`);
		let toReactWith: string[] = [];
		let selectedReaction: string[] = ArrayUtil.getRandomElement<string[]>(this.reactions);
		if (selectedReaction.includes("🍎")) {
			selectedReaction = ArrayUtil.shuffle(selectedReaction);
		}
		for (let i = 0; i < args.length; i++) {
			if (args[i].length > 1000) {
				MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "MSG_TOO_LONG", null, "poll option", "1000"), msg.channel as TextChannel);
				return;
			}
			pollEmbed.addField(`Choice ${selectedReaction[i]}`, StringUtil.applyCodeBlocks(args[i]), true);
			toReactWith.push(selectedReaction[i]);
		}
		const pollMsg: Message | void = await msg.channel.send(pollEmbed).catch(e => { });
		if (typeof pollMsg === "undefined") {
			return;
		}
		for await (const reaction of toReactWith) {
			await pollMsg.react(reaction).catch(e => { });
		}
	} // end
}