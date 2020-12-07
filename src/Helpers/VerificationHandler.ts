import { Message, MessageCollector, MessageEmbed, GuildMember, Guild, MessageReaction, User, ReactionCollector, TextChannel, Collection, DMChannel, Role, GuildChannel } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { IRaidUser } from "../Templates/IRaidUser";
import { MessageAutoTick } from "../Classes/Message/MessageAutoTick";
import { StringUtil } from "../Utility/StringUtil";
import { ISection } from "../Templates/ISection";
import { MongoDbHelper } from "./MongoDbHelper";
import { MessageUtil } from "../Utility/MessageUtil";
import { Zero } from "../Zero";
import { RealmEyeAPILink } from "../Constants/ConstantVars";
import { StringBuilder } from "../Classes/String/StringBuilder";
import { AxiosResponse } from "axios";
import { FilterQuery, InsertOneWriteOpResult, WithId } from "mongodb";
import { ArrayUtil } from "../Utility/ArrayUtil";
import { INameHistory, IAPIError } from "../Definitions/ICustomREVerification";
import { UserHandler } from "./UserHandler";
import { GuildUtil } from "../Utility/GuildUtil";
import { IManualVerification } from "../Definitions/IManualVerification";
import { IRealmEyeNoUser } from "../Definitions/IRealmEyeNoUser";
import { IRealmEyeAPI } from "../Definitions/IRealmEyeAPI";
import { UserAvailabilityHelper } from "./UserAvailabilityHelper";
import { IBlacklistedUser } from "../Definitions/IBlacklistedUser";
import { IVerification } from "../Templates/IVerification";

export module VerificationHandler {
	// TODO make this a set? 
	export const IsInVerification: Collection<string, "GENERAL" | "ALT"> = new Collection<string, "GENERAL" | "ALT">();
	export const PeopleThatWereMessaged: Set<string> = new Set();
	export const DefaultVerification: IVerification = {
		stars: {
			required: false,
			minimum: 0
		},

		/**
		 * Minimum alive fame required for membership.
		 */
		aliveFame: {
			required: false,
			minimum: 0
		},

		/**
		 * Minimum character points required for membership.
		 */
		maxedStats: {
			required: false,
			statsReq: [0, 0, 0, 0, 0, 0, 0, 0, 0] // [0/8, 1/8, 2/8, 3/8, 4/8, 5/8, 6/8, 7/8, 8/8]
		}
	};

	interface ICheckResults {
		characters: {
			amt: [number, number, number, number, number, number, number, number, number];
			passed: boolean;
			hidden: boolean;
		};

		aliveFame: {
			amt: number;
			passed: boolean;
		};

		rank: {
			amt: number;
			passed: boolean;
		}

		passedAll: boolean;
	}

