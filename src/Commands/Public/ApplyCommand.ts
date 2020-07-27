import { Command } from "../../Templates/Command/Command";
import { EmojiResolvable, Message, MessageEmbed, Guild, Emoji, MessageAttachment, DMChannel, User, TextChannel, GuildMember } from "discord.js";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { IApplication } from "../../Definitions/IApplication";
import { StringUtil } from "../../Utility/StringUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { FastReactionMenuManager } from "../../Classes/Reaction/FastReactionMenuManager";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { UserAvailabilityHelper } from "../../Helpers/UserAvailabilityHelper";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { DateUtil } from "../../Utility/DateUtil";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { OtherUtil } from "../../Utility/OtherUtil";

export class ApplyCommand extends Command {
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
				"Lets you apply through an application.",
				"apply",
				[],
				"Configures the leader application system.",
				["apply"],
				["apply"],
				0
			),
			new CommandPermission(
				[],
				[],
				["raider"],
				[],
				true
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
		const guild: Guild = msg.guild as Guild;
		if (typeof guildDb.properties.application === "undefined") {
			guildDb = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
				$set: {
					"properties.application": []
				}
			}, { returnOriginal: false })).value as IRaidGuild;
		}
		this.mainMenu(msg, guildDb);
	}

	public async mainMenu(msg: Message, guildDb: IRaidGuild): Promise<void> {
		const guild: Guild = msg.guild as Guild;
		const allActiveApps: IApplication[] = guildDb.properties.application
			.filter(x => x.isEnabled && guild.channels.cache.has(x.channel));
		const embed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author, allActiveApps.length === 0 ? "RED" : "GREEN")
			.setTitle("Application Selection")
			.setFooter("Application Selection.");
		if (allActiveApps.length === 0) {
			embed.setDescription("There are currently no applications available. Please try again later.");
			MessageUtil.send({ embed: embed }, msg.author, 20 * 1000);
			return;
		}
		else {
			embed.setDescription(`Active Applications: ${allActiveApps.length}\n\nPlease react to the emoji that corresponds to the application you want to fill out. If you want to cancel this process, react with ❌.`);
		}

		const reactions: EmojiResolvable[] = ["❌"];

		for (let i = 0; i < guildDb.properties.application.length; i++) {
			if (!guildDb.properties.application[i].isEnabled) {
				continue;
			}
			reactions.push(this._emojiToReaction[i]);
			const app: IApplication = guildDb.properties.application[i];
			embed.addField(`**\`[${i + 1}]\`** ${app.name}`, `${app.questions.length} Questions`);
		}

		const botMsg: Message = await msg.author.send(embed);
		const selectedReaction: Emoji | "TIME_CMD" = await new FastReactionMenuManager(
			botMsg,
			msg.author,
			reactions,
			2,
			TimeUnit.MINUTE
		).react();

		if (selectedReaction === "TIME_CMD" || selectedReaction.name === "❌") {
			botMsg.delete().catch(e => { });
			return;
		}

		const selectedIndex: number = this._emojiToReaction.findIndex(x => x === selectedReaction.name);
		if (selectedIndex === -1) {
			const errorEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author, "RED")
				.setTitle("Error")
				.setDescription("An unspecified error occurred. Please try again later.")
				.setFooter("Application Selection.");
			botMsg.edit(errorEmbed).then(x => x.delete({ timeout: 5000 })).catch(e => { });
			return;
		}

		await botMsg.delete().catch(e => { });
		this.application(msg, guildDb.properties.application[selectedIndex]).catch(e => { });
	}

	public async application(msg: Message, app: IApplication): Promise<void> {
		const dmChannel: DMChannel = await msg.author.createDM();
		const guild: Guild = msg.guild as Guild;
		const formChan: TextChannel = guild.channels.cache.get(app.channel) as TextChannel;

		UserAvailabilityHelper.InMenuCollection.set(msg.author.id, UserAvailabilityHelper.MenuType.APPLICATION);

		// confirm terms
		const termsEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(guild)
			.setTitle("Directions (Please Read Carefully)")
			.setDescription(app.instructions.length === 0 ? "Please answer each application question to the best of your knowledge. Be honest in your answers. When filling your application, your responses should be clear, complete, and concise.\n\n Do NOT ask about your application's status; doing so may result in consequences. if your application is accepted, you will be contacted; if your application didn't make it, you will most likely not be contacted." : app.instructions)
			.addField("Bot-Specific Directions", "The bot will be asking you each question, one at a time. You will have up to 2000 characters and 30 minutes to respond to each question. Note that, once you answer all questions, you will be given the opportunity to edit your responses as you see fit. We do not recommend using any markdown in your text since it won't be displayed properly.")
			.addField("Responses", "When you send your answer, the bot will not immediately move you to the next question; rather, the bot will show your response. Use this opportunity to make sure your response is exactly what you wanted it to be. If you don't like it, simply type up a new response and send it; the bot will update your response.\n\nAt this time, the bot doesn't support screenshots. If you must send a picture, upload it somewhere else and then send the link with your response.")
			.addField("Reactions", "Once you are done answer a question, react to one of the two reactions.\n⇒ React with ✅ once you are satisfied with your response. You will be moved to the next question.\n⇒ React with ❌ to cancel the entire form.")
			.addField("Agreement", "These directions will not show up as you move on, so please read them carefully. Once you are done, react with one of the following:\n⇒ React with 🟢 if you __agree__ to the directions and wish to move on.\n⇒ React with 🔴 if you do not wish to move on.");

		const agreementMsg: Message = await dmChannel.send(termsEmbed);
		const agreementEmoji: Emoji | "TIME_CMD" = await new FastReactionMenuManager(
			agreementMsg,
			msg.author,
			["🟢", "🔴"],
			1,
			TimeUnit.MINUTE
		).react();

		await agreementMsg.delete().catch(e => { });
		if (agreementEmoji === "TIME_CMD" || agreementEmoji.name === "🔴") {
			await agreementMsg.delete().catch(e => { });
			UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
			return;
		}

		const start: number = new Date().getTime();

		const responses: [string, number, number[]][] = [];
		const times: number[] = [];
		for await (const question of app.questions) {
			let timeA: number = new Date().getTime();
			const answer: string = await this.askQuestion(msg, dmChannel, question);
			if (answer === "-CANCEL") {
				UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
				return;
			}
			let timeB: number = new Date().getTime();
			responses.push([answer, timeB - timeA, []]);
		} // end for

		while (true) {
			let questions: string[] = [];
			const respString: StringBuilder = new StringBuilder()
				.append(`[APPLICATION] ${app.name} Form: ${DateUtil.getTime()}`)
				.appendLine()
				.append(`Author: ${msg.author.tag} (${msg.author.tag})`)
				.appendLine()
				.appendLine();
			for (let i = 0; i < app.questions.length; i++) {
				respString.append(`Q: ${app.questions[i]}`)
					.appendLine()
					.append(responses[i][0])
					.appendLine()
					.appendLine();
			}

			const conEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(guild)
				.setTitle(`Confirm Submission: ${guild.name} ⇒ ${app.name}`)
				.setDescription("Attached above are your responses to the applicat5ion questions. Please take this time to review your responses. If you believe there is a mistake or you wish to edit one or more of your responses, please type the number corresponding to the question that you want to edit.\n\nWhen you are ready to submit, simply react with 💾. To cancel this process entirely, thus deleting your form, react with 🗑️.")
				.setFooter("Confirming Submission.");
			const fields: string[] = StringUtil.arrayToStringFields<string>(
				app.questions,
				(i, elem) => `**\`[${i + 1}]\`** ${elem}\n`
			);

			for (const f of fields) {
				conEmbed.addField("Questions", f);
			}

			const resp: number | Emoji | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<number>(
				msg.author,
				{ content: "See Attachment Below.", embed: conEmbed, files: [new MessageAttachment(Buffer.from(respString.toString(), "utf8"), `${app.name.toLowerCase()}_${msg.author.id}.txt`)] },
				10,
				TimeUnit.MINUTE,
				msg.author
			).sendWithReactCollector(GenericMessageCollector.getNumber(msg.author, 1, questions.length), {
				reactions: ["💾", "🗑️"],
				cancelFlag: "--cancel",
				reactToMsg: true,
				deleteMsg: true,
				removeAllReactionAfterReact: false
			});

			if (resp instanceof Emoji) {
				if (resp.name === "🗑️") {
					UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
					return;
				}
				else {
					break;
				}
			}
			else {
				if (resp === "CANCEL_CMD" || resp === "TIME_CMD") {
					UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
					return;
				}

				let a: number = new Date().getTime();
				responses[resp - 1][0] = await this.askQuestion(msg, dmChannel, responses[resp - 1][0]);
				let b: number = new Date().getTime();
				responses[resp - 1][2].push(b - a);
			}
		}

		const end: number = new Date().getTime();
		UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);

		// tell them they submitted
		const confirmSubmitEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
			.setTitle("Application Submitted Successfully")
			.setDescription(`Thank you for submitting your \`${app.name}\` application! It has been submitted successfully.`)
			.setFooter("Successfully Submitted Form.");
		dmChannel.send(confirmSubmitEmbed).catch(e => { });

		const finalConfirm: StringBuilder = new StringBuilder()
			.append(`[APPLICATION SUBMITTED] ${app.name}`)
			.appendLine()
			.appendLine()
			.append(`Submitted Time: ${DateUtil.getTime(end)} (UTC)`)
			.appendLine()
			.append(`Time Taken: ${((end - start) / 60000).toFixed(2)} Minutes`)
			.appendLine()
			.append(`Applicant Tag: ${msg.author.tag}`)
			.appendLine()
			.append(`Applicant IGN: ${(msg.member as GuildMember).displayName}`)
			.appendLine()
			.append(`Applicant ID: ${msg.author.id}`)
			.appendLine()
			.appendLine()
			.append("=========================================")
			.appendLine()
			.append("[Q] Do you agree to the instructions?")
			.appendLine()
			.append("Yes")
			.appendLine()
			.appendLine();
		for (let i = 0; i < app.questions.length; i++) {
			finalConfirm.append("=========================================")
				.appendLine()
				.append(`[Q] ${app.questions[i]}`)
				.appendLine()
				.append(responses[i][0])
				.appendLine()
				.appendLine()
				.appendLine()
				.append(`⇒ Time Spent: ${(responses[i][1] / 60000).toFixed(2)} Minutes`)
				.appendLine()
				.append(`⇒ Edited: ${responses[i][2].length} Times`)
				.appendLine()
				.append(`⇒ Time Spent Editing: [${responses[i][2].map(x => x / 60000).join(" Minutes, ")}]`)
				.appendLine();
		}

		const descEmbedSB: StringBuilder = new StringBuilder()
			.append(`\`${(msg.member as GuildMember).displayName}\` has submitted the \`${app.name}\` application. Please review the summary, application, and directions below.`)
			.appendLine()
			.append(`⇒ **Applicant:** ${msg.author} (${msg.author.tag})`)
			.appendLine()
			.append(`⇒ **Applicant ID:** ${msg.author.id}`)
			.appendLine()
			.appendLine()
			.append(`⇒ **Time Submitted:** ${DateUtil.getTime(end)} (UTC)`)
			.appendLine()
			.append(`⇒ **Estimated Time Spent:** ${((end - start) / 60000).toFixed(2)} Minutes`);

		const finalEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
			.setTitle(`Application Submitted ⇒ ${app.name}`)
			.setDescription(descEmbedSB.toString())
			.addField("Directions", "Please download and view the applicant's answers. Decide whether the application is good enough for the position in mind and then react accordingly.\n⇒ React with ✅ if you like the application.\n⇒ React with ❌ if you dislike the application.\n⇒ React with 📝 if you would like to interview the person to gather more information.")
			.setFooter("Submitted")
			.setTimestamp();
		await formChan.send(finalEmbed).catch(e => { });
		const appMsg: Message = await formChan.send(new MessageAttachment(Buffer.from(finalConfirm.toString(), "utf8"), `${app.name.toLowerCase()}_${msg.author.id}.txt`));
		FastReactionMenuManager.reactFaster(appMsg, ["✅", "❌", "📝"]);
	}


	private async askQuestion(msg: Message, dmChannel: DMChannel, question: string): Promise<string> {
		let initialCreated: boolean = false;
		let botMsg: Message | undefined;

		let answer: string = "";
		let hasReactedToMessage: boolean = false;
		while (true) {
			const embed: MessageEmbed = this.generateEmbed(msg.author, question, answer);
			if (typeof botMsg === "undefined") {
				botMsg = await dmChannel.send(embed);
			}
			else {
				botMsg = await botMsg.edit(embed);
			}

			if (!initialCreated) {
				await botMsg.edit(embed).catch(e => { });
			}

			const response: string | Emoji | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<string>(
				msg.author,
				{ embed: embed },
				30,
				TimeUnit.MINUTE,
				dmChannel
			).sendWithReactCollector(GenericMessageCollector.getStringPrompt(dmChannel, { minCharacters: 1, maxCharacters: 2000 }), {
				reactions: ["✅", "❌"],
				cancelFlag: "--cancel",
				reactToMsg: !hasReactedToMessage,
				deleteMsg: false,
				removeAllReactionAfterReact: false,
				oldMsg: botMsg
			});

			if (!hasReactedToMessage) {
				hasReactedToMessage = !hasReactedToMessage;
			}

			if (response instanceof Emoji) {
				if (response.name === "❌") {
					await botMsg.delete().catch(e => { });
					return "-CANCEL";
				}
				else {
					if (answer.length !== 0) {
						break;
					}
				}
			}
			else {
				if (response === "CANCEL_CMD" || response === "TIME_CMD") {
					await botMsg.delete().catch(() => { });
					return "-CANCEL";
				}

				answer = response;
			}

		} // end while loop
		await botMsg.delete().catch(e => { });
		botMsg = undefined;

		return answer;
	}

	private generateEmbed(author: User, question: string, response: string): MessageEmbed {
		const embed: MessageEmbed = MessageUtil.generateBlankEmbed(author)
			.setTitle(question)
			.setDescription(response.length === 0 ? "N/A" : response)
			.setFooter("Application Process.");
		return embed;
	}
}