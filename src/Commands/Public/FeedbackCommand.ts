import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, ClientUser, Client, MessageEmbed, Emoji, User, DMChannel } from "discord.js";
import { IRaidBot } from "../../Templates/IRaidBot";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { UserAvailabilityHelper } from "../../Helpers/UserAvailabilityHelper";
import { MessageUtil } from "../../Utility/MessageUtil";
import { GithubHandler } from "../../Helpers/GithubHandler";
import { BOT_VERSION } from "../../Constants/ConstantVars";
import { DEVELOPER_ID, PRODUCTION_BOT } from "../../Configuration/Config";

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
		["What is the General Idea of this Feedback?", "The general idea is a short \"summary\" (preferably less than 10 words) of what your idea is. This should NOT be an essay; that will be for the next step. Valid submissions are:\n- \"Add Pirate Cave AFK check\"\n- \"Add more moderation tools.\"\n- \"Suggestions to improve modmail\""],
		["Please Describe the Feedback In Detail.", "Now is the time for you to fully describe your suggestion or feedback! Use this opportunity to give me an idea of what you want. In other words, expand on the \"General Idea.\""]
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
		let botMsg: Message | undefined;
		const responses: string[][] = [];
		let initialCreated: boolean = false; 
		for await (const question of this._questions) {
			let answer: string = "";
			let hasReactedToMessage: boolean = false;
			while (true) {
				const embed: MessageEmbed = this.generateEmbed(msg.author, question[0], answer, question[1]);
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
	
				if (hasReactedToMessage) {
					hasReactedToMessage = !hasReactedToMessage;
				}
	
				if (response instanceof Emoji) {
					if (response.name === "❌") {
						await botMsg.delete().catch(e => { });
						UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
						return;
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
						UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
						return;
					}
	
					answer = response;
				}

			} // end while loop
			await botMsg.delete().catch(e => { });
			botMsg = undefined;
			responses.push([question[0], answer]);
		} // end for

		let feedback: GithubHandler.IFeedback = {
			authorId: DEVELOPER_ID.includes(msg.author.id) ? (PRODUCTION_BOT ? "Developer" : "Developer Testing") : msg.author.id,
			authorTag: DEVELOPER_ID.includes(msg.author.id) ? (PRODUCTION_BOT ? "Developer" : "Developer Testing") : msg.author.tag,
			title: `[FEEDBACK] ${responses[0][1]}`,
			feedback: responses[1][1],
			time: new Date().getTime(),
			version: BOT_VERSION
		};

		let resp: GithubHandler.IssuesResponse = await GithubHandler.createIssue("FEEDBACK", feedback);
		console.log(resp); 
		await MongoDbHelper.MongoBotSettingsClient.updateOne({ botId: (msg.client.user as ClientUser).id }, {
			$push: {
				"dev.feedback": feedback
			}
		});

		UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
	}

	private generateEmbed(author: User, question: string, response: string, directions: string): MessageEmbed {
		return MessageUtil.generateBlankEmbed(author)
			.setTitle(question)
			.setDescription(response.length === 0 ? "N/A" : response)
			.setFooter("Feedback")
			.addField("General Instructions", `Please respond to the question posed above. Please see the specific directions below for this question. You will have up to 1500 characters, and will have 10 minutes to respond. Note that you cannot submit images.\n⇒ React with ✅ once you are satisfied with your response above. You will be moved to the next step.\n⇒ React with ❌ to cancel this process.\n\n⚠️ WARNING: Your Discord tag and ID will be shared with the developer.\nℹ️ NOTE: Once you submit your response to this question, you cannot view your response again!`)
			.addField("Specific Directions", directions);
	}
}