	/**
	 * Verifies a user.
	 * @param {GuildMember} member The member to verify. 
	 * @param {Guild} guild The guild. 
	 * @param {IRaidGuild} guildDb The guild doc. 
	 * @param {ISection} section The section to verify the member in. Contains channel information.
	 * @param {string} calledFrom Where the function was called from.
	 */
	export async function verifyUser(
		member: GuildMember,
		guild: Guild,
		guildDb: IRaidGuild,
		section: ISection,
		calledFrom: "REACT" | "COMMAND"
	): Promise<void> {
		// already verified or no role
		if (!guild.roles.cache.has(section.verifiedRole)
			|| member.roles.cache.has(section.verifiedRole)
			|| IsInVerification.has(member.id)) {
			return;
		}

		const verifiedRole: Role = guild.roles.cache.get(section.verifiedRole) as Role;

		// channel declaration
		// yes, we know these can be textchannels b/c that's the input in configsections
		const verificationAttemptsChannel: TextChannel | undefined = guild.channels.cache
			.get(section.channels.logging.verificationAttemptsChannel) as TextChannel | undefined;
		const verificationSuccessChannel: TextChannel | undefined = guild.channels.cache
			.get(section.channels.logging.verificationSuccessChannel) as TextChannel | undefined;
		const manualVerificationChannel: TextChannel | undefined = guild.channels.cache
			.get(section.channels.manualVerification) as TextChannel | undefined;

		const verificationChannel: GuildChannel | undefined = guild.channels.cache
			.get(section.channels.verificationChannel);

		if (typeof verificationChannel === "undefined") {
			return;
		}

		const allSections: ISection[] = [GuildUtil.getDefaultSection(guildDb), ...guildDb.sections];
		for (const section of allSections) {
			if (section.channels.verificationChannel !== verificationChannel.id) {
				continue;
			}
			const manualVerifEntry: IManualVerification | undefined = section.properties.manualVerificationEntries
				.find(x => x.userId === member.id);
			if (typeof manualVerifEntry === "undefined") {
				continue;
			}

			await member.send(`**\`[${section.isMain ? guild.name : section.nameOfSection}]\`** Your profile is currently under manual verification. Please try again later.`);
			return;
		}

		//#region requirement text
		let reqs: StringBuilder = new StringBuilder()
			.append("• Public Profile.")
			.appendLine()
			.append("• Private \"Last Seen\" Location.")
			.appendLine()
			.append("• Public Name History.")
			.appendLine();

		if (section.properties.showVerificationRequirements) {
			if (section.verification.aliveFame.required) {
				reqs.append(`• ${section.verification.aliveFame.minimum} Alive Fame.`)
					.appendLine();
			}

			if (section.verification.stars.required) {
				reqs.append(`• ${section.verification.stars.minimum} Stars.`)
					.appendLine();
			}

			if (section.verification.maxedStats.required) {
				for (let i = 0; i < section.verification.maxedStats.statsReq.length; i++) {
					if (section.verification.maxedStats.statsReq[i] !== 0) {
						reqs.append(`• ${section.verification.maxedStats.statsReq[i]} ${i}/8 Character(s).`)
							.appendLine();
					}
				}
			}
		}

		//#endregion
		let dmChannel: DMChannel;

		try {
			dmChannel = await member.user.createDM();
			await dmChannel.send("This is a check to make sure I can DM you. Please ignore it; the real verification message will come soon.")
				.then(x => x.delete());
		}
		catch (e) {
			if (typeof verificationAttemptsChannel !== "undefined") {
				verificationAttemptsChannel.send(`🔇 **\`[${section.nameOfSection}]\`** ${member} tried to verify, but his or her DMs were set so no one can message him or her.`).catch(() => { });
			}

			if (PeopleThatWereMessaged.has(member.id)) {
				return;
			}
			else {
				MessageUtil.send({ content: `${member}, I am unable to message you. Please make sure your privacy settings are set so anyone can DM you.` }, verificationChannel as TextChannel);
			}
			PeopleThatWereMessaged.add(member.id);
			setTimeout(() => {
				PeopleThatWereMessaged.delete(member.id);
			}, 5000);
			return;
		}

		// within the server we will be checking for other major reqs.
		if (section.isMain) {
			IsInVerification.set(member.id, "GENERAL");
			UserAvailabilityHelper.InMenuCollection.set(member.id, UserAvailabilityHelper.MenuType.VERIFICATION);

			const userDb: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.getUserDbByDiscordId(member.id);
			let inGameName: string = "";

			let isOldProfile: boolean = false;

			if (typeof verificationAttemptsChannel !== "undefined") {
				verificationAttemptsChannel.send(`▶️ **\`[${section.nameOfSection}]\`** ${member} has started the verification process through the ${calledFrom === "COMMAND" ? "verify command" : "verification embed reaction"}.`).catch(() => { });
			}

			if (userDb !== null) {
				const hasNameEmbed: MessageEmbed = new MessageEmbed()
					.setAuthor(member.user.tag, member.user.displayAvatarURL())
					.setTitle(`Verification For: **${guild.name}**`)
					.setDescription(`It appears that the name, **\`${userDb.rotmgDisplayName}\`**, is linked to this Discord account. Do you want to verify using this in-game name? Type \`yes\` or \`no\`.`)
					.setFooter("⏳ Time Remaining: 2 Minutes and 0 Seconds.")
					.setColor("RANDOM");

				const choice: boolean | "CANCEL_CMD" | "TIME_CMD" = await new Promise(async (resolve) => {
					let botMsg = await dmChannel.send(hasNameEmbed);
					const mc1: MessageAutoTick = new MessageAutoTick(
						botMsg,
						hasNameEmbed,
						2 * 60 * 1000,
						null,
						"⏳ Time Remaining: {m} Minutes and {s} Seconds."
					);

					const msgCollector: MessageCollector = new MessageCollector(dmChannel, m => m.author.id === member.id, {
						time: 2 * 60 * 1000
					});

					msgCollector.on("end", (collected: Collection<string, Message>, reason: string) => {
						mc1.disableAutoTick();
						botMsg.delete().catch(e => { });
						if (reason === "time") {
							return resolve("TIME_CMD");
						}
					});

					msgCollector.on("collect", async (respMsg: Message) => {
						if (respMsg.content.toLowerCase() === "cancel") {
							msgCollector.stop();
							return resolve("CANCEL_CMD");
						}

						if (["yes", "ye", "y"].includes(respMsg.content.toLowerCase())) {
							msgCollector.stop();
							return resolve(true);
						}

						if (["no", "n"].includes(respMsg.content.toLowerCase())) {
							msgCollector.stop();
							return resolve(false);
						}
					});
				});

				if (choice === "TIME_CMD" || choice === "CANCEL_CMD") {
					UserAvailabilityHelper.InMenuCollection.delete(member.id);
					return;
				}

				if (choice) {
					inGameName = userDb.rotmgDisplayName;
					isOldProfile = true;
				}
			}

			if (inGameName === "") { // TODO implement
				const nameToUse: string | "CANCEL_" | "TIME_" = await getInGameNameByPrompt(
					member.user,
					dmChannel,
					guild,
					null
				);

				if (nameToUse === "CANCEL_" || nameToUse === "TIME_") {
					if (typeof verificationAttemptsChannel !== "undefined") {
						verificationAttemptsChannel.send(`❌ **\`[${section.nameOfSection}]\`** ${member}'s verification process has been canceled.\n\t⇒ Reason: ${nameToUse.substring(0, nameToUse.length - 1)}`).catch(() => { });
					}
					IsInVerification.delete(member.id);
					UserAvailabilityHelper.InMenuCollection.delete(member.id);
					return;
				}

				inGameName = nameToUse;
			}

			const code: string = getRandomizedString(8);
			if (typeof verificationAttemptsChannel !== "undefined") {
				verificationAttemptsChannel.send(`⌛ **\`[${section.nameOfSection}]\`** ${member} will be trying to verify under the in-game name \`${inGameName}\`.`)
					.catch(() => { });
			}

			// verification embed
			const verifEmbed: MessageEmbed = getVerificationEmbed(guild, inGameName, isOldProfile, code);
			const verifMessage: Message = await dmChannel.send(verifEmbed);
			await verifMessage.react("✅").catch(() => { });
			await verifMessage.react("❌").catch(() => { });

			const mcd: MessageAutoTick = new MessageAutoTick(verifMessage, verifEmbed, 15 * 60 * 1000, null, "⏳ Time Remaining: {m} Minutes and {s} Seconds.");
			// collector function 
			const collFilter: (r: MessageReaction, u: User) => boolean = (reaction: MessageReaction, user: User) => {
				return ["✅", "❌"].includes(reaction.emoji.name) && user.id === member.id;
			}

			// prepare collector
			const reactCollector: ReactionCollector = verifMessage.createReactionCollector(collFilter, {
				time: 15 * 60 * 1000
			});

			// end collector
			reactCollector.on("end", async (collected: Collection<string, MessageReaction>, reason: string) => {
				mcd.disableAutoTick();
				await verifMessage.delete().catch(e => { });
				setTimeout(() => {
					IsInVerification.delete(member.id);
					UserAvailabilityHelper.InMenuCollection.delete(member.id);
				}, 15 * 1000);
				if (reason === "time") {
					if (typeof verificationAttemptsChannel !== "undefined") {
						verificationAttemptsChannel.send(`❌ **\`[${section.nameOfSection}]\`** ${member}'s verification process has been canceled.\n\t⇒ Reason: TIME`).catch(() => { });
					}
					const embed: MessageEmbed = new MessageEmbed()
						.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
						.setTitle(`Verification For: **${guild.name}**`)
						.setColor("RED")
						.setDescription("Your verification process has been stopped because the time limit has been reached.")
						.setFooter(guild.name)
						.setTimestamp();
					await dmChannel.send(embed).catch(e => { });
				}
			});

			let canReact: boolean = true;

			reactCollector.on("collect", async (r: MessageReaction) => {
				if (!canReact) {
					return;
				}

				if (r.emoji.name === "❌") {
					reactCollector.stop();
					if (typeof verificationAttemptsChannel !== "undefined") {
						verificationAttemptsChannel.send(`❌ **\`[${section.nameOfSection}]\`** ${member} has canceled the verification process.`).catch(() => { });
					}
					const embed: MessageEmbed = new MessageEmbed()
						.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
						.setTitle(`Verification For: **${guild.name}**`)
						.setColor("RED")
						.setDescription("You have stopped the verification process manually.")
						.setFooter(guild.name)
						.setTimestamp();
					await dmChannel.send(embed).catch(e => { });
					return;
				}

				canReact = false;
				// begin verification time

				let requestData: AxiosResponse<IRealmEyeNoUser | IRealmEyeAPI>;
				try {
					requestData = await Zero.AxiosClient
						.get<IRealmEyeNoUser | IRealmEyeAPI>(RealmEyeAPILink + inGameName);
				}
				catch (e) {
					reactCollector.stop();
					if (typeof verificationAttemptsChannel !== "undefined") {
						verificationAttemptsChannel.send(`⛔ **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but an error has occurred when trying to access the player's profile. The process has been stopped automatically.\n\t⇒ Error: ${e}`);
					}
					const failedEmbed: MessageEmbed = new MessageEmbed()
						.setTitle(`Verification For: **${guild.name}**`)
						.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
						.setDescription("An error has occurred when trying to verify you. This is most likely because RealmEye is down or slow. Please review the error message below.")
						.addField("Error Message", StringUtil.applyCodeBlocks(e))
						.setColor("RED")
						.setFooter("Verification Process: Stopped.");
					await dmChannel.send(failedEmbed).catch(e => { });
					return;
				}

				if ("error" in requestData.data) {
					if (typeof verificationAttemptsChannel !== "undefined") {
						verificationAttemptsChannel.send(`🚫 **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but the name could not be found on RealmEye.`).catch(() => { });
					}
					await member.send("I could not find your RealmEye profile; you probably made your profile private. Ensure your profile's visibility is set to public and try again.");
					canReact = true;
					return;
				}

				// get name history
				let nameHistory: INameHistory[] | IAPIError;
				try {
					nameHistory = await getRealmEyeNameHistory(requestData.data.player);
				} catch (e) {
					reactCollector.stop();
					if (typeof verificationAttemptsChannel !== "undefined") {
						verificationAttemptsChannel.send(`⛔ **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but an error has occurred when trying to access the player's Name History. The process has been stopped automatically.\n\t⇒ Error: ${e}`);
					}
					const failedEmbed: MessageEmbed = new MessageEmbed()
						.setTitle(`Verification For: **${guild.name}**`)
						.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
						.setDescription("An error has occurred when trying to check your Name History. This is most likely because RealmEye is down or slow. Please review the error message below.")
						.addField("Error Message", StringUtil.applyCodeBlocks(e))
						.setColor("RED")
						.setFooter("Verification Process: Stopped.");
					await dmChannel.send(failedEmbed).catch(e => { });
					return;
				}

				if ("errorMessage" in nameHistory) {
					if (typeof verificationAttemptsChannel !== "undefined") {
						verificationAttemptsChannel.send(`🚫 **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but his or her name history is not available to the public.`).catch(() => { });
					}
					await member.send("Your Name History is not public! Set your name history to public first and then try again.");
					canReact = true;
					return;
				}

				const nameFromProfile: string = requestData.data.player;
				if (!isOldProfile) {
					let codeFound: boolean = false;
					let description: string[] = [
						requestData.data.desc1,
						requestData.data.desc2,
						requestData.data.desc3
					]
					for (let i = 0; i < description.length; i++) {
						if (description[i].includes(code)) {
							codeFound = true;
						}
					}

					if (!codeFound) {
						if (typeof verificationAttemptsChannel !== "undefined") {
							verificationAttemptsChannel.send(`🚫 **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but the verification code, \`${code}\`, could not be found in his/her RealmEye profile.`).catch(() => { });
						}
						await member.send(`Your verification code, \`${code}\`, wasn't found in your RealmEye description! Make sure the code is on your description and then **try again in one minute!**`);
						canReact = true;
						return;
					}
				}

				// we know this is the right person.
				// BLACKLIST CHECK
				for (const blacklistEntry of guildDb.moderation.blacklistedUsers) {
					for (const nameEntry of [nameFromProfile, ...nameHistory.map(x => x.name)]) {
						if (blacklistEntry.inGameName.toLowerCase() === nameEntry.toLowerCase()) {
							reactCollector.stop();
							if (typeof verificationAttemptsChannel !== "undefined") {
								verificationAttemptsChannel.send(`⛔ **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but the in-game name, \`${nameEntry}\`${nameEntry.toLowerCase() === nameFromProfile.toLowerCase() ? "" : " (found in Name History)"}, has been blacklisted due to the following reason: ${blacklistEntry.reason}`).catch(() => { });
							}
							const failedEmbed: MessageEmbed = new MessageEmbed()
								.setTitle(`Verification For: **${guild.name}**`)
								.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
								.setDescription("You have been blacklisted from the server; as a result, you are not able to verify.")
								.setColor("RANDOM")
								.addField("Blacklist Reason", blacklistEntry.reason)
								.setFooter("Verification Process: Stopped.");
							await dmChannel.send(failedEmbed).catch(e => { });
							return;
						}
					}
				}

				// if they passed, let's see if they have a guild doc
				// with the bot
				// we want to make sure they didn't just get a new
				// realm account and decided to use their old discord account
				// that was previous associated with a blacklisted name
				if (userDb !== null) {
					const namesAssociatedWithDb: string[] = [
						userDb.rotmgLowercaseName,
						...userDb.otherAccountNames.map(x => x.lowercase)
					];

					let prevBlacklistedUser: IBlacklistedUser | undefined;
					for (const nameBlProfile of guildDb.moderation.blacklistedUsers) {
						for (const associatedNames of namesAssociatedWithDb) {
							if (nameBlProfile.inGameName.toLowerCase() === associatedNames.toLowerCase()) {
								prevBlacklistedUser = nameBlProfile;
								break;
							}
						}
					}


					if (typeof prevBlacklistedUser !== "undefined") {
						reactCollector.stop();
						if (typeof verificationAttemptsChannel !== "undefined") {
							verificationAttemptsChannel.send(`⛔ **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`; however, this Discord account has one or more IGNs linked to it that is blacklisted from the server.\n- Blacklisted Name: ${prevBlacklistedUser.inGameName}\n- Reason: ${prevBlacklistedUser.reason}.`).catch(() => { });
						}
						const failedEmbed: MessageEmbed = new MessageEmbed()
							.setTitle(`Verification For: **${guild.name}**`)
							.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
							.setDescription("Your Discord account has one or more IGNs linked to it that is blacklisted from the server. As a result, you are not able to verify with this server at this time.")
							.setColor("RANDOM")
							.addField("Blacklist Reason", prevBlacklistedUser.reason)
							.setFooter("Verification Process: Stopped.");
						await dmChannel.send(failedEmbed).catch(e => { });
						return;
					}
				}

				// now back to regular checking
				if (requestData.data.player_last_seen !== "hidden") {
					if (typeof verificationAttemptsChannel !== "undefined") {
						verificationAttemptsChannel.send(`🚫 **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but his/her last-seen location is not hidden.`).catch(() => { });
					}
					await member.send("Your last-seen location is not hidden. Please make sure __no one__ can see your last-seen location.");
					canReact = true;
					return;
				}

				const prelimCheck: ICheckResults = preliminaryCheck(section, requestData.data);
				if (!prelimCheck.passedAll) {
					if (section.verification.maxedStats.required && prelimCheck.characters.hidden) {
						if (typeof verificationAttemptsChannel !== "undefined") {
							verificationAttemptsChannel.send(`🚫 **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but his/her characters are hidden and needs to be available to the public.`).catch(() => { });
						}
						await member.send("Your characters are currently hidden. Please make sure everyone can see your characters.");
						canReact = true;
						return;
					}

					const reqsFailedToMeet: StringBuilder = new StringBuilder();
					if (!prelimCheck.aliveFame.passed) {
						reqsFailedToMeet
							.append(`Alive Fame: ${prelimCheck.aliveFame.amt}/${section.verification.aliveFame.minimum}`)
							.appendLine();
					}

					if (!prelimCheck.rank.passed) {
						reqsFailedToMeet
							.append(`Rank: ${prelimCheck.rank.amt}/${section.verification.stars.minimum}`)
							.appendLine();
					}

					if (!prelimCheck.characters.passed) {
						let strChar: string = "";
						for (let i = 0; i < prelimCheck.characters.amt.length; i++) {
							strChar += `⇒ ${i}/8 Characters: ${prelimCheck.characters.amt[i]}/${section.verification.maxedStats.statsReq[i]}\n`;
						}
						reqsFailedToMeet.append("Characters: See List.")
							.appendLine()
							.append(strChar);
					}

					// MANUAL VERIF
					reactCollector.stop();
					let outputLogs: string = `⛔ **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but his/her RotMG profile has failed to meet one or more requirement(s). The requirements that were not met are listed below.${StringUtil.applyCodeBlocks(reqsFailedToMeet.toString())}`;


					const failedEmbed: MessageEmbed = new MessageEmbed()
						.setTitle(`Verification For: **${guild.name}**`)
						.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
						.setColor("RED");

					if (typeof manualVerificationChannel === "undefined") {
						failedEmbed
							.setFooter("Verification Process: Stopped.");
						if (section.properties.showVerificationRequirements) {
							failedEmbed
								.setDescription("You have failed to meet the requirements for the server. Please review the below requirements you have failed to meet and make note of them.")
								.addField("Requirements Missed", reqsFailedToMeet.toString());
						}
						else {
							failedEmbed
								.setDescription("You have failed to meet the requirements for the server. If you feel this is in error, please contact a staff member or go to #help-desk");
						}
					}
					else {
						failedEmbed
							.setDescription("Your account is now under manual review by staff. Please do not attempt to verify again. If your account is not reviewed within the next 48 hours, please contact the staff through #help-desk or message an online helper or moderator. Otherwise, please refrain from messaging staff about your application review status. ")
							.setFooter("Verification Process: Stopped.");
						manualVerification(guild, member, requestData.data, manualVerificationChannel, section, reqsFailedToMeet, nameHistory);
						outputLogs += `\nThis profile has been sent to the manual verification channel for further review.`;
					}
					await dmChannel.send(failedEmbed).catch(e => { });

					if (typeof verificationAttemptsChannel !== "undefined") {
						verificationAttemptsChannel.send(outputLogs).catch(() => { });
					}
					return;
				}

				// success!
				await member.roles.add(verifiedRole);
				await member.setNickname(member.user.username === requestData.data.player ? `${requestData.data.player}.` : requestData.data.player).catch(() => { });

				reactCollector.stop();
				const successEmbed: MessageEmbed = new MessageEmbed()
					.setTitle(`Successful Verification: **${guild.name}**`)
					.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
					.setDescription(guildDb.properties.successfulVerificationMessage.length === 0 ? "You have been successfully verified. Please make sure you read the rules posted in the server, if any, and any other regulations/guidelines. Good luck and have fun!" : guildDb.properties.successfulVerificationMessage)
					.setColor("GREEN")
					.setFooter("Verification Process: Stopped.");
				await dmChannel.send(successEmbed).catch(e => { });
				if (typeof verificationSuccessChannel !== "undefined") {
					verificationSuccessChannel.send(`📥 **\`[${section.nameOfSection}]\`** ${member} has successfully been verified as \`${inGameName}\`.`).catch(console.error);
				}

				await accountInDatabase(member, nameFromProfile, nameHistory);
				await findOtherUserAndRemoveVerifiedRole(member, guild, guildDb);
			});
		}
		// SECTION
		// VERIFICATION
		// THIS PART
		// WILL NOT
		// BE TOUCHING
		// THE DB
		// AT ALL
		else {
			const name: string = member.displayName
				.split("|")
				.map(x => x.trim())[0]
				.replace(/[^A-Za-z]/g, "");
			if (typeof verificationAttemptsChannel !== "undefined") {
				verificationAttemptsChannel.send(`▶️ **\`[${section.nameOfSection}]\`** ${member} has started the verification process.`).catch(() => { });
			}
			if (!section.verification.aliveFame.required
				&& !section.verification.maxedStats.required
				&& !section.verification.stars.required) {

				if (typeof verificationSuccessChannel !== "undefined") {
					verificationSuccessChannel.send(`📥 **\`[${section.nameOfSection}]\`** ${member} has received the section member role.`).catch(() => { });
				}
				await member.roles.add(verifiedRole);
				await member.send(`**\`[${guild.name}]\`**: You have successfully been verified in the **\`${section.nameOfSection}\`** section!`).catch(() => { });
				return;
			}

			const requestData: AxiosResponse<IRealmEyeNoUser | IRealmEyeAPI> = await Zero.AxiosClient
				.get<IRealmEyeNoUser | IRealmEyeAPI>(RealmEyeAPILink + name);
			if ("error" in requestData.data) {
				if (typeof verificationAttemptsChannel !== "undefined") {
					verificationAttemptsChannel.send(`🚫 **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${name}\`, but the name could not be found on RealmEye.`).catch(() => { });
				}
				await member.send(`I could not find your profile for **\`${name}\`** on RealmEye. Make sure your profile is public first!`);
				return;
			}

			const prelimCheck: ICheckResults = preliminaryCheck(section, requestData.data);
			// TODO make prelim check handle into a function? 
			if (!prelimCheck.passedAll) {
				if (section.verification.maxedStats.required && prelimCheck.characters.hidden) {
					if (typeof verificationAttemptsChannel !== "undefined") {
						verificationAttemptsChannel.send(`🚫 **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${name}\`, but his/her characters are hidden and needs to be available to the public.`).catch(() => { });
					}
					await member.send("Your characters are currently hidden. Please make sure everyone can see your characters.");
					return;
				}

				let botMsg: Message | null;
				try {
					botMsg = await member.send(new MessageEmbed());
				}
				catch (e) {
					botMsg = null;
				}

				const reqsFailedToMeet: StringBuilder = new StringBuilder();
				if (!prelimCheck.aliveFame.passed) {
					reqsFailedToMeet.append(`Alive Fame: ${prelimCheck.aliveFame.amt}/${section.verification.aliveFame.minimum}`)
						.appendLine();
				}

				if (!prelimCheck.rank.passed) {
					reqsFailedToMeet.append(`Rank: ${prelimCheck.rank.amt}/${section.verification.stars.minimum}`)
						.appendLine();
				}

				if (!prelimCheck.characters.passed) {
					let strChar: string = "";
					for (let i = 0; i < prelimCheck.characters.amt.length; i++) {
						strChar += `⇒ ${i}/8 Characters: ${prelimCheck.characters.amt[i]}/${section.verification.maxedStats.statsReq[i]}\n`;
					}
					reqsFailedToMeet.append("Characters: See List.")
						.appendLine()
						.append(strChar);
				}

				// MANUAL VERIF
				let outputLogs: string = `⛔ **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${name}\`, but his/her RotMG profile has failed to meet one or more requirement(s). The requirements that were not met are listed below.${StringUtil.applyCodeBlocks(reqsFailedToMeet.toString())}`;


				const failedEmbed: MessageEmbed = new MessageEmbed()
					.setTitle(`Verification For: **${guild.name}** ⇒ **${section.nameOfSection}**`)
					.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
					.setColor("RED");

				if (typeof manualVerificationChannel === "undefined") {
					failedEmbed
						.setFooter("Verification Process: Stopped.");
					if (section.properties.showVerificationRequirements) {
						failedEmbed
							.setDescription("You have failed to meet the requirements for the section. Please review the below requirements you have failed to meet and make note of them.")
							.addField("Requirements Missed", reqsFailedToMeet.toString());
					}
					else {
						failedEmbed
							.setDescription("You have failed one or more requirements for the section. Requirements are generally hidden for multiple reasons; one of the most prominent reasons is to combat alternative accounts. If you feel this is in error, please contact a staff member or go to #help-desk");
					}
				}
				else {
					failedEmbed
						.setDescription("Your account is now under manual review by staff. Please do not attempt to verify again through this specific section. If your account is not reviewed within the next 48 hours, please contact the staff through #help-desk or message an online helper or moderator. Otherwise, please refrain from messaging staff about your application review status. ")
						.setFooter("Verification Process: Stopped.");
					manualVerification(guild, member, requestData.data, manualVerificationChannel, section, reqsFailedToMeet);
					outputLogs += `\nThis profile has been sent to the manual verification channel for further review.`;
				}

				if (botMsg !== null) {
					await botMsg.edit(failedEmbed).catch(() => { });
				}

				if (typeof verificationAttemptsChannel !== "undefined") {
					verificationAttemptsChannel.send(outputLogs).catch(() => { });
				}
				return;
			}

			if (typeof verificationSuccessChannel !== "undefined") {
				verificationSuccessChannel.send(`📥 **\`[${section.nameOfSection}]\`** ${member} has received the section member role.`).catch(() => { });
			}
			await member.roles.add(verifiedRole).catch(() => { });
			await member.send(`**\`[${guild.name}]\`**: You have successfully been verified in the **\`${section.nameOfSection}\`** section!`).catch(() => { });
			return;
		}
	}

	/**
	 * Adds the account to the database, or if the account exists, modifies it.
	 * @param {(GuildMember | User)} member The guild member that has been verified. 
	 * @param {string} nameFromProfile The name associated with the guild member. 
	 * @param {INameHistory[]} nameHistory The person's name history. 
	 */
	export async function accountInDatabase(
		member: GuildMember | User,
		nameFromProfile: string,
		nameHistory: INameHistory[]
	): Promise<void> {
		const resolvedUserDbDiscord: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.MongoUserClient
			.findOne({ discordUserId: member.id });
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

		// they somehow have two profile
		// probably because they had an alt account w/ an alt discord account
		if (resolvedUserDbDiscord !== null && resolvedUserDbIGN !== null) {
			await verifyMoreThanOneIGNProfile(member, nameFromProfile);
		}
		// completely new profile
		else if (resolvedUserDbDiscord === null && resolvedUserDbIGN === null) {
			const userMongo: MongoDbHelper.MongoDbUserManager = new MongoDbHelper.MongoDbUserManager(nameFromProfile);
			await userMongo.createNewUserDB(member.id);
		}
		else {
			// discord id found; ign NOT found in db
			// probably means name history changed? 
			// or separate account.
			if (resolvedUserDbDiscord !== null && resolvedUserDbIGN === null) {
				let names: string[] = [
					resolvedUserDbDiscord.rotmgLowercaseName,
					...resolvedUserDbDiscord.otherAccountNames.map(x => x.lowercase)
				];
				let isMainIGN: boolean = false;
				let nameToReplace: string | undefined;
				nameHistory.shift(); // will remove the first name, which is the current name
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
						// name history doesn't correspond to anything
						await newNameEntry(resolvedUserDbDiscord, member, nameFromProfile);
					}
					else {
						if (isMainIGN) {
							await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne({ discordUserId: member.id }, {
								$set: {
									rotmgDisplayName: nameFromProfile,
									rotmgLowercaseName: nameFromProfile.toLowerCase()
								}
							});
						}
						else {
							await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne({
								discordUserId: member.id,
								"otherAccountNames.lowercase": nameToReplace.toLowerCase()
							}, {
								$set: {
									"otherAccountNames.$.lowercase": nameFromProfile.toLowerCase(),
									"otherAccountNames.$.displayName": nameFromProfile
								}
							});
						}
					}
				}
				else {
					// array length is 0
					// meaning no name history at all
					await newNameEntry(resolvedUserDbDiscord, member, nameFromProfile);
				}
			}
			// ign found in db; discord id NOT found in db.
			else if (resolvedUserDbIGN !== null && resolvedUserDbDiscord === null) {
				await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne(ignFilterQuery, {
					$set: {
						discordUserId: member.id
					}
				});
			}
		}
	}

