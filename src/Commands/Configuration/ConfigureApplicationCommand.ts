import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, EmojiResolvable, GuildEmoji, ReactionEmoji, Emoji, Guild, GuildChannel, Role } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { FastReactionMenuManager } from "../../Classes/Reaction/FastReactionMenuManager";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { setTimeout } from "timers";
import { ISection } from "../../Templates/ISection";
import { GuildUtil } from "../../Utility/GuildUtil";
import { IApplication } from "../../Definitions/IApplication";

export class ConfigureApplicationCommand extends Command {

	private readonly _emojiToReaction: EmojiResolvable[] = [
		"1⃣", // main
		"2⃣",
		"3⃣",
		"4⃣",
		"5⃣",
		"6⃣",
		"7⃣",
		"8⃣",
		"9⃣", // 8th section
		"🔟"
	];

	public constructor() {
		super(
			new CommandDetail(
				"Configure Leader Application Command",
				"configleaderapps",
				["configapps", "configapp"],
				"Configures the leader application system.",
				["configleaderapps"],
				["configleaderapps"],
				0
			),
			new CommandPermission(
				["BAN_MEMBERS"],
				["EMBED_LINKS"],
				["officer", "moderator", "headRaidLeader"],
				[],
				false
			),
			true,
			false,
			false
		);
	}

	// TODO only accept ign
	public async executeCommand(
		msg: Message,
		args: string[],
		guildDb: IRaidGuild
	): Promise<void> {
		this.mainMenu(msg, guildDb);
	}

	public async mainMenu(msg: Message, guildDb: IRaidGuild, botMsg?: Message): Promise<void> {
		if (typeof botMsg !== "undefined") {
			await botMsg.reactions.removeAll().catch(e => { });
		}

		const introEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
			.setTitle("Configure Applications")
			.setDescription("Use this command to add, remove, or edit applications. Applications are a good way to assess a person's interest in many areas, whether that be raid leading or moderation.");

		if (guildDb.properties.application.length + 1 <= 5) {
			introEmbed.addField("Create New Application", "React with ➕ if you would like to create a new application.");
		}

		introEmbed.addField("Edit Application", "React with ⚙️ if you would like to edit or delete an application.")
			.addField("View Application Status", "React with 👀 if you would like to see all current applications.")
			.addField("Exit", "React with ❌ if you would like to exit this process.")
			.setFooter("Application Manager");

		botMsg = typeof botMsg === "undefined"
			? await msg.channel.send(introEmbed)
			: await botMsg.edit(introEmbed);

		const reactions: EmojiResolvable[] = ["➕", "⚙️", "👀", "❌"];
		const selectedReaction: GuildEmoji | ReactionEmoji | "TIME_CMD" = await new FastReactionMenuManager(
			botMsg,
			msg.author,
			reactions,
			5,
			TimeUnit.MINUTE
		).react();

		if (selectedReaction === "TIME_CMD") {
			return;
		}

		if (selectedReaction.name === "➕") {
			this.createNewApp(msg, guildDb, botMsg);
		}
		else if (selectedReaction.name === "⚙️") {
			const app: "CANCEL_CMD" | "BACK_CMD" | IApplication = await this.getApplication(msg, guildDb, botMsg);
			if (app === "BACK_CMD") {
				this.mainMenu(msg, guildDb, botMsg);
				return;
			}
			else if (app === "CANCEL_CMD") {
				await botMsg.delete().catch(e => { });
				return;
			}
			this.editApp(msg, guildDb, app, botMsg);
		}
		else if (selectedReaction.name === "👀") {

		}
		else {
			await botMsg.delete().catch(e => { });
			return;
		}
	}

	public async editApp(msg: Message, guildDb: IRaidGuild, app: IApplication, botMsg: Message): Promise<void> {
		const embed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
			.setTitle(`Application: **${app.name}**`)
			.setDescription(`Enabled: ${app.isEnabled ? "Active" : "Inactive"}\nQuestions: ${app.questions.length}`)
			.setFooter(`${app.name}`);
		
	}

