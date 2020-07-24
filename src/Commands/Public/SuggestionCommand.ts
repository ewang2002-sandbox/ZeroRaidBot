import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, ClientUser, Client, MessageEmbed, Emoji, User, DMChannel, EmojiResolvable, MessageAttachment } from "discord.js";
import { IRaidBot } from "../../Templates/IRaidBot";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { UserAvailabilityHelper } from "../../Helpers/UserAvailabilityHelper";
import { MessageUtil } from "../../Utility/MessageUtil";
import { GithubHandler } from "../../Helpers/GithubHandler";
import { BOT_VERSION } from "../../Constants/ConstantVars";
import { DEVELOPER_ID, PRODUCTION_BOT } from "../../Configuration/Config";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { DateUtil } from "../../Utility/DateUtil";
import { FastReactionMenuManager } from "../../Classes/Reaction/FastReactionMenuManager";

export class SuggestionCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Suggestion Command",
				"suggest",
				["bugreport", "feedback"],
				"Allows you to send suggestions or bug reports to the developer.",
				["suggest"],
				["suggest"],
				0
			),
			new CommandPermission(
				[],
				[],
				[],
				[],
				true
			),
			false, // guild-only command. 
			false,
			false
		);
	}

	private readonly _feedbackQuestions: string[][] = [
		// general idea AKA title
		["What is the general idea of this feedback?", "The general idea is a short \"summary\" (preferably less than 10 words) of what your idea is. This should NOT be an essay; that will be for the next step. Examples of valid submissions are:\n- \"Add Pirate Cave AFK check\"\n- \"Add more moderation tools.\"\n- \"Suggestions to improve modmail\""],
		["Please describe your suggestion or feedback in detail.", "Now is the time for you to fully describe your suggestion or feedback! Use this opportunity to give me an idea of what you want. In other words, expand on the \"General Idea.\""]
	];

	private readonly _bugReportQuestions: string[][] = [
		// general idea AKA title
		["What is the general idea of this bug report?", "The general idea is a short \"summary\" (preferably less than 10 words) of what your report is about. This should NOT be an essay; that will be for later. Examples of valid submissions are:\n- \"AFK check dungeon menu not responding\"\n- \"Blacklist doesn't blacklist all alts.\"\n- \"The bot isn't sending modmail.\"\n\nExamples of invalid submissions are:\n- \"The bot broke\"\n- \"Please help\""],
		["Please provide a description of this bug.", "Now is the time for you to write a description of the bug. Include information like any relevant error message(s), the location (where the bug occurred), what you expected the bot to do, and what actually happened. The more descriptive you are, the fast the bug will be fixed."],
		["Please provide steps to reproduce this bug.", "This is your opportunity to tell me, the developer, how you came across this bug. Use this opportunity to tell me what you did that led up to the bug happening; in other words, tell me what bot commands or features you used *prior* to the bug happening. This part should be the longest part of this report, and should take a bit of time. Please be as descriptive as possible. The best way to respond to this question is to write a step-by-step guide."],
		["Any other details?", "Provide any other useful or notable details. Perhaps mention how often this bug occurred (does it occur every time or once in a while?)"]
	];

	public async executeCommand(
		msg: Message,
		args: string[]
	): Promise<void> {
		let dmChannel: DMChannel;
		try {
			dmChannel = await msg.author.createDM();
		}
		catch (e) {
			await msg.channel.send(`${msg.member}, I cannot DM you. Please make sure your privacy settings are set so anyone can send messages to you.`).catch(() => { });
			return;
		}
		let botDb: IRaidBot = await MongoDbHelper.MongoBotSettingsClient
			.findOne({ botId: (msg.client.user as ClientUser).id }) as IRaidBot;

		if (typeof botDb.dev === "undefined") {
			botDb = (await MongoDbHelper.MongoBotSettingsClient.findOneAndUpdate({ botId: (msg.client.user as ClientUser).id }, {
				$set: {
					dev: {
						isEnabled: true,
						bugs: [],
						feedback: [],
						blacklisted: []
					}
				}
			}, { returnOriginal: false })).value as IRaidBot;
		}

		if (!botDb.dev.isEnabled) {
			await msg.author.send("At this time, the developer is not accepting suggestions.");
			return;
		}

		if (botDb.dev.blacklisted.some(x => x === msg.author.id)) {
			await msg.author.send("You are not able to submit suggestions to the developer.");
			return;
		}
		UserAvailabilityHelper.InMenuCollection.set(msg.author.id, UserAvailabilityHelper.MenuType.SUGGESTION);

		const reportTypeEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
			.setTitle("Select Report Type")
			.setDescription(`Please select the option that best represents why you are here.\n⇒ React with 🐛 if you are reporting a bug (something doesn't work as intended).\n⇒ React with 💡 if you are requesting a feature or have a suggestion for the bot.\n⇒ React with ❌ to cancel this process.`)
			.setFooter("Report Type");
		const reportTypeMessage: Message = await dmChannel.send(reportTypeEmbed);
		const selectedReportEmoji: Emoji | "TIME_CMD" = await new FastReactionMenuManager(
			reportTypeMessage,
			msg.author,
			["🐛", "💡", "❌"],
			1,
			TimeUnit.MINUTE
		).react();

		await reportTypeMessage.delete().catch(e => { });

		if (selectedReportEmoji === "TIME_CMD") {
			await reportTypeMessage.delete().catch(e => { });
			UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
			return;
		}

		let questions: string[][];
		let selectedReportType: string;

		if (selectedReportEmoji.name === "🐛") {
			questions = this._bugReportQuestions;
			selectedReportType = "Bug Report";
		}
		else if (selectedReportEmoji.name === "💡") {
			questions = this._feedbackQuestions;
			selectedReportType = "Feedback";
		}
		else {
			UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
			return;
		}


		// confirm terms
		const termsEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
			.setTitle("Directions")
			.setDescription("Read the below directions carefully. These directions will not show up as you move on; read below for more information. Once you are done, react with one of the following:\n⇒ React with 🟢 if you agree to the directions and wish to move on.\n⇒ React with 🔴 if you do not wish to move on.")
			.addField("Questions", "If you selected the `Feedback` form, you will be answering 2 questions and the form should take less than 3 minutes. If you selected the `Bug Report` form, you will be answering 4 questions and the form should take anywhere from 5-15 minutes. The bot will be asking you each question, one at a time. You will have up to 2000 characters and 10 minutes to respond to each question.")
			.addField("Specific Directions", "Each question will have \"specific\" directions. These are directions that are, well, specific to that particular question. Read the directions carefully before crafting a response. Once you send a response, the directions will hide until you move on.")
			.addField("Responses", "When you send your answer, the bot will not immediately move you to the next question; rather, the bot will show your response. Use this opportunity to make sure your response is exactly what you wanted it to be. If you don't like it, simply type up a new response and send it; the bot will update your response.\n\nAt this time, the bot doesn't support screenshots. If you must send a picture, upload it somewhere else and then send the link with your response.")
			.addField("Reactions", "Once you are done answer a question, react to one of the two reactions.\n⇒ React with ✅ once you are satisfied with your response. You will be moved to the next question.\n⇒ React with ❌ to cancel the entire form.")
			.addField("Final Remarks", "- Your responses should be safe for work; that is, they should be school appropriate.\n- The developer will be able to see your Discord tag and Discord ID.");

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
			await reportTypeMessage.delete().catch(e => { });
			UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
			return;
		}

		const responses: string[][] = [];
		for await (const question of questions) {
			const answer: string = await this.askQuestion(msg, dmChannel, question);
			if (answer === "-CANCEL") {
				UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
				return;
			}
			responses.push([question[0], answer]);
		} // end for

		while (true) {
			let questions: string[] = [];
			const respString: StringBuilder = new StringBuilder()
				.append(`[NOT SUBMITTED] ${selectedReportType} Form: ${DateUtil.getTime()}`)
				.appendLine()
				.append(`Author: ${msg.author.tag} (${msg.author.tag})`)
				.appendLine()
				.appendLine();
			let index: number = 0;
			for (const [question, answer] of responses) {
				questions.push(`\`[${++index}]\` ${question}`);
				respString.append(`Q: ${question}`)
					.appendLine()
					.append(answer)
					.appendLine()
					.appendLine();
			}
			const conEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
				.setTitle(`Confirm Submission: ${selectedReportType}`)
				.setDescription("Attached above are your responses to the questions. Please take this time to review your responses. If you believe there is a mistake or you wish to edit one or more of your responses, please type the number corresponding to the question that you want to edit.\n\nWhen you are done, simply react with 💾. To cancel this process entirely, thus deleting your form, react with 🗑️.")
				.addField("All Questions", questions)
				.setFooter("Confirming Submission.");
			const resp: number | Emoji | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<number>(
				msg.author,
				{ content: "See Attachment Below.", embed: conEmbed, files: [new MessageAttachment(Buffer.from(respString.toString(), "utf8"), `${selectedReportType.split(" ")[0].toLowerCase()}_${msg.author.discriminator}.txt`)] },
				10,
				TimeUnit.MINUTE,
				dmChannel
			).sendWithReactCollector(GenericMessageCollector.getNumber(dmChannel, 1, questions.length), {
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

				responses[resp - 1][1] = await this.askQuestion(msg, dmChannel, responses[resp - 1]);
			}
		}

		UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);

		let resp: GithubHandler.IssuesResponse;
		if (selectedReportType === "Bug Report") {
			let bugReport: GithubHandler.IBugReport = {
				time: new Date().getTime(),
				authorId: DEVELOPER_ID.includes(msg.author.id) ? (PRODUCTION_BOT ? "Developer" : "Developer Testing") : msg.author.id,
				authorTag: DEVELOPER_ID.includes(msg.author.id) ? (PRODUCTION_BOT ? "Developer" : "Developer Testing") : msg.author.tag,
				version: BOT_VERSION,
				title: `[BUG REPORT] ${responses[0][1]}`,
				description: responses[1][1],
				reproduceSteps: responses[2][1],
				otherInfo: responses[3][1]
			};
			resp = await GithubHandler.createIssue("BUG_REPORT", bugReport);
		}
		else {
			let feedback: GithubHandler.IFeedback = {
				authorId: DEVELOPER_ID.includes(msg.author.id) ? (PRODUCTION_BOT ? "Developer" : "Developer Testing") : msg.author.id,
				authorTag: DEVELOPER_ID.includes(msg.author.id) ? (PRODUCTION_BOT ? "Developer" : "Developer Testing") : msg.author.tag,
				title: `[FEEDBACK] ${responses[0][1]}`,
				feedback: responses[1][1],
				time: new Date().getTime(),
				version: BOT_VERSION
			};
			resp = await GithubHandler.createIssue("FEEDBACK", feedback);
		}


		let embed: MessageEmbed;
		if (resp === GithubHandler.IssuesResponse.SUCCESS) {
			embed = MessageUtil.generateBlankEmbed(msg.author)
				.setTitle("Report Submitted Successfully")
				.setDescription(`Thank you for submitting your ${selectedReportType.toLowerCase()}! It has been submitted successfully.`)
				.setFooter("Successfully Submitted Form.");
		}
		else if (resp === GithubHandler.IssuesResponse.FAILED) {
			embed = MessageUtil.generateBlankEmbed(msg.author)
				.setTitle("Report Submission Failed")
				.setDescription(`Your ${selectedReportType.toLowerCase()} report wasn't sent! This might be due to a connectivity issue on the bot's part. Please try again later.`)
				.setFooter("Submission Failed");
		}
		else {
			embed = MessageUtil.generateBlankEmbed(msg.author)
				.setTitle("System Not Configured")
				.setDescription(`Your ${selectedReportType.toLowerCase()} report wasn't sent because this bot wasn't configured. Consider joining the [official Dungeoneer O3 server](https://discord.gg/rQrbK2V) and submitting your feedback through the official bot.`)
				.setFooter("Submission Failed");
		}

		await msg.author.send(embed)
			.catch(e => { });
	}

	private async askQuestion(msg: Message, dmChannel: DMChannel, question: string[]): Promise<string> {
		let initialCreated: boolean = false;
		let botMsg: Message | undefined;

		let answer: string = "";
		let hasReactedToMessage: boolean = false;
		while (true) {
			const embed: MessageEmbed = hasReactedToMessage
				? this.generateEmbed(msg.author, question[0], answer)
				: this.generateEmbed(msg.author, question[0], answer, question[1]);
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
				10,
				TimeUnit.MINUTE,
				dmChannel
			).sendWithReactCollector(GenericMessageCollector.getStringPrompt(dmChannel, { minCharacters: 4, maxCharacters: 2000 }), {
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

	private generateEmbed(author: User, question: string, response: string, directions: string = ""): MessageEmbed {
		const embed: MessageEmbed = MessageUtil.generateBlankEmbed(author)
			.setTitle(question)
			.setDescription(response.length === 0 ? "N/A" : response)
			.setFooter("Feedback & Bug Report System");
		if (directions !== "") {
			embed.addField("Specific Directions", directions);
		}
		return embed;
	}
}