	/**
	 * Checks and see if a user has two profiles in the database; if so, merge both profiles together. 
	 * @param {(GuildMember | User)} member The guild member that has been verified. 
	 * @param {string} nameFromProfile The name associated with the guild member. 
	 * @param {INameHistory[]} nameHistory The person's name history. 
	 */
	export async function verifyMoreThanOneIGNProfile(
		member: GuildMember | User,
		nameFromProfile: string
	): Promise<IRaidUser> {
		const filterQuery: FilterQuery<IRaidUser> = {
			$or: [
				{
					rotmgLowercaseName: nameFromProfile.toLowerCase()
				},
				{
					"otherAccountNames.lowercase": nameFromProfile.toLowerCase()
				},
				{
					discordUserId: member.id
				}
			]
		};
		const allPossibleEntries: IRaidUser[] = await MongoDbHelper.MongoDbUserManager.MongoUserClient
			.find(filterQuery).toArray();

		if (allPossibleEntries.length === 0) {
			throw new Error("no profiles found");
		}

		if (allPossibleEntries.length === 1) {
			return allPossibleEntries[0];
		}

		// have multiple entries
		const newEntry: IRaidUser = {
			discordUserId: member.id,
			rotmgDisplayName: nameFromProfile,
			rotmgLowercaseName: nameFromProfile.toLowerCase(),
			otherAccountNames: [],
			lastModified: new Date().getTime(),
			general: {
				keyPops: [],
				voidVials: [],
				wcOryx: [],
				completedRuns: [],
				leaderRuns: [],
				moderationHistory: []
			}
		};

		const isNotListed: (name: string) => boolean = (name: string) => newEntry.rotmgLowercaseName !== name.toLowerCase()
			&& !newEntry.otherAccountNames.some(x => x.lowercase === name.toLowerCase());

		// start transferring data
		for (const entry of allPossibleEntries) {
			// main acc name of entry different from name of profile
			if (isNotListed(entry.rotmgDisplayName)) {
				newEntry.otherAccountNames.push({
					lowercase: entry.rotmgLowercaseName,
					displayName: entry.rotmgDisplayName
				});
			}

			for (const altAcc of entry.otherAccountNames) {
				if (isNotListed(altAcc.displayName)) {
					newEntry.otherAccountNames.push({
						lowercase: altAcc.lowercase,
						displayName: altAcc.displayName
					});
				}
			}

			for (const keyPopData of entry.general.keyPops) {
				const index: number = newEntry.general.keyPops.findIndex(x => x.server === keyPopData.server);
				if (index === -1) {
					// data doesn't exist
					newEntry.general.keyPops.push({ server: keyPopData.server, keysPopped: keyPopData.keysPopped });
				}
				else {
					newEntry.general.keyPops[index].keysPopped += keyPopData.keysPopped;
				}
			}

			for (const voidVialData of entry.general.voidVials) {
				const index: number = newEntry.general.voidVials.findIndex(x => x.server === voidVialData.server);
				if (index === -1) {
					// not found
					newEntry.general.voidVials.push({ popped: voidVialData.popped, stored: voidVialData.stored, server: voidVialData.server });
				}
				else {
					newEntry.general.voidVials[index].popped += voidVialData.popped;
					newEntry.general.voidVials[index].stored += voidVialData.stored;
				}
			}

			for (const wcRunData of entry.general.wcOryx) {
				const index: number = newEntry.general.wcOryx.findIndex(x => x.server === wcRunData.server);
				if (index === -1) {
					// nope
					newEntry.general.wcOryx.push({ wcIncs: { amt: wcRunData.wcIncs.amt, popped: wcRunData.wcIncs.popped }, swordRune: { amt: wcRunData.swordRune.amt, popped: wcRunData.swordRune.popped }, helmRune: { amt: wcRunData.helmRune.amt, popped: wcRunData.helmRune.popped }, shieldRune: { amt: wcRunData.shieldRune.amt, popped: wcRunData.shieldRune.popped }, server: wcRunData.server });
				}
				else {
					newEntry.general.wcOryx[index].helmRune.amt += wcRunData.helmRune.amt;
					newEntry.general.wcOryx[index].helmRune.popped += wcRunData.helmRune.popped;
					newEntry.general.wcOryx[index].shieldRune.amt += wcRunData.shieldRune.amt;
					newEntry.general.wcOryx[index].shieldRune.popped += wcRunData.shieldRune.popped;
					newEntry.general.wcOryx[index].swordRune.amt += wcRunData.swordRune.amt;
					newEntry.general.wcOryx[index].swordRune.popped += wcRunData.swordRune.popped;
					newEntry.general.wcOryx[index].wcIncs.amt += wcRunData.wcIncs.amt;
					newEntry.general.wcOryx[index].wcIncs.popped += wcRunData.wcIncs.popped;
				}
			}

			for (const completedRunData of entry.general.completedRuns) {
				const index: number = newEntry.general.completedRuns.findIndex(x => x.server === completedRunData.server);
				if (index === -1) {
					// no no no
					newEntry.general.completedRuns.push({ server: completedRunData.server, general: completedRunData.general, endgame: completedRunData.endgame, realmClearing: completedRunData.realmClearing });
				}
				else {
					newEntry.general.completedRuns[index].endgame += completedRunData.endgame;
					newEntry.general.completedRuns[index].general += completedRunData.general;
					newEntry.general.completedRuns[index].realmClearing += completedRunData.realmClearing;
				}
			}

			for (const leaderRunData of entry.general.leaderRuns) {
				const index: number = newEntry.general.leaderRuns.findIndex(x => x.server === leaderRunData.server);
				if (index === -1) {
					// no no no
					newEntry.general.leaderRuns.push({
						server: leaderRunData.server,
						general: {
							failed: leaderRunData.general.failed,
							completed: leaderRunData.general.completed,
							assists: leaderRunData.general.assists
						},
						endgame: {
							failed: leaderRunData.endgame.failed,
							completed: leaderRunData.endgame.completed,
							assists: leaderRunData.endgame.assists
						},
						realmClearing: {
							failed: leaderRunData.realmClearing.failed,
							completed: leaderRunData.realmClearing.completed,
							assists: leaderRunData.realmClearing.assists
						}
					});
				}
				else {
					newEntry.general.leaderRuns[index].endgame.assists += leaderRunData.endgame.assists;
					newEntry.general.leaderRuns[index].endgame.completed += leaderRunData.endgame.completed;
					newEntry.general.leaderRuns[index].endgame.failed += leaderRunData.endgame.failed;

					newEntry.general.leaderRuns[index].general.assists += leaderRunData.general.assists;
					newEntry.general.leaderRuns[index].general.completed += leaderRunData.general.completed;
					newEntry.general.leaderRuns[index].general.failed += leaderRunData.general.failed;

					newEntry.general.leaderRuns[index].realmClearing.assists += leaderRunData.realmClearing.assists;
					newEntry.general.leaderRuns[index].realmClearing.completed += leaderRunData.realmClearing.completed;
					newEntry.general.leaderRuns[index].realmClearing.failed += leaderRunData.realmClearing.failed;
				}
			}

			for (const punishmentData of entry.general.moderationHistory) {
				newEntry.general.moderationHistory.push(punishmentData);
			}
		}

		await MongoDbHelper.MongoDbUserManager.MongoUserClient.deleteMany(filterQuery);
		const results: InsertOneWriteOpResult<WithId<IRaidUser>> = await MongoDbHelper.MongoDbUserManager.MongoUserClient
			.insertOne(newEntry);

		if (results.ops.length === 0) {
			// excellent error handling right here 
			throw new Error("something went wrong when trying to create a new profile.");
		}
		return (results.ops[0]);
	}

