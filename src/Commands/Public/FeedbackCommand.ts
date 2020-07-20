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

export class FeedbackCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Feedback Command",
				"feedback",
				[],
				"Lets you send feedback to the developer.",
				["feedback"],
				["feedback"],
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

	private readonly _questions: string[][] = [
		// general idea AKA title
		["What is the general idea of this feedback?", "The general idea is a short \"summary\" (preferably less than 10 words) of what your idea is. This should NOT be an essay; that will be for the next step. Examples of valid submissions are:\n- \"Add Pirate Cave AFK check\"\n- \"Add more moderation tools.\"\n- \"Suggestions to improve modmail\""],
		["Please describe your suggestion or feedback in detail.", "Now is the time for you to fully describe your suggestion or feedback! Use this opportunity to give me an idea of what you want. In other words, expand on the \"General Idea.\""]
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
			await msg.author.send("At this time, the developer is not accepting feedback.");
			return;
		}

		if (botDb.dev.blacklisted.some(x => x === msg.author.id)) {
			await msg.author.send("You are not able to submit feedback to the developer.");
			return;
		}

		UserAvailabilityHelper.InMenuCollection.set(msg.author.id, UserAvailabilityHelper.MenuType.FEEDBACK);
		const responses: string[][] = [];
		for await (const question of this._questions) {
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
				.append(`[NOT SUBMITTED] Feedback Form: ${DateUtil.getTime()}`)
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
				.setTitle("Confirm Submission")
				.setDescription("Attached above are your responses to the questions. Please take this time to review your responses. If you believe there is a mistake or you wish to edit one or more of your responses, please type the number corresponding to the question that you want to edit.\n\nWhen you are done, simply react with 💾. To cancel this process entirely, thus deleting your feedback form, react with 🗑️.")
				.addField("All Questions", questions)
				.setFooter("Confirming Feedback Submission.");
			const resp: number | Emoji | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<number>(
				msg.author,
				{ content: "See Attachment Below.", embed: conEmbed, files: [new MessageAttachment(Buffer.from(respString.toString(), "utf8"), `$feedback_${msg.author.discriminator}.txt`)] },
				10,
				TimeUnit.MINUTE,
				dmChannel
			).sendWithReactCollector(GenericMessageCollector.getNumber(dmChannel, 1, this._questions.length), {
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

				responses[resp - 1][1] = await this.askQuestion(msg, dmChannel, resp - 1);
			}
		}

		UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);

		let feedback: GithubHandler.IFeedback = {
			authorId: DEVELOPER_ID.includes(msg.author.id) ? (PRODUCTION_BOT ? "Developer" : "Developer Testing") : msg.author.id,
			authorTag: DEVELOPER_ID.includes(msg.author.id) ? (PRODUCTION_BOT ? "Developer" : "Developer Testing") : msg.author.tag,
			title: `[FEEDBACK] ${responses[0][1]}`,
			feedback: responses[1][1],
			time: new Date().getTime(),
			version: BOT_VERSION
		};

		let resp: GithubHandler.IssuesResponse = await GithubHandler.createIssue("FEEDBACK", feedback);
		await MongoDbHelper.MongoBotSettingsClient.updateOne({ botId: (msg.client.user as ClientUser).id }, {
			$push: {
				"dev.feedback": feedback
			}
		});


		const embed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
			.setTitle("Feedback Submitted Successfully")
			.setDescription("Thank you for submitting your feedback! It has been submitted successfully.")
			.addField("Information", `- Database: Saved\n- Online: ${resp === GithubHandler.IssuesResponse.SUCCESS ? "Saved" : "Not Saved"}`)
			.setFooter("Successfully Submitted Feedback.");
		await msg.author.send(embed)
			.catch(e => { });
	}

	private async askQuestion(msg: Message, dmChannel: DMChannel, indexOrQ: string[] | number): Promise<string> {
		const question: string[] = Array.isArray(indexOrQ)
			? indexOrQ
			: this._questions[indexOrQ];

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
			).sendWithReactCollector(GenericMessageCollector.getStringPrompt(dmChannel), {
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
			.setFooter("Feedback");
		if (directions !== "") {
			embed
				.addField("General Instructions", `Please respond to the question posed above. Please see the specific directions below for this question. You will have up to 1500 characters, and will have 10 minutes to respond. Note that you cannot submit images as of now. **REPORTS MUST BE SCHOOL-APPROPRIATE!**\n⇒ React with ✅ once you are satisfied with your response above. You will be moved to the next step.\n⇒ React with ❌ to cancel this process.\n\n⚠️ WARNING: Your Discord tag and ID will be shared with the developer.\n\nℹ️ NOTE: The directions will automatically be hidden after you send something!`)
				.addField("Specific Directions", directions);
		}
		return embed;
	}
}