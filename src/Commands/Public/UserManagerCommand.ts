import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, DMChannel, MessageEmbed, EmojiResolvable, ReactionCollector, Collection, MessageReaction, User, MessageCollector, Guild, GuildMember } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { IRaidUser } from "../../Templates/IRaidUser";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { MessageUtil } from "../../Utility/MessageUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { MessageAutoTick } from "../../Classes/Message/MessageAutoTick";
import { AxiosResponse } from "axios";
import { ITiffitNoUser, ITiffitRealmEyeProfile } from "../../Definitions/ITiffitRealmEye";
import { Zero } from "../../Zero";
import { TiffitRealmEyeAPI } from "../../Constants/ConstantVars";
import { FilterQuery, UpdateQuery } from "mongodb";
import { VerificationHandler } from "../../Helpers/VerificationHandler";
import { INameHistory, IAPIError } from "../../Definitions/ICustomREVerification";

export class UserManagerCommand extends Command {
	public static readonly MAX_ALTS_ALLOWED: number = 8;

	public constructor() {
		super(
			new CommandDetail(
				"User Manager Command",
				"usermanager",
				["userprofile", "profile", "manager"],
				"A command that allows a user to manage his or her profile.",
				[],
				[],
				0
			),
			new CommandPermission(
				[],
				[],
				["suspended"],
				[],
				true
			),
			false, // guild-only command. 
			false,
			false
		);
	}

	/**
	 * @inheritdoc
	 */
	public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
		const userDb: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.MongoUserClient
			.findOne({ discordUserId: msg.author.id });

		if (userDb !== null) {
			MessageUtil.send({ content: "Permission Denied: You are unable to use this command because you have not verified with any server under this bot." }, msg.channel);
			return;
		}

		const dmChannel: DMChannel = await msg.author.createDM();
		const selectionEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("User Profile Configuration Manager")
			.setColor("RANDOM")
			.setFooter("Configuration Menu")
			.setTimestamp()
			.setDescription("React with ⚙️ to configure your personal profile settings.\nReact with 📛 to configure your profile settings for a guild.\nReact with ❌ to cancel this process.");
		const m: Message = await dmChannel.send(selectionEmbed);
		const emojis: EmojiResolvable[] = ["⚙️", "📛", "❌"];

		for await (const emoji of emojis) {
			await m.react(emoji).catch(e => { });
		}

		const reactCollector: ReactionCollector = m.createReactionCollector(this.reactionCollectionFilter(emojis, msg), {
			time: 900000,
			max: 1
		});

		reactCollector.on("end", async (collected: Collection<string, MessageReaction>, reason: string) => {
			//console.log(reason); // => limit
		});