	/**
	 * Replaces the current main name with the new name and puts the old main name as an alternative account.
	 * @param {IRaidUser} resolvedUserDbDiscord The found DB based on Discord ID. 
	 * @param {(GuildMember | User)} member The guild member. 
	 * @param {string} nameFromProfile The new name. 
	 */
	export async function newNameEntry(
		resolvedUserDbDiscord: IRaidUser,
		member: GuildMember | User,
		nameFromProfile: string
	) {
		const oldMainName: string = resolvedUserDbDiscord.rotmgDisplayName;
		await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne({
			discordUserId: member.id
		}, {
			$set: {
				rotmgDisplayName: nameFromProfile,
				rotmgLowercaseName: nameFromProfile.toLowerCase()
			},
			$push: {
				otherAccountNames: {
					lowercase: oldMainName.toLowerCase(),
					displayName: oldMainName
				}
			}
		});
	}

	/**
	 * @todo TODO make it so the bot checks ALL conditions.
	 * @param {Guild} guild The guild. 
	 * @param {string} inGameName The in-game name. 
	 * @param {boolean} isOldProfile Whether the profile was pre-existing or not. 
	 * @param {string} code The code. 
	 */
	function getVerificationEmbed(guild: Guild, inGameName: string, isOldProfile: boolean, code: string) {
		const verifEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
			.setTitle(`Verification For: **${guild.name}**`)
			.setDescription(`You have selected the in-game name: **\`${inGameName}\`**. To access your RealmEye profile, click [here](https://www.realmeye.com/player/${inGameName}).\n\nYou are almost done verifying; however, you need to do a few more things.\n\nTo stop the verification process, react with ❌.`)
			.setColor("RANDOM")
			.setFooter("⏳ Time Remaining: 15 Minutes and 0 Seconds.");
		if (isOldProfile) {
			verifEmbed.addField("1. Get Your Verification Code", "Normally, I would require a verification code for your RealmEye profile; however, because I recognize you from a different server, you can skip this process completely.");
		}
		else {
			verifEmbed.addField("1. Get Your Verification Code", `Your verification code is: ${StringUtil.applyCodeBlocks(code)}Please put this verification code in one of your three lines of your RealmEye profile's description.`);
		}
		verifEmbed.addField("2. Check Profile Settings", `Ensure __anyone__ can view your general profile (stars, alive fame), characters, fame history, and name history. You can access your profile settings [here](https://www.realmeye.com/settings-of/${inGameName}). If you don't have your RealmEye account password, you can learn how to get one [here](https://www.realmeye.com/mreyeball#password).`)
			.addField("3. Wait", "Before you react with the check, make sure you wait. RealmEye may sometimes take up to 30 seconds to fully register your changes!")
			.addField("4. Confirm", "React with ✅ to begin the verification check. **If you have already reacted, un-react and react again.**");
		return verifEmbed;
	}

