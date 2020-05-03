import { Message, MessageCollector, MessageEmbed, GuildMember, Guild, MessageReaction, User, ReactionCollector, TextChannel, EmbedFieldData, Collection, DMChannel, Role, GuildChannel, MessageManager } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { IRaidUser } from "../Templates/IRaidUser";
import { MessageAutoTick } from "../Classes/Message/MessageAutoTick";
import { StringUtil } from "../Utility/StringUtil";
import { ISection } from "../Definitions/ISection";
import { MongoDbHelper } from "./MongoDbHelper";
import { MessageUtil } from "../Utility/MessageUtil";
import { ITiffitRealmEyeProfile, ITiffitNoUser } from "../Definitions/ITiffitRealmEye";
import { Zero } from "../Zero";
import { TiffitRealmEyeAPI } from "../Constants/ConstantVars";
import { StringBuilder } from "../Classes/String/StringBuilder";
import { AxiosResponse } from "axios";
import { FilterQuery, UpdateQuery } from "mongodb";
import { ArrayUtil } from "../Utility/ArrayUtil";
import { INameHistory, IAPIError } from "../Definitions/ICustomREVerification";
import { TestCasesNameHistory } from "../TestCases/TestCases";
import { UserHandler } from "./UserHandler";
import { GuildUtil } from "../Utility/GuildUtil";
import { IManualVerification } from "../Definitions/IManualVerification";

export module VerificationHandler {
	interface IPreliminaryCheckError {
		fields: EmbedFieldData[] | EmbedFieldData[][];
		errorMsg: string;
		errorMsgForLogging: string;
		errorCode: "FAME_TOO_LOW" | "RANK_TOO_LOW" | "CHARACTERS_HIDDEN" | "CHARACTER_STATS_TOO_LOW";
	}

	interface IPreliminaryCheckPass {
		rank: number;
		aliveFame: number;
		stats: [number, number, number, number, number, number, number, number, number];
	}

	type PreliminaryCheck = IPreliminaryCheckPass | IPreliminaryCheckError;