	public async createNewApp(msg: Message, guildDb: IRaidGuild, botMsg: Message): Promise<void> {
		const allAppNames: string[] = guildDb.properties.application.map(x => x.name.toLowerCase());

		await botMsg.reactions.removeAll().catch(e => { });

		let title: string = "";
		// we have members
		let reactToMsg: boolean = true;
		// see who to remove
		while (true) {
			const titleEmbed: MessageEmbed = new MessageEmbed()
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.setTitle("Creating New Application")
				.setDescription(`Current Title: ${title === "" ? "N/A" : title}\n\nType the name of this application. The name must not have already been used; if it has, the new title won't appear above.\n\nReact with ✅ if you are satisfied with the name above. React with the ❌ to cancel this process completely.`)
				.setFooter("Title for Application.");

			await botMsg.edit(titleEmbed).catch(e => { });

			const response: string | Emoji | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<string>(
				msg,
				{ embed: titleEmbed },
				2,
				TimeUnit.MINUTE
			).sendWithReactCollector(GenericMessageCollector.getStringPrompt(msg.channel, { minCharacters: 1 }), {
				reactions: ["✅", "❌"],
				cancelFlag: "-cancel",
				reactToMsg: reactToMsg,
				deleteMsg: false,
				removeAllReactionAfterReact: false,
				oldMsg: botMsg
			});

			if (reactToMsg) {
				reactToMsg = false;
			}

			if (response instanceof Emoji) {
				if (response.name === "❌") {
					await botMsg.delete().catch(e => { });
					return
				}
				else {
					break;
				}
			}
			else {
				if (response === "CANCEL_CMD" || response === "TIME_CMD") {
					await botMsg.delete().catch(e => { });
					return;
				}

				if (!allAppNames.includes(title.toLowerCase())) {
					title = response;
				}
			}
		}
		await botMsg.reactions.removeAll().catch(e => { });

		guildDb = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guildDb.guildID }, {
			$push: {
				"properties.application": {
					isEnabled: false,
					name: title,
					questions: []
				}
			}
		}, { returnOriginal: false })).value as IRaidGuild;

		const confirmEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("Application Created")
			.setDescription(`Your application, named \`${title}\`, has been created. It is currently disabled and no questions have been provided. To manage this application, please edit the application.`)
			.setFooter("Too Many Applications!");
		await botMsg.edit(confirmEmbed).catch(e => { });
		setTimeout(async () => {
			this.mainMenu(msg, guildDb, botMsg);
		}, 5 * 1000);
		return;
	}

	private async getApplication(
		msg: Message,
		guildData: IRaidGuild,
		botMsg: Message
	): Promise<IApplication | "BACK_CMD" | "CANCEL_CMD"> {
		const guild: Guild = (msg.guild as Guild);
		const embed: MessageEmbed = MessageUtil.generateBlankEmbed(guild)
			.setTitle(`**Select Application**`)
			.setColor("RANDOM")
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setFooter("Application Selection.")
			.setDescription("Please react to the emoji corresponding to the application that you want to configure.\n⇒ React with ⬅️ if you want to go back to the main menu.\n⇒ React with ❌ if you want to cancel this entire process.");

		const reactions: EmojiResolvable[] = ["⬅️", "❌"];

		for (let i = 0; i < guildData.properties.application.length; i++) {
			reactions.push(this._emojiToReaction[i]);
			const app: { isEnabled: boolean; name: string; questions: string[]; } = guildData.properties.application[i];
			embed.addField(`**\`[${i + 1}]\`** ${app.name}`, `Questions: ${app.questions.length}\nStatus: ${app.isEnabled ? "Active" : "Inactive"}`);
		}

		await botMsg.edit(embed).catch(e => { });
		const selectedReaction: Emoji | "TIME_CMD" = await new FastReactionMenuManager(
			botMsg,
			msg.author,
			reactions,
			2,
			TimeUnit.MINUTE
		).react();

		if (selectedReaction === "TIME_CMD" || selectedReaction.name === "❌") {
			return "CANCEL_CMD";
		}

		if (selectedReaction.name === "⬅️") {
			return "BACK_CMD";
		}

		const selectedIndex: number = this._emojiToReaction.findIndex(x => x === selectedReaction.name);
		if (selectedIndex === -1) {
			return "CANCEL_CMD";
		}

		return guildData.properties.application[selectedIndex];
	}
}