	function preliminaryCheck(
		sec: ISection,
		reapi: IRealmEyeAPI
	): ICheckResults {
		// char pts 
		let zero: number = 0;
		let one: number = 0;
		let two: number = 0;
		let three: number = 0;
		let four: number = 0;
		let five: number = 0;
		let six: number = 0;
		let seven: number = 0;
		let eight: number = 0;

		for (let character of reapi.characters) {
			const maxedStat: number = character.stats_maxed;
			switch (maxedStat) {
				case (0): zero++; break;
				case (1): one++; break;
				case (2): two++; break;
				case (3): three++; break;
				case (4): four++; break;
				case (5): five++; break;
				case (6): six++; break;
				case (7): seven++; break;
				case (8): eight++; break;
			}
		}

		const currVsReq: [number, number][] = [
			[zero, sec.verification.maxedStats.statsReq[0]],
			[one, sec.verification.maxedStats.statsReq[1]],
			[two, sec.verification.maxedStats.statsReq[2]],
			[three, sec.verification.maxedStats.statsReq[3]],
			[four, sec.verification.maxedStats.statsReq[4]],
			[five, sec.verification.maxedStats.statsReq[5]],
			[six, sec.verification.maxedStats.statsReq[6]],
			[seven, sec.verification.maxedStats.statsReq[7]],
			[eight, sec.verification.maxedStats.statsReq[8]]
		];

		let failsToMeetReq: boolean = false;
		let extras: number = 0;

		for (let i = currVsReq.length - 1; i >= 0; i--) {
			if (currVsReq[i][0] < currVsReq[i][1]) {
				let diff: number = currVsReq[i][1] - currVsReq[i][0];
				extras -= diff;
				if (extras < 0) {
					failsToMeetReq = true;
					break;
				}
			}
			else {
				extras += currVsReq[i][0] - currVsReq[i][1];
			}
		}

		const rankPassed: boolean = sec.verification.stars.required
			? reapi.rank >= sec.verification.stars.minimum
			: true;
		const famePassed: boolean = sec.verification.aliveFame.required
			? reapi.fame >= sec.verification.aliveFame.minimum
			: true;
		const charPassed: boolean = sec.verification.maxedStats.required
			? !failsToMeetReq
			: true;

		return {
			rank: {
				amt: reapi.rank,
				passed: rankPassed
			},
			aliveFame: {
				amt: reapi.fame,
				passed: famePassed
			},
			characters: {
				amt: [zero, one, two, three, four, five, six, seven, eight],
				passed: charPassed,
				hidden: reapi.characters_hidden
			},
			passedAll: rankPassed && famePassed && charPassed
		};
	}