		reactCollector.on("collect", async (r: MessageReaction, u: User) => {
			await m.delete().catch(e => { });
			// manage profile
			if (r.emoji.name === "⚙️") {

			}
			// manage guild settings
			else if (r.emoji.name === "📛") {

			}
			// cancel process
			else if (r.emoji.name === "❌") {
				return;
			}
		});
	}

	/**
	 * @param {Message} msg The message obj. 
	 * @param {DMChannel} dmChannel The dm channel.
	 */
	public async manageUserSettings(msg: Message, dmChannel: DMChannel, userDb: IRaidUser): Promise<void> {
		const sbDesc: StringBuilder = new StringBuilder();
		const reactions: EmojiResolvable[] = [];
		const selectionEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("User Profile Manager")
			.setColor("RANDOM")
			.setFooter("Configuration Menu")
			.setTimestamp();
		//.setDescription("⇒ React with ➕ to add an alternative account.\n⇒ React with ➖ remove an alternative account.\n⇒ React with 🔄 to switch your main account with one of your alternative account.\n⇒ React with ❌ to cancel this process.");

		if (userDb.otherAccountNames.length + 1 <= 8) {
			sbDesc.append("⇒ React with ➕ to verify an alternative account. Use this command if you recently got a name change.")
				.appendLine();
			reactions.push("➕");
		}

		if (userDb.otherAccountNames.length !== 0) {
			sbDesc.append("⇒ React with ➖ to remove an alternative account.")
				.appendLine();
			reactions.push("➖");

			sbDesc.append("⇒ React with 🔄 to switch your main account with one of your alternative account(s).")
				.appendLine();
			reactions.push("🔄");
		}

		sbDesc.append("⇒ React with ❌ to cancel this process.")
			.appendLine();
		reactions.push("❌");

		const m: Message = await dmChannel.send(selectionEmbed);
		for await (const emoji of reactions) {
			await m.react(emoji).catch(e => { });
		}

		const reactCollector: ReactionCollector = m.createReactionCollector(this.reactionCollectionFilter(reactions, msg), {
			time: 900000,
			max: 1
		});

		reactCollector.on("end", async (collected: Collection<string, MessageReaction>, reason: string) => {
			//console.log(reason); // => limit
		});

		reactCollector.on("collect", async (r: MessageReaction, u: User) => {
			await m.delete().catch(e => { });
			// add account or deal with name change
			if (r.emoji.name === "➕") {
				this.addAccount(msg, dmChannel, userDb);
			}
			// remove account
			else if (r.emoji.name === "➖") {

			}
			// switch main w/ alt
			else if (r.emoji.name === "🔄") {

			}
			// cancel
			else if (r.emoji.name === "❌") {
				return;
			}
		});
	}

	/**
	 * Precondition: The current amount of alternative accounts + LIMIT <= 8 
	 * If adding an extra account exceeds the limit, do not run.
	 * @param {Message} msg The author's message. 
	 * @param {DMChannel} dmChannel The DM Channel. 
	 * @param {IRaidUser} userDb The user db. 
	 */
	private async addAccount(msg: Message, dmChannel: DMChannel, userDb: IRaidUser): Promise<void> {
		const inGameName: string | "CANCEL_" | "TIME_" = await new Promise(async (resolve) => {
			const nameEmbed: MessageEmbed = new MessageEmbed()
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.setTitle("Verification For Profile")
				.setDescription("Please type your in-game name now. Your in-game name should be spelled exactly as seen in-game; however, capitalization does NOT matter.\n\nTo cancel this process, simply react with ❌.")
				.setColor("RANDOM")
				.setFooter("⏳ Time Remaining: 2 Minutes and 0 Seconds.");
			let botMsg: Message = await dmChannel.send(nameEmbed);
			for await (const [, reaction] of botMsg.reactions.cache) {
				for await (const [, user] of reaction.users.cache) {
					if (user.bot) {
						await reaction.remove();
						break;
					}
				}
			}
			await botMsg.react("❌");

			const mcd: MessageAutoTick = new MessageAutoTick(botMsg, nameEmbed, 2 * 60 * 1000, null, "⏳ Time Remaining: {m} Minutes and {s} Seconds.");
			const msgCollector: MessageCollector = new MessageCollector(dmChannel, m => m.author.id === msg.author.id, {
				time: 2 * 60 * 1000
			});

			//#region reaction collector
			const reactFilter: ((r: MessageReaction, u: User) => boolean) = (reaction: MessageReaction, user: User) => {
				return reaction.emoji.name === "❌" && user.id === msg.author.id;
			}

			const reactCollector: ReactionCollector = botMsg.createReactionCollector(reactFilter, {
				time: 2 * 60 * 1000,
				max: 1
			});

			reactCollector.on("collect", async () => {
				msgCollector.stop();
				await botMsg.delete().catch(() => { });
				return resolve("CANCEL_");
			});

			//#endregion

			msgCollector.on("collect", async (msg: Message) => {
				if (!/^[a-zA-Z]+$/.test(msg.content)) {
					await MessageUtil.send({ content: "Please type a __valid__ in-game name." }, msg.author);
					return;
				}

				if (msg.content.length > 10) {
					await MessageUtil.send({ content: "Your in-game name should not exceed 10 characters. Please try again." }, msg.author);
					return;
				}

				if (msg.content.length === 0) {
					await MessageUtil.send({ content: "Please type in a valid in-game name." }, msg.author);
					return;
				}

				const hasBeenUsedBefore: boolean = userDb.rotmgLowercaseName === msg.content.toLowerCase() || userDb.otherAccountNames
					.some(x => x.lowercase === msg.content.toLowerCase());

				if (hasBeenUsedBefore) {
					await MessageUtil.send({ content: "The in-game name you have chosen is already being used, either as your main account or as an alternative account." }, msg.author);
					return;
				}

				msgCollector.stop();
				reactCollector.stop();
				return resolve(msg.content);
			});

			msgCollector.on("end", (collected: Collection<string, Message>, reason: string) => {
				mcd.disableAutoTick();
				if (reason === "time") {
					return resolve("TIME_");
				}
			});
		});

		if (inGameName === "CANCEL_" || inGameName === "TIME_") {
			return;
		}

		const code: string = VerificationHandler.getRandomizedString(8);

		const embed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("Verification For Profile")
			.setDescription(`You have selected the in-game name: **\`${inGameName}\`**. To access your RealmEye profile, click [here](https://www.realmeye.com/player/${inGameName}).\n\nYou are almost done verifying; however, you need to do a few more things.\n\nTo stop the verification process, react with ❌.`)
			.setColor("RANDOM")
			.setFooter("⏳ Time Remaining: 15 Minutes and 0 Seconds.")
			.addField("1. Get Your Verification Code", `Your verification code is: ${StringUtil.applyCodeBlocks(code)}Please put this verification code in one of your three lines of your RealmEye profile's description.`)
			.addField("2. Check Profile Settings", `Ensure __anyone__ can view your name history. You can access your profile settings [here](https://www.realmeye.com/settings-of/${inGameName}). If you don't have your RealmEye account password, you can learn how to get one [here](https://www.realmeye.com/mreyeball#password).`)
			.addField("3. Wait", "Before you react with the check, make sure you wait. RealmEye may sometimes take up to 30 seconds to fully register your changes!")
			.addField("4. Confirm", "React with ✅ to begin the verification check. If you have already reacted, un-react and react again.");
		const verifMessage: Message = await dmChannel.send(embed);
		await verifMessage.react("✅").catch(() => { });
		await verifMessage.react("❌").catch(() => { });

		const mcd: MessageAutoTick = new MessageAutoTick(verifMessage, embed, 15 * 60 * 1000, null, "⏳ Time Remaining: {m} Minutes and {s} Seconds.");
		// collector function 
		const collFilter: (r: MessageReaction, u: User) => boolean = (reaction: MessageReaction, user: User) => {
			return ["✅", "❌"].includes(reaction.emoji.name) && user.id === msg.author.id;
		}

		// prepare collector
		const reactCollector: ReactionCollector = verifMessage.createReactionCollector(collFilter, {
			time: 15 * 60 * 1000
		});

		// end collector
		reactCollector.on("end", (collected: Collection<string, MessageReaction>, reason: string) => {
			mcd.disableAutoTick();
		});

		let canReact: boolean = true;

		reactCollector.on("collect", async (r: MessageReaction) => {
			if (!canReact) {
				return;
			}

			if (r.emoji.name === "❌") {
				reactCollector.stop();
				const embed: MessageEmbed = new MessageEmbed()
					.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
					.setTitle("Verification For Profile")
					.setColor("RED")
					.setDescription("You have stopped the verification process manually.")
					.setFooter("Profile Management System")
					.setTimestamp();
				await verifMessage.edit(embed);
				return;
			}

			canReact = false;
			// begin verification time

			let requestData: AxiosResponse<ITiffitNoUser | ITiffitRealmEyeProfile>;
			try {
				requestData = await Zero.AxiosClient
					.get<ITiffitNoUser | ITiffitRealmEyeProfile>(TiffitRealmEyeAPI + inGameName);
			}
			catch (e) {
				reactCollector.stop();
				await msg.author.send(`An error occurred when trying to connect to your RealmEye profile.\n\tError: ${e}`);
				return;
			}

			if ("error" in requestData.data) {
				await msg.author.send("I could not find your RealmEye profile; you probably made your profile private. Ensure your profile's visibility is set to public and try again.");
				canReact = true;
				return;
			}

			const nameFromProfile: string = requestData.data.name;
			let codeFound: boolean = false;
			for (let i = 0; i < requestData.data.description.length; i++) {
				if (requestData.data.description[i].includes(code)) {
					codeFound = true;
				}
			}

			if (!codeFound) {
				await msg.author.send(`Your verification code, \`${code}\`, wasn't found in your RealmEye description! Make sure the code is on your description and then try again.`);
				canReact = true;
				return;
			}

			if (requestData.data.last_seen !== "hidden") {
				await msg.author.send("Your last-seen location is not hidden. Please make sure __no one__ can see your last-seen location.");
				canReact = true;
				return;
			}

			let nameHistory: INameHistory[] | IAPIError;
			try {
				nameHistory = await VerificationHandler.getRealmEyeNameHistory(requestData.data.name);
			} catch (e) {
				reactCollector.stop();
				await msg.author.send(`An error occurred when trying to connect to your RealmEye profile.\n\tError: ${e}`);
				return;
			}

			if ("errorMessage" in nameHistory) {
				await msg.author.send("Your Name History is not public! Set your name history to public first and then try again.");
				canReact = true;
				return;
			}

			let nameToReplaceWith: string = "";
			for (const nameEntry of nameHistory) {
				for (const nameInDb of [userDb.rotmgLowercaseName, ...userDb.otherAccountNames.map(x => x.lowercase)]) {
					if (nameEntry.name.toLowerCase().trim() === nameInDb.trim()) {
						nameToReplaceWith = nameEntry.name;
					}
				}
			}

			// TODO might want to use VerificationHandler.accountInDatabase(...)
			//#region db
			const resolvedUserDbDiscord: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.MongoUserClient
				.findOne({ discordUserId: msg.author.id });

			const ignFilterQuery: FilterQuery<IRaidUser> = {
				$or: [
					{
						rotmgLowercaseName: nameFromProfile.toLowerCase()
					},
					{
						"otherAccountNames.lowercase": nameFromProfile.toLowerCase()
					}
				]
			};
			const resolvedUserDbIGN: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.MongoUserClient
				.findOne(ignFilterQuery);

			const statusSb: StringBuilder = new StringBuilder();

			// discord id found; ign NOT found in db
			// if we're adding an alt account
			// this should be the only boolean condition
			// that is true
			if (resolvedUserDbDiscord !== null && resolvedUserDbIGN === null) {
				let names: string[] = [
					resolvedUserDbDiscord.rotmgLowercaseName
					, ...resolvedUserDbDiscord.otherAccountNames.map(x => x.lowercase)
				];

				let isMainIGN: boolean = false;
				let nameToReplace: string | undefined;
				nameHistory.shift();
				if (nameHistory.length !== 0) {
					for (let i = 0; i < names.length; i++) {
						for (let j = 0; j < nameHistory.length; j++) {
							if (names[i] === nameHistory[j].name.toLowerCase()) {
								nameToReplace = nameHistory[j].name;
								if (i === 0) {
									isMainIGN = true;
								}
							}
						}
					}

					if (typeof nameToReplace === "undefined") {
						await VerificationHandler.newNameEntry(resolvedUserDbDiscord, msg.author, nameFromProfile);
						statusSb.append(`The name, \`${nameFromProfile}\`, has been added as an alternative account.`).appendLine();
					}
					else {
						if (isMainIGN) {
							await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne({ discordUserId: msg.author.id }, {
								$set: {
									rotmgDisplayName: nameFromProfile,
									rotmgLowercaseName: nameFromProfile.toLowerCase()
								}
							});
							statusSb.append(`Your old main account name, \`${nameToReplace}\`, has been replaced with your new name, \`${nameFromProfile}\`.`).appendLine();
						}
						else {
							await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne({
								discordUserId: msg.author.id,
								"otherAccountNames.lowercase": nameToReplace.toLowerCase()
							}, {
								$set: {
									"otherAccountNames.$.lowercase": nameFromProfile.toLowerCase(),
									"otherAccountNames.$.displayName": nameFromProfile
								}
							});
							statusSb.append(`Your old alternative account name, \`${nameToReplace}\`, has been replaced with your new name, \`${nameFromProfile}\`.`).appendLine();
						}
					}
				}
				else {
					// array length is 0
					// meaning no name history at all
					await VerificationHandler.newNameEntry(resolvedUserDbDiscord, msg.author, nameFromProfile);
					statusSb.append(`The name, \`${nameFromProfile}\`, has been added as an alternative account.`).appendLine();
				}
			}
			//#endregion

			// success!
			reactCollector.stop();
			const successEmbed: MessageEmbed = new MessageEmbed()
				.setTitle("Profile Manager: Successful Verification")
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.setDescription(statusSb.toString())
				.setColor("GREEN")
				.setFooter("Verification Process: Stopped.");
			await verifMessage.edit(successEmbed);

			// we need to check each guild
			// to see if we can replace the old
			// name with the new name
			if (nameToReplaceWith !== "") {
				// TODO make sure this works!
				const guildDocuments: IRaidGuild[] = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.find({}).toArray();
				for (const doc of guildDocuments) {
					const guild: Guild | undefined = Zero.RaidClient.guilds.cache.get(doc.guildID);
					if (typeof guild !== "undefined") {
						const member: GuildMember | undefined = guild.members.cache.get(msg.author.id);
						if (typeof member !== "undefined" && member.roles.cache.has(doc.roles.raider)) {
							const name: string = member.displayName;

							let allNames: string[] = name.split("|");
							let symbols: string = this.getSymbolsFromName(allNames[0]);
							allNames = allNames.map(x => x.trim().replace(/[^A-Za-z]/g, ""));
							for (let i = 0; i < allNames.length; i++) {
								if (allNames[i].toLowerCase() === nameToReplaceWith.toLowerCase()) {
									allNames[i] = nameToReplaceWith;
								}
							}

							// remove duplicates. 
							allNames = allNames
								.filter((item: string, index: number) => allNames.indexOf(item) === index);

							await member.setNickname(`${symbols}${allNames.join(" | ")}`)
								.catch(e => { });
						}
					}
				}
			}
		});
	}

	/**
	 * Precondition: There is at least 1 alt account.
	 * @param {Message} msg The author's message. 
	 * @param {DMChannel} dmChannel The DM Channel. 
	 * @param {IRaidUser} userDb The user db. 
	 */
	private async removeAccount(msg: Message, dmChannel: DMChannel, userDb: IRaidUser): Promise<void> {
		const altNames: string[] = userDb.otherAccountNames.map(x => x.lowercase);
		const currentAlts: StringBuilder = new StringBuilder();
		for (let i = 0; i < altNames.length; i++) {
			currentAlts.append(`**\`[${i}]\`** ${altNames[i]}`);
		}

		const removeAccEmbed: MessageEmbed = new MessageEmbed();

	}

	/**
	 * The reaction collector filter that can be used for all reaction collectors.
	 * @param {EmojiResolvable[]} reactions The reactions. 
	 * @param {Message} msg The message from the author.  
	 */
	private reactionCollectionFilter(reactions: EmojiResolvable[], msg: Message): ((r: MessageReaction, u: User) => boolean) {
		return (reaction: MessageReaction, user: User) => {
			return reactions.includes(reaction.emoji.name) && user.id === msg.author.id && !user.bot;
		}
	}

	/**
	 * Returns a string consisting of all symbols BEFORE any letters.
	 * @param {string} name The name. 
	 */
	private getSymbolsFromName(name: string): string {
		let symbols: string = "";
		for (let i = 0; i < name.length; i++) {
			if (!/^[A-Za-z]+$/.test(name[i])) {
				symbols += name[i];
				continue;
			}
			else {
				break;
			}
		}

		return symbols;
	}
}