	/**
	 * Verifies a user.
	 * @param {GuildMember} member The member to verify. 
	 * @param {Guild} guild The guild. 
	 * @param {IRaidGuild} guildDb The guild doc. 
	 * @param {ISection} section The section to verify the member in. Contains channel information.
	 */
	export async function verifyUser(
		member: GuildMember,
		guild: Guild,
		guildDb: IRaidGuild,
		section: ISection
	): Promise<void> {
		try {
			// already verified or no role
			if (!guild.roles.cache.has(section.verifiedRole) || member.roles.cache.has(section.verifiedRole)) {
				return;
			}

			const verifiedRole: Role = guild.roles.cache.get(section.verifiedRole) as Role;
			const dmChannel: DMChannel = await member.user.createDM();

			// channel declaration
			// yes, we know these can be textchannels b/c that's the input in configsections
			const verificationAttemptsChannel: TextChannel | undefined = guild.channels.cache
				.get(section.channels.logging.verificationAttemptsChannel) as TextChannel | undefined;
			const verificationSuccessChannel: TextChannel | undefined = guild.channels.cache
				.get(section.channels.logging.verificationSuccessChannel) as TextChannel | undefined;
			const manualVerificationChannel: TextChannel | undefined = guild.channels.cache
				.get(section.channels.manualVerification) as TextChannel | undefined;

			const verificationChannel: GuildChannel | undefined = guild.channels.cache.get(section.channels.verificationChannel);

			if (typeof verificationChannel === "undefined") {
				return;
			}

			const allSections: ISection[] = [GuildUtil.getDefaultSection(guildDb), ...guildDb.sections];
			for (const section of allSections) {
				const manualVerifEntry: IManualVerification | undefined = section.properties.manualVerificationEntries
					.find(x => x.userId === member.id);
				if (typeof manualVerifEntry === "undefined") {
					continue;
				}
				if (manualVerifEntry.userId === member.id) {
					await member.send(`**\`[${section.isMain ? guild.name : section.nameOfSection}]\`** Your profile is currently under manual verification. Please try again later.`);
					return;
				}
			}

			//#region requirement text
			let reqs: StringBuilder = new StringBuilder()
				.append("• Public Profile.")
				.appendLine()
				.append("• Private \"Last Seen\" Location.")
				.appendLine()
				.append("• Public Name History.")
				.appendLine();

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

			//#endregion

			const userDb: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.getUserDbByDiscordId(member.id);
			let inGameName: string = "";

			// within the server we will be checking for other major reqs.
			if (section.isMain) {
				let isOldProfile: boolean = false;
				let botMsg: Message = await member.send(new MessageEmbed());

				if (typeof verificationAttemptsChannel !== "undefined") {
					verificationAttemptsChannel.send(`▶️ **\`[${section.nameOfSection}]\`** ${member} has started the verification process.`).catch(() => { });
				}

				if (userDb !== null) {
					const hasNameEmbed: MessageEmbed = new MessageEmbed()
						.setAuthor(member.user.tag, member.user.displayAvatarURL())
						.setTitle(`Verification For: **${guild.name}**`)
						.setDescription(`It appears that the name, **\`${userDb.rotmgDisplayName}\`**, is linked to this Discord account. Do you want to verify using this in-game name? Type \`yes\` or \`no\`.`)
						.setFooter("⏳ Time Remaining: 2 Minutes and 0 Seconds.")
						.setColor("RANDOM");

					const choice: boolean | "CANCEL" | "TIME" = await new Promise(async (resolve) => {
						botMsg = await botMsg.edit(hasNameEmbed);
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
							if (reason === "time") {
								return resolve("TIME");
							}
						});

						msgCollector.on("collect", async (respMsg: Message) => {
							if (respMsg.content.toLowerCase() === "cancel") {
								msgCollector.stop();
								return resolve("CANCEL");
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

					if (choice === "TIME" || choice === "CANCEL") {
						await botMsg.delete().catch(() => { });
						return;
					}

					if (choice) {
						inGameName = userDb.rotmgDisplayName;
						isOldProfile = true;
					}
				}

				if (inGameName === "") { // TODO implement
					const nameToUse: string | "CANCEL_" | "TIME_" = await new Promise(async (resolve) => {
						const nameEmbed: MessageEmbed = new MessageEmbed()
							.setAuthor(member.user.tag, member.user.displayAvatarURL())
							.setTitle(`Verification For: **${guild.name}**`)
							.setDescription("Please type your in-game name now. Your in-game name should be spelled exactly as seen in-game; however, capitalization does NOT matter.\n\nTo cancel this process, simply react with ❌.")
							.setColor("RANDOM")
							.setFooter("⏳ Time Remaining: 2 Minutes and 0 Seconds.");
						botMsg = await botMsg.edit(nameEmbed);
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
						const msgCollector: MessageCollector = new MessageCollector(dmChannel, m => m.author.id === member.user.id, {
							time: 2 * 60 * 1000
						});

						//#region reaction collector
						const reactFilter: ((r: MessageReaction, u: User) => boolean) = (reaction: MessageReaction, user: User) => {
							return reaction.emoji.name === "❌" && user.id === member.user.id;
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
								await MessageUtil.send({ content: "Please type a __valid__ in-game name." }, member.user);
								return;
							}

							if (msg.content.length > 10) {
								await MessageUtil.send({ content: "Your in-game name should not exceed 10 characters. Please try again." }, member.user);
								return;
							}

							if (msg.content.length === 0) {
								await MessageUtil.send({ content: "Please type in a valid in-game name." }, member.user);
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

					if (nameToUse === "CANCEL_" || nameToUse === "TIME_") {
						if (typeof verificationAttemptsChannel !== "undefined") {
							verificationAttemptsChannel.send(`❌ **\`[${section.nameOfSection}]\`** ${member}'s verification process has been canceled.\n\t⇒ Reason: ${nameToUse.substring(0, nameToUse.length - 1)}`).catch(() => { });
						}
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
				const verifEmbed: MessageEmbed = getVerificationEmbed(guild, inGameName, reqs, isOldProfile, code);
				const verifMessage: Message = await botMsg.edit(verifEmbed);
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
						await botMsg.edit(embed);
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
						await botMsg.edit(embed);
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
						await botMsg.edit(failedEmbed).catch(() => { });
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
						nameHistory = await getRealmEyeNameHistory(requestData.data.name);
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
						await botMsg.edit(failedEmbed).catch(() => { });
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

					const nameFromProfile: string = requestData.data.name;
					if (!isOldProfile) {
						let codeFound: boolean = false;
						for (let i = 0; i < requestData.data.description.length; i++) {
							if (requestData.data.description[i].includes(code)) {
								codeFound = true;
							}
						}

						if (!codeFound) {
							if (typeof verificationAttemptsChannel !== "undefined") {
								verificationAttemptsChannel.send(`🚫 **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but the verification code, \`${code}\`, could not be found in his/her RealmEye profile.`).catch(() => { });
							}
							await member.send(`Your verification code, \`${code}\`, wasn't found in your RealmEye description! Make sure the code is on your description and then try again.`);
							canReact = true;
							return;
						}
					}

					if (requestData.data.last_seen !== "hidden") {
						if (typeof verificationAttemptsChannel !== "undefined") {
							verificationAttemptsChannel.send(`🚫 **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but his/her last-seen location is not hidden.`).catch(() => { });
						}
						await member.send("Your last-seen location is not hidden. Please make sure __no one__ can see your last-seen location.");
						canReact = true;
						return;
					}

					const prelimCheck: PreliminaryCheck = preliminaryCheck(section, requestData.data);
					if ("fields" in prelimCheck) {
						if (prelimCheck.errorCode === "CHARACTERS_HIDDEN") {
							if (typeof verificationAttemptsChannel !== "undefined") {
								verificationAttemptsChannel.send(`🚫 **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but his/her characters are hidden and needs to be available to the public.`).catch(() => { });
							}
							await member.send("Your characters are currently hidden. Please make sure everyone can see your characters.");
							canReact = true;
							return;
						}

						// MANUAL VERIF

						reactCollector.stop();
						let outputLogs: string = `⛔ **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but his/her RotMG profile has failed to meet one or more requirement(s). The verification process has been stopped.\n\t⇒ Error Code: ${prelimCheck.errorCode}\n\t⇒ Error Message: ${prelimCheck.errorMsgForLogging}`;

						const failedEmbed: MessageEmbed = new MessageEmbed()
							.setTitle(`Verification For: **${guild.name}**`)
							.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
							.setColor("RED");

						if (typeof manualVerificationChannel === "undefined") {
							failedEmbed
								.setDescription("You have failed to meet the requirements for the server. Please review the below requirements you have failed to meet and make note of them.")
								.addFields(...prelimCheck.fields)
								.setFooter("Verification Process: Stopped.");
						}
						else {
							const wantsToBeManuallyVerified: boolean | "TIME" = await new Promise(async (resolve, reject) => {
								const failedAppealEmbed: MessageEmbed = failedEmbed
									.setDescription(`You did not meet the requirements for this server. The requirements are: ${StringUtil.applyCodeBlocks(reqs.toString())}Would you like to appeal the decision with a staff member? Unreact and react with ✅ to appeal with a staff member; otherwise, react with ❌.\n\nNOTE: This may take up to a day. You will not be able to verify while your profile is under manual review. YOU ARE NOT GUARANTEED TO BE VERIFIED.`)
									.setFooter("⏳ Time Remaining: 2 Minutes and 0 Seconds.");
								const manaulVerifMsg: Message = await botMsg.edit(failedAppealEmbed);
								await manaulVerifMsg.react("✅").catch(() => { });
								await manaulVerifMsg.react("❌").catch(() => { });


								const mcd: MessageAutoTick = new MessageAutoTick(manaulVerifMsg, failedAppealEmbed, 2 * 60 * 1000, null, "⏳ Time Remaining: {m} Minutes and {s} Seconds.");
								// collector function 
								const collFilter: (r: MessageReaction, u: User) => boolean = (reaction: MessageReaction, user: User) => {
									return ["✅", "❌"].includes(reaction.emoji.name) && user.id === member.id;
								}

								// prepare collector
								const reactCollector: ReactionCollector = manaulVerifMsg.createReactionCollector(collFilter, {
									time: 2 * 60 * 1000,
									max: 1
								});

								// end collector
								reactCollector.on("end", async (collected: Collection<string, MessageReaction>, reason: string) => {
									mcd.disableAutoTick();
									if (reason === "time") {
										return resolve("TIME");
									}
								});

								reactCollector.on("collect", async (r: MessageReaction) => {
									if (r.emoji.name === "❌") {
										return resolve(false);
									}

									if (r.emoji.name === "✅") {
										return resolve(true);
									}
								});
							});

							if (wantsToBeManuallyVerified === "TIME") {
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
								await botMsg.edit(embed);
								return;
							}

							if (wantsToBeManuallyVerified) {
								failedEmbed
									.setDescription("You have chosen to have your profile manually reviewed by a staff member. Please be patient while a staff member checks your profile.")
									.setFooter("Verification Process: Stopped.");
								manualVerification(guild, member, requestData.data, manualVerificationChannel, section, nameHistory);
								outputLogs += `\nThis profile has been sent to the manual verification channel`;
							}
							else {
								failedEmbed
									.setDescription(`You have failed to meet the requirements for the server, and have chosen not to accept the manual verification offer. The server's verification requirements are below. ${StringUtil.applyCodeBlocks(reqs.toString())}\nReview which verification requirement you failed to meet below.`)
									.addFields(...prelimCheck.fields)
									.setFooter("Verification Process: Stopped.");
							}
						}

						await botMsg.edit(failedEmbed).catch(() => { });
						if (typeof verificationAttemptsChannel !== "undefined") {
							verificationAttemptsChannel.send(outputLogs).catch(() => { });
						}
						return;
					}

					// BLACKLIST CHECK
					for (const blacklistEntry of guildDb.moderation.blacklistedUsers) {
						for (const nameEntry of nameHistory.map(x => x.name)) {
							if (blacklistEntry.inGameName.toLowerCase() === nameEntry.toLowerCase()) {
								reactCollector.stop();
								if (typeof verificationAttemptsChannel !== "undefined") {
									verificationAttemptsChannel.send(`⛔ **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but the in-game name, \`${nameEntry}\`${nameEntry.toLowerCase() === inGameName.toLowerCase() ? "" : " (found in Name History)"}, has been blacklisted due to the following reason: ${blacklistEntry.reason}`).catch(() => { });
								}
								const failedEmbed: MessageEmbed = new MessageEmbed()
									.setTitle(`Verification For: **${guild.name}**`)
									.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
									.setDescription("You have been blacklisted from the server.")
									.setColor("RANDOM")
									.addField("Reason", blacklistEntry.reason)
									.setFooter("Verification Process: Stopped.");
								await botMsg.edit(failedEmbed).catch(() => { });
								return;
							}
						}
					}

					// success!
					await member.roles.add(verifiedRole);
					await member.setNickname(member.user.username === requestData.data.name ? `${requestData.data.name}.` : requestData.data.name).catch(() => { });

					reactCollector.stop();
					const successEmbed: MessageEmbed = new MessageEmbed()
						.setTitle(`Successful Verification: **${guild.name}**`)
						.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
						.setDescription(guildDb.properties.successfulVerificationMessage.length === 0 ? "You have been successfully verified. Please make sure you read the rules posted in the server, if any, and any other regulations/guidelines. Good luck and have fun!" : guildDb.properties.successfulVerificationMessage)
						.setColor("GREEN")
						.setFooter("Verification Process: Stopped.");
					await botMsg.edit(successEmbed);
					await accountInDatabase(member, nameFromProfile, nameHistory);
					if (typeof verificationSuccessChannel !== "undefined") {
						verificationSuccessChannel.send(`📥 **\`[${section.nameOfSection}]\`** ${member} has successfully been verified as \`${inGameName}\`.`).catch(console.error);
					}

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

							for (const [id, role] of res.roles.cache) {
								await res.roles.remove(role).catch(e => { });
							}
						}
					}
				});
			}
			else {
				const name: string = member.displayName.split("|").map(x => x.trim())[0];
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

				const requestData: AxiosResponse<ITiffitNoUser | ITiffitRealmEyeProfile> = await Zero.AxiosClient
					.get<ITiffitNoUser | ITiffitRealmEyeProfile>(TiffitRealmEyeAPI + name);
				if ("error" in requestData.data) {
					if (typeof verificationAttemptsChannel !== "undefined") {
						verificationAttemptsChannel.send(`🚫 **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but the name could not be found on RealmEye.`).catch(() => { });
					}
					await member.send(`I could not find your profile for **\`${name}\`** on RealmEye. Make sure your profile is public first!`);
					return;
				}

				const prelimCheck: PreliminaryCheck = preliminaryCheck(section, requestData.data);
				if ("fields" in prelimCheck) {
					if (prelimCheck.errorCode === "CHARACTERS_HIDDEN") {
						if (typeof verificationAttemptsChannel !== "undefined") {
							verificationAttemptsChannel.send(`⛔ **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but his/her RotMG profile has failed to meet one or more requirement(s). The verification process has been stopped.\n\t⇒ Error Code: ${prelimCheck.errorCode}\n\t⇒ Error Message: ${prelimCheck.errorMsgForLogging}`);
						}
						await member.send("Your characters are currently hidden. Please make sure everyone can see your characters.");
						return;
					}


					// MANUAL VERIF
					const botMsg: Message = await dmChannel.send(new MessageEmbed());

					let outputLogs: string = `⛔ **\`[${section.nameOfSection}]\`** ${member} tried to verify using \`${inGameName}\`, but his/her RotMG profile has failed to meet one or more requirement(s). The verification process has been stopped.\n\t⇒ Error Code: ${prelimCheck.errorCode}\n\t⇒ Error Message: ${prelimCheck.errorMsgForLogging}`;

					const failedEmbed: MessageEmbed = new MessageEmbed()
						.setTitle(`Manual Verification: **${guild.name}** ⇒ **${section.nameOfSection}**`)
						.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
						.setColor("RED");

					if (typeof manualVerificationChannel === "undefined") {
						failedEmbed
							.setDescription("You have failed to meet the requirements for the section. Please review the below requirements you have failed to meet and make note of them.")
							.addFields(...prelimCheck.fields)
							.setFooter("Verification Process: Stopped.");
					}
					else {
						const wantsToBeManuallyVerified: boolean | "TIME" = await new Promise(async (resolve, reject) => {
							const failedAppealEmbed: MessageEmbed = failedEmbed
								.setDescription(`You did not meet the requirements for this section. The requirements are: ${StringUtil.applyCodeBlocks(reqs.toString())}Would you like to appeal the decision with a staff member? Unreact and react with ✅ to appeal with a staff member; otherwise, react with ❌.\n\nNOTE: This may take up to a day. You will not be able to verify while your profile is under manual review. YOU ARE NOT GUARANTEED TO BE VERIFIED.`)
								.setFooter("⏳ Time Remaining: 2 Minutes and 0 Seconds.");
							const manaulVerifMsg: Message = await botMsg.edit(failedAppealEmbed);
							await manaulVerifMsg.react("✅").catch(() => { });
							await manaulVerifMsg.react("❌").catch(() => { });


							const mcd: MessageAutoTick = new MessageAutoTick(manaulVerifMsg, failedAppealEmbed, 2 * 60 * 1000, null, "⏳ Time Remaining: {m} Minutes and {s} Seconds.");
							// collector function 
							const collFilter: (r: MessageReaction, u: User) => boolean = (reaction: MessageReaction, user: User) => {
								return ["✅", "❌"].includes(reaction.emoji.name) && user.id === member.id;
							}

							// prepare collector
							const reactCollector: ReactionCollector = manaulVerifMsg.createReactionCollector(collFilter, {
								time: 2 * 60 * 1000,
								max: 1
							});

							// end collector
							reactCollector.on("end", async (collected: Collection<string, MessageReaction>, reason: string) => {
								mcd.disableAutoTick();
								if (reason === "time") {
									return resolve("TIME");
								}
							});

							reactCollector.on("collect", async (r: MessageReaction) => {
								if (r.emoji.name === "❌") {
									return resolve(false);
								}

								if (r.emoji.name === "✅") {
									return resolve(true);
								}
							});
						});

						if (wantsToBeManuallyVerified === "TIME") {
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
							await botMsg.edit(embed);
							return;
						}

						if (wantsToBeManuallyVerified) {
							failedEmbed
								.setDescription("You have chosen to have your profile manually reviewed by a staff member. Please be patient while a staff member checks your profile.")
								.setFooter("Verification Process: Stopped.");
							manualVerification(guild, member, requestData.data, manualVerificationChannel, section);
							outputLogs += `\nThis profile has been sent to the manual verification channel`;
						}
						else {
							failedEmbed
								.setDescription(`You have failed to meet the requirements for the server, and have chosen not to accept the manual verification offer. The server's verification requirements are below. ${StringUtil.applyCodeBlocks(reqs.toString())}\nReview which verification requirement you failed to meet below.`)
								.addFields(...prelimCheck.fields)
								.setFooter("Verification Process: Stopped.");
						}
					}

					await botMsg.edit(failedEmbed).catch(() => { });
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
		catch (e) {
			// TODO: find better way to make this apparant 
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
		// completely new profile
		if (resolvedUserDbDiscord === null && resolvedUserDbIGN === null) {
			const userMongo: MongoDbHelper.MongoDbUserManager = new MongoDbHelper.MongoDbUserManager(nameFromProfile);
			await userMongo.createNewUserDB(member.id);
		}
		else {
			// discord id found; ign NOT found in db
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
	 * @param {StringBuilder} reqs A StringBuilder containing all of the requirements. 
	 * @param {boolean} isOldProfile Whether the profile was pre-existing or not. 
	 * @param {GuildMember} member The guild member. 
	 */
	function getVerificationEmbed(guild: Guild, inGameName: string, reqs: StringBuilder, isOldProfile: boolean, code: string) {
		const verifEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string)
			.setTitle(`Verification For: **${guild.name}**`)
			.setDescription(`You have selected the in-game name: **\`${inGameName}\`**. To access your RealmEye profile, click [here](https://www.realmeye.com/player/${inGameName}).\n\nYou are almost done verifying; however, you need to do a few more things.\n\nTo stop the verification process, react with ❌.`)
			.setColor("RANDOM")
			.addField("1. Meet the Requirements", `Ensure you meet the requirements posted. For your convenience, the requirements for the server are listed below.${StringUtil.applyCodeBlocks(reqs.toString())}`)
			.setFooter("⏳ Time Remaining: 15 Minutes and 0 Seconds.");
		if (isOldProfile) {
			verifEmbed.addField("2. Get Your Verification Code", "Normally, I would require a verification code for your RealmEye profile; however, because I recognize you from a different server, you can skip this process completely.");
		}
		else {
			verifEmbed.addField("2. Get Your Verification Code", `Your verification code is: ${StringUtil.applyCodeBlocks(code)}Please put this verification code in one of your three lines of your RealmEye profile's description.`);
		}
		verifEmbed.addField("3. Check Profile Settings", `Ensure __anyone__ can view your general profile (stars, alive fame), characters, fame history, and name history. You can access your profile settings [here](https://www.realmeye.com/settings-of/${inGameName}). If you don't have your RealmEye account password, you can learn how to get one [here](https://www.realmeye.com/mreyeball#password).`)
			.addField("4. Wait", "Before you react with the check, make sure you wait. RealmEye may sometimes take up to 30 seconds to fully register your changes!")
			.addField("5. Confirm", "React with ✅ to begin the verification check. If you have already reacted, un-react and react again.");
		return verifEmbed;
	}

	function preliminaryCheck(
		sec: ISection,
		reapi: ITiffitRealmEyeProfile
	): PreliminaryCheck {
		// check rank
		if (sec.verification.stars.required && reapi.rank < sec.verification.stars.minimum) {
			return {
				errorMsg: "Your rank is not high enough to pass the verification check.",
				errorMsgForLogging: "The user's rank is not high enough to pass the verification check.",
				errorCode: "RANK_TOO_LOW",
				fields: [
					{
						name: "Minimum Rank",
						value: StringUtil.applyCodeBlocks(sec.verification.stars.minimum.toString()),
						inline: true
					},
					{
						name: "Account Rank",
						value: StringUtil.applyCodeBlocks(reapi.rank.toString()),
						inline: true
					}
				]
			};
		}

		// check alive fame
		if (sec.verification.aliveFame.required && reapi.fame < sec.verification.aliveFame.minimum) {
			return {
				errorMsg: "Your total alive fame is not high enough to pass the verification check.",
				errorMsgForLogging: "The user's total alive fame is not high enough to pass the verification check.",
				errorCode: "RANK_TOO_LOW",
				fields: [
					{
						name: "Minimum Fame",
						value: StringUtil.applyCodeBlocks(sec.verification.aliveFame.minimum.toString()),
						inline: true
					},
					{
						name: "Account Fame",
						value: StringUtil.applyCodeBlocks(reapi.fame.toString()),
						inline: true
					}
				]
			};
		}

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
			const maxedStat: number = Number.parseInt(character.stats_maxed.split("/")[0]);
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

		if (sec.verification.maxedStats.required) {
			if (reapi.characterCount === -1) {
				return {
					errorMsg: "Your characters are currently hidden.",
					errorMsgForLogging: "The user's characters are currently hidden.",
					errorCode: "CHARACTERS_HIDDEN",
					fields: [
						{
							name: "Characters Hidden",
							value: StringUtil.applyCodeBlocks("Profile characters are hidden. Make sure everyone can see your characters."),
							inline: true
						}
					]
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

			if (failsToMeetReq) {
				const neededChar: StringBuilder = new StringBuilder();
				if (sec.verification.maxedStats.required) {
					for (let i = 0; i < sec.verification.maxedStats.statsReq.length; i++) {
						if (sec.verification.maxedStats.statsReq[i] !== 0) {
							neededChar.append(`• ${sec.verification.maxedStats.statsReq[i]} ${i}/8 Character(s).`)
								.appendLine();
						}
					}
				}

				return {
					errorMsg: "Your characters' maxed stats do not meet the minimum maxed stats required.",
					errorMsgForLogging: "The characters' maxed stats are not sufficient enough to pass verification.",
					errorCode: "CHARACTER_STATS_TOO_LOW",
					fields: [
						{
							name: "Required Characters",
							value: StringUtil.applyCodeBlocks(neededChar.toString()),
							inline: true
						}
					]
				}
			}
		}

		return {
			rank: reapi.rank,
			aliveFame: reapi.account_fame,
			stats: [zero, one, two, three, four, five, six, seven, eight]
		};
	}

	/**
	 * Returns the name history of a person.
	 * @param {string} ign The in-game name. 
	 */
	export async function getRealmEyeNameHistory(ign: string): Promise<IAPIError | INameHistory[]> {
		const resp: AxiosResponse<string> = await Zero.AxiosClient.get(
			`https://www.realmeye.com/name-history-of-player/${ign}`,
			{
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36"
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
		verificationInfo: ITiffitRealmEyeProfile,
		manualVerificationChannel: TextChannel,
		section: ISection,
		nameHistoryInfo: INameHistory[] = []
	): Promise<void> {
		let zero: number = 0;
		let one: number = 0;
		let two: number = 0;
		let three: number = 0;
		let four: number = 0;
		let five: number = 0;
		let six: number = 0;
		let seven: number = 0;
		let eight: number = 0;

		for (let character of verificationInfo.characters) {
			const maxedStat: number = Number.parseInt(character.stats_maxed.split("/")[0]);
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

		const characterStats: string = `
		⇒ 0/8: ${zero}
		⇒ 1/8: ${one}
		⇒ 2/8: ${two}
		⇒ 3/8: ${three}
		⇒ 4/8: ${four}
		⇒ 5/8: ${five}
		⇒ 6/8: ${six}
		⇒ 7/8: ${seven}
		⇒ 8/8: ${eight}`;

		const manualVerifEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(member.user.tag, member.user.displayAvatarURL())
			.setTitle(`Manual Verification Request: **${verificationInfo.name}**`)
			.setDescription(`⇒ Section: ${section.nameOfSection}\n ⇒ User: ${member}\n⇒ IGN: ${verificationInfo.name}\n⇒ RealmEye: [Profile](https://www.realmeye.com/player/${verificationInfo.name})\n\nReact with ☑️ to manually verify this person; otherwise, react with ❌.`)
			.addField("Maxed Characters", StringUtil.applyCodeBlocks(verificationInfo.characterCount === -1 ? "Hidden" : characterStats), true)
			.addField("Current Rank", StringUtil.applyCodeBlocks(verificationInfo.rank.toString()), true)
			.addField("Alive Fame", StringUtil.applyCodeBlocks(verificationInfo.fame.toString()), true)
			.setColor("YELLOW")
			.setFooter("Requested On")
			.setTimestamp();
		const m: Message = await manualVerificationChannel.send(manualVerifEmbed);
		await m.react("☑️").catch(e => { });
		await m.react("❌").catch(e => { });

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
					inGameName: verificationInfo.name,
					rank: verificationInfo.rank,
					aFame: verificationInfo.fame,
					nameHistory: nameHistoryInfo,
					msgId: m.id,
					manualVerificationChannel: manualVerificationChannel.id
				}
			}
		})
	}
}