	/**
	 * Returns the name history of a person.
	 * @param {string} ign The in-game name. 
	 */
	export async function getRealmEyeNameHistory(
		ign: string
	): Promise<IAPIError | INameHistory[]> {
		const resp: AxiosResponse<string> = await Zero.AxiosClient.get(
			`https://www.realmeye.com/name-history-of-player/${ign}`,
			{
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36"
				}
			}
		);

		const dataBelowDesc: string = resp.data.split("</div></div></div></div><ul class")[1];

		if (dataBelowDesc.includes("Name history is hidden")) {
			return ({
				errorMessage: "Name history is hidden.",
				specification: "The player has hidden his or her name history.",
			});
		}

		if (dataBelowDesc.includes("No name changes detected.")) {
			return [];
		}

		const nameHistoryArray: string[] = dataBelowDesc
			.split("<tr><td><span>");
		nameHistoryArray.shift();

		let nameHistory: INameHistory[] = [];

		for (let i = 0; i < nameHistoryArray.length; i++) {
			let name: string = nameHistoryArray[i].split("</span>")[0];
			let from: string = nameHistoryArray[i]
				.split("</span></td><td>")[1]
				.split("</td><td>")[0];
			let to: string;
			if (nameHistoryArray[i]
				.split("</td><td>")[2]
				.includes("Z</td></tr>")) {
				to = nameHistoryArray[i]
					.split("</td><td>")[2]
					.split("</td></tr>")[0]
			} else {
				to = "";
			}

			nameHistory.push({
				name: name,
				from: from,
				to: to
			});
		}

		return nameHistory;
	}

	/**
	 * Generates a random code.
	 * @param {number} [maxLength = 8] the max length the code should be. 
	 */
	export function getRandomizedString(maxLength: number = 8): string {
		const possibleChars: string[] = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()".split("");
		let code: string = "";
		for (let i = 0; i < maxLength; i++) {
			code += ArrayUtil.getRandomElement<string>(possibleChars);
		}
		return code;
	}

	async function manualVerification(
		guild: Guild,
		member: GuildMember,
		verificationInfo: IRealmEyeAPI,
		manualVerificationChannel: TextChannel,
		section: ISection,
		reqsFailedToMeet: StringBuilder,
		nameHistoryInfo: INameHistory[] = []
	): Promise<void> {
		if (section.isMain) {
			// we can safely assume
			// that the id = the person.
			await accountInDatabase(member, verificationInfo.player, nameHistoryInfo);
		}

		const desc: StringBuilder = new StringBuilder()
			.append(`⇒ **Section:** ${section.nameOfSection}`)
			.appendLine()
			.append(`⇒ **User:** ${member}`)
			.appendLine()
			.append(`⇒ **IGN:** ${verificationInfo.player}`)
			.appendLine();

		if (typeof verificationInfo.player_first_seen !== "undefined") {
			desc.append(`⇒ **First Seen**: ${verificationInfo.player_first_seen}`)
		}
		else if (typeof verificationInfo.created !== "undefined") {
			desc.append(`⇒ **Created**: ${verificationInfo.created}`);
		}

		desc
			.appendLine()
			.append(`⇒ **Last Seen**: ${verificationInfo.player_last_seen}`)
			.appendLine()
			.append(`⇒ **RealmEye:** [Profile](https://www.realmeye.com/player/${verificationInfo.player})`)
			.appendLine()
			.appendLine()
			.append(`React with ☑️ to manually verify this person; otherwise, react with ❌.`);

		const manualVerifEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(member.user.tag, member.user.displayAvatarURL())
			.setTitle(`**${section.isMain ? "Server" : section.nameOfSection}** ⇒ Manual Verification Request: **${verificationInfo.player}**`)
			.setDescription(desc.toString())
			.addField("Unmet Requirements", StringUtil.applyCodeBlocks(reqsFailedToMeet.toString()))
			.addField("Current Status", StringUtil.applyCodeBlocks("🔓 Status: Unlocked"))
			.setColor("YELLOW")
			.setFooter(member.id)
			.setTimestamp();
		const m: Message = await manualVerificationChannel.send(manualVerifEmbed);
		await m.react("☑️").catch(() => { });
		await m.react("❌").catch(() => { });
		await m.react("🚩").catch(() => { });
		await m.react("📧").catch(() => { });

		const filterQuery: FilterQuery<IRaidGuild> = section.isMain
			? { guildID: guild.id }
			: {
				guildID: guild.id,
				"sections.channels.manualVerification": section.channels.manualVerification
			};

		const updateKey: string = section.isMain
			? "properties.manualVerificationEntries"
			: "sections.$.properties.manualVerificationEntries";

		await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne(filterQuery, {
			$push: {
				[updateKey]: {
					userId: member.id,
					inGameName: verificationInfo.player,
					rank: verificationInfo.rank,
					aFame: verificationInfo.fame,
					nameHistory: nameHistoryInfo,
					msgId: m.id,
					manualVerificationChannel: manualVerificationChannel.id,
					currentHandler: ""
				}
			}
		});
	}

	/**
	 * Locks or unlocks the manual verification request. 
	 * @param {IManualVerification} manualVerificationProfile The manual verification profile.
	 * @param {ISection} sectionForManualVerif The section.
	 * @param {GuildMember} manualVerifMember The member to be manually verified.
	 * @param {Message} message The msg with the manual verification request.
	 * @param {(GuildMember | null)} [handler = null] Who is currently handling the request. Do not specify this parameter if no one is handling the case.
	 */
	export async function lockOrUnlockManualRequest(
		manualVerificationProfile: IManualVerification,
		sectionForManualVerif: ISection,
		manualVerifMember: GuildMember,
		message: Message,
		handler: GuildMember | null = null
	): Promise<void> {
		const filterQuery: FilterQuery<IRaidGuild> = sectionForManualVerif.isMain
			? { guildID: manualVerifMember.guild.id }
			: {
				guildID: manualVerifMember.guild.id,
				"sections.channels.manualVerification": sectionForManualVerif.channels.manualVerification
			};
		const updateKey: string = sectionForManualVerif.isMain
			? "properties.manualVerificationEntries"
			: "sections.$.properties.manualVerificationEntries";


		manualVerificationProfile.currentHandler = handler === null
			? ""
			: handler.id;

		await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne(filterQuery, {
			$pull: {
				[updateKey]: {
					userId: manualVerifMember.id
				}
			}
		});

		await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne(filterQuery, {
			$push: {
				[updateKey]: manualVerificationProfile
			}
		});

		// update message
		const oldEmbed: MessageEmbed = message.embeds[0];
		oldEmbed.spliceFields(oldEmbed.fields.findIndex(x => x.name === "Current Status"), 1);
		oldEmbed.addField("Current Status", StringUtil.applyCodeBlocks(handler === null ? "🔓 Status: Unlocked." : `🔒 Status: Locked by ${handler.displayName}`));
		oldEmbed.setColor(handler === null ? "YELLOW" : "RED");
		await message.edit(oldEmbed).catch(e => { });
	}

	/**
	 * Looks for another member with the same name and UNVERIFIES them. 
	 * @param member The member to VERIFY. 
	 * @param guild The guild.
	 * @param guildDb The guild doc.
	 */
	export async function findOtherUserAndRemoveVerifiedRole(
		member: GuildMember,
		guild: Guild,
		guildDb: IRaidGuild
	): Promise<void> {
		// now let's check to see if anyone else verified as the same name
		// TODO perhaps also check old id? 
		const newUserDb: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.MongoUserClient.findOne({
			discordUserId: member.id
		});

		if (newUserDb !== null) {
			let names: string[] = [
				newUserDb.rotmgLowercaseName
				, ...newUserDb.otherAccountNames.map(x => x.lowercase)
			];

			for (const name of names) {
				const res: GuildMember | GuildMember[] = UserHandler.findUserByInGameName(guild, name, guildDb);
				if (Array.isArray(res) || res.id === member.id) {
					continue;
				}

				for (const [, role] of res.roles.cache) {
					await res.roles.remove(role).catch(() => { });
					await res.setNickname("").catch(() => { });
				}
			}
		}
	}

	/**
	 * A function that should be executed when a manual verification application has been accepted.
	 * @param {GuildMember} manualVerifMember The member to be manually verified.
	 * @param {GuildMember} responsibleMember The member that manually verified `manualVerifMember`.
	 * @param {ISection} sectionForManualVerif The section where the manual verification occurred.
	 * @param {IManualVerification} manualVerificationProfile The manual verification profile.
	 * @param {IRaidGuild} guildDb The guild doc.
	 */
	export async function acceptManualVerification(
		manualVerifMember: GuildMember,
		responsibleMember: GuildMember,
		sectionForManualVerif: ISection,
		manualVerificationProfile: IManualVerification,
		guildDb: IRaidGuild
	): Promise<void> {
		const guild: Guild = manualVerifMember.guild;
		let loggingMsg: string = `✅ **\`[${sectionForManualVerif.nameOfSection}]\`** ${manualVerifMember} has been manually verified as \`${manualVerificationProfile.inGameName}\`. This manual verification was done by ${responsibleMember} (${responsibleMember.displayName})`;

		await manualVerifMember.roles.add(sectionForManualVerif.verifiedRole).catch(() => { });
		await VerificationHandler.findOtherUserAndRemoveVerifiedRole(
			responsibleMember,
			guild,
			guildDb
		);

		if (sectionForManualVerif.isMain) {
			await manualVerifMember.setNickname(manualVerifMember.user.username === manualVerificationProfile.inGameName
				? `${manualVerificationProfile.inGameName}.`
				: manualVerificationProfile.inGameName
			).catch(() => { });
			await VerificationHandler.accountInDatabase(
				manualVerifMember,
				manualVerificationProfile.inGameName,
				manualVerificationProfile.nameHistory
			);
			const successEmbed: MessageEmbed = new MessageEmbed()
				.setTitle(`Successful Verification: **${guild.name}**`)
				.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
				.setDescription(guildDb.properties.successfulVerificationMessage.length === 0 ? "You have been successfully verified. Please make sure you read the rules posted in the server, if any, and any other regulations/guidelines. Good luck and have fun!" : guildDb.properties.successfulVerificationMessage)
				.setColor("GREEN")
				.setFooter("Verification Process: Stopped.");
			await manualVerifMember.send(successEmbed).catch(() => { });
		}
		else {
			await manualVerifMember.send(`**\`[${guild.name}]\`**: You have successfully been verified in the **\`${sectionForManualVerif.nameOfSection}\`** section!`).catch(() => { });
		}

		sendLogAndUpdateDb(loggingMsg, sectionForManualVerif, manualVerifMember.guild, manualVerifMember);
	}

	/**
	 * A function that should be executed when a manual verification application has been denied.
	 * @param {GuildMember} manualVerifMember The member whose manual verification application has been denied.
	 * @param {GuildMember} responsibleMember The member that denied `manualVerifMember`'s manual verification application.
	 * @param {ISection} sectionForManualVerif The section where the manual verification occurred.
	 * @param {IManualVerification} manualVerificationProfile The manual verification profile.
	 */
	export async function denyManualVerification(
		manualVerifMember: GuildMember,
		responsibleMember: GuildMember,
		sectionForManualVerif: ISection,
		manualVerificationProfile: IManualVerification
	): Promise<void> {
		// TODO add reason
		const guild: Guild = manualVerifMember.guild;
		let loggingMsg: string = `❌ **\`[${sectionForManualVerif.nameOfSection}]\`** ${manualVerifMember} (${manualVerificationProfile.inGameName})'s manual verification review has been rejected by ${responsibleMember} (${responsibleMember.displayName})`;

		if (sectionForManualVerif.isMain) {
			await manualVerifMember.send(`**\`[${guild.name}]\`**: After manually reviewing your profile, we have determined that you do not meet the requirements defined by server.`).catch(() => { });
		}
		else {
			await manualVerifMember.send(`**\`[${guild.name}]\`**: After reviewing your profile, we have determined that your profile does not meet the minimum requirements for the **\`${sectionForManualVerif.nameOfSection}\`** section.`).catch(() => { });
		}

		sendLogAndUpdateDb(loggingMsg, sectionForManualVerif, manualVerifMember.guild, manualVerifMember);
	}

	/**
	 * Updates the db and logs the manual verification event.
	 * @param {string} logging The message to send to the logging channel. 
	 * @param {ISection} sectionForManualVerif The section where the person tried to get manually verified. 
	 * @param {Guild} guild The guild.
	 * @param {(GuildMember | string)} manualVerifMember The member that tried to get a manual verification. 
	 */
	export async function sendLogAndUpdateDb(
		logging: string,
		sectionForManualVerif: ISection,
		guild: Guild,
		manualVerifMember: GuildMember | string
	): Promise<void> {
		const verificationLoggingChannel: TextChannel | undefined = guild.channels.cache
			.get(sectionForManualVerif.channels.logging.verificationSuccessChannel) as TextChannel | undefined;
		if (typeof verificationLoggingChannel !== "undefined") {
			await verificationLoggingChannel.send(logging).catch(() => { });
		}

		const filterQuery: FilterQuery<IRaidGuild> = sectionForManualVerif.isMain
			? { guildID: guild.id }
			: {
				guildID: guild.id,
				"sections.channels.manualVerification": sectionForManualVerif.channels.manualVerification
			};
		const updateKey: string = sectionForManualVerif.isMain
			? "properties.manualVerificationEntries"
			: "sections.$.properties.manualVerificationEntries";

		await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne(filterQuery, {
			$pull: {
				[updateKey]: {
					userId: typeof manualVerifMember === "string" ? manualVerifMember : manualVerifMember.id
				}
			}
		});
	}

	/**
	 * Asks the user for their in-game name.
	 * @param {User} user The user that initiated the function.
	 * @param {DMChannel} dmChannel The DM channel.
	 * @param {Guild} [guild = null] The guild.
	 * @param {IRaidUser} [userDb = null] The user DB.
	 * @param {Message} [botMsg = null] The bot message, if any.
	 */
	export async function getInGameNameByPrompt(
		initUser: User,
		dmChannel: DMChannel,
		guild: Guild | null = null,
		userDb: IRaidUser | null = null
	): Promise<string> {
		return new Promise(async (resolve) => {
			let desc: string;
			if (guild === null) {
				desc = "Please type your in-game name now. This in-game name can either be one of your alternative accounts OR your new name (if you recently got a name change). Your in-game name should be spelled exactly as seen in-game; however, capitalization does NOT matter.";
			}
			else {
				desc = "Please type your in-game name now. Your in-game name should be spelled exactly as seen in-game; however, capitalization does NOT matter.";
			}

			const nameEmbed: MessageEmbed = new MessageEmbed()
				.setAuthor(initUser.tag, initUser.displayAvatarURL())
				.setTitle(guild === null ? "Verification For **User Profile**" : `Verification For **${guild.name}**`)
				.setDescription(`${desc}\n\nTo cancel this process, simply react with ❌.`)
				.setColor("RANDOM")
				.setFooter("⏳ Time Remaining: 2 Minutes and 0 Seconds.");

			let resBotMsg: Message = await dmChannel.send(nameEmbed);

			for await (const [, reaction] of resBotMsg.reactions.cache) {
				for await (const [, user] of reaction.users.cache) {
					if (user.bot) {
						await reaction.remove().catch(() => { });
						break;
					}
				}
			}
			await resBotMsg.react("❌");

			const mcd: MessageAutoTick = new MessageAutoTick(resBotMsg, nameEmbed, 2 * 60 * 1000, null, "⏳ Time Remaining: {m} Minutes and {s} Seconds.");
			const msgCollector: MessageCollector = new MessageCollector(dmChannel, m => m.author.id === initUser.id, {
				time: 2 * 60 * 1000
			});

			//#region reaction collector
			const reactFilter: ((r: MessageReaction, u: User) => boolean) = (reaction: MessageReaction, user: User) => {
				return reaction.emoji.name === "❌" && user.id === initUser.id;
			}

			const reactCollector: ReactionCollector = resBotMsg.createReactionCollector(reactFilter, {
				time: 2 * 60 * 1000,
				max: 1
			});

			reactCollector.on("collect", async () => {
				msgCollector.stop();
				await resBotMsg.delete().catch(() => { });
				return resolve("CANCEL_");
			});

			msgCollector.on("collect", async (msg: Message) => {
				if (!/^[a-zA-Z]+$/.test(msg.content)) {
					await MessageUtil.send({ content: "Please type a __valid__ in-game name." }, msg.author);
					return;
				}

				if (msg.content.length > 14) {
					await MessageUtil.send({ content: "Your in-game name should not exceed 14 characters. Please try again." }, msg.author);
					return;
				}

				if (msg.content.length === 0) {
					await MessageUtil.send({ content: "Please type in a valid in-game name." }, msg.author);
					return;
				}

				if (userDb !== null) {
					const hasBeenUsedBefore: boolean = userDb.rotmgLowercaseName === msg.content.toLowerCase()
						|| userDb.otherAccountNames.some(x => x.lowercase === msg.content.toLowerCase());

					if (hasBeenUsedBefore) {
						await MessageUtil.send({ content: "The in-game name you have chosen is already being used, either as your main account or as an alternative account." }, msg.author);
						return;
					}
				}


				msgCollector.stop();
				reactCollector.stop();
				return resolve(msg.content);
			});

			msgCollector.on("end", (collected: Collection<string, Message>, reason: string) => {
				mcd.disableAutoTick();
				reactCollector.stop();
				resBotMsg.delete().catch(() => { });
				if (reason === "time") {
					return resolve("TIME_");
				}
			});
		});
	}

	/**
	 * Verifies the member using the private API. 
	 * @param member The member to verify.
	 * @param guild The guild.
	 * @param guildDb The guild doc.
	 * @param section The section where the member should be verified.
	 */
	export async function verifyUserPrivate(member: GuildMember, guild: Guild, guildDb: IRaidGuild, section: ISection): Promise<void> {
		const verifiedRole: Role = guild.roles.cache.get(section.verifiedRole) as Role;

		// channel declaration
		// yes, we know these can be textchannels b/c that's the input in configsections
		const verificationAttemptsChannel: TextChannel | undefined = guild.channels.cache
			.get(section.channels.logging.verificationAttemptsChannel) as TextChannel | undefined;
		const verificationSuccessChannel: TextChannel | undefined = guild.channels.cache
			.get(section.channels.logging.verificationSuccessChannel) as TextChannel | undefined;
		const manualVerificationChannel: TextChannel | undefined = guild.channels.cache
			.get(section.channels.manualVerification) as TextChannel | undefined;
		const verificationChannel: TextChannel | undefined = guild.channels.cache
			.get(section.channels.verificationChannel) as TextChannel | undefined;


		if (section.isMain) {

		}
		else {

		}
	}
}