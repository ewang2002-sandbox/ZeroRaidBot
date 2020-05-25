import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, MessageCollector, MessageReaction, User, ReactionCollector, Collection, DMChannel, Guild, GuildMember } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { IRaidUser } from "../../Templates/IRaidUser";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MessageAutoTick } from "../../Classes/Message/MessageAutoTick";
import { VerificationHandler } from "../../Helpers/VerificationHandler";
import { StringUtil } from "../../Utility/StringUtil";
import { AxiosResponse } from "axios";
import { ITiffitNoUser, ITiffitRealmEyeProfile } from "../../Definitions/ITiffitRealmEye";
import { Zero } from "../../Zero";
import { TiffitRealmEyeAPI } from "../../Constants/ConstantVars";
import { INameHistory, IAPIError } from "../../Definitions/ICustomREVerification";
import { FilterQuery } from "mongodb";
import { StringBuilder } from "../../Classes/String/StringBuilder";

export class AddAltAccountCommand extends Command {
	public static readonly MAX_ALTS_ALLOWED: number = 10;

    public constructor() {
        super(
            new CommandDetail(
                "Add Alternative Account Command",
                "addaltaccount",
                [],
                "Adds an alternative account to your profile or updates your name in case of a name change.",
                ["addaltaccount"],
                ["addaltaccount"],
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

    public async executeCommand(
        msg: Message,
        args: string[],
        guildDb: IRaidGuild
    ): Promise<void> {
        let dmChannel: DMChannel;
        try {
            dmChannel = await msg.author.createDM();
        }
        catch (e) {
            await msg.channel.send(`${msg.member}, I cannot DM you. Please make sure your privacy settings are set so anyone can send messages to you.`).catch(() => { });
            return;
        }

        const userDb: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.getUserDbByDiscordId(msg.author.id);
        if (userDb === null) {
            MessageUtil.send({ content: "You do not have a profile registered with the bot. Please contact an administrator or try again later." }, msg.author, 1 * 60 * 1000);
            return;
        }

        const inGameName: string | "CANCEL_" | "TIME_" = await VerificationHandler.getInGameNameByPrompt(
            msg.author,
			dmChannel,
			null,
            userDb,
            null
        );

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
            .addField("2. Check Profile Settings", `Ensure __anyone__ can view your name history and __no one__ can view your last-seen location. You can access your profile settings [here](https://www.realmeye.com/settings-of/${inGameName}). If you don't have your RealmEye account password, you can learn how to get one [here](https://www.realmeye.com/mreyeball#password).`)
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
        reactCollector.on("end", () => {
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
				await dmChannel.send(`An error occurred when trying to connect to your RealmEye profile.\n\tError: ${e}`);
				return;
			}

			if ("error" in requestData.data) {
				await dmChannel.send("I could not find your RealmEye profile; you probably made your profile private. Ensure your profile's visibility is set to public and try again.");
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
				await dmChannel.send(`Your verification code, \`${code}\`, wasn't found in your RealmEye description! Make sure the code is on your description and then try again.`);
				canReact = true;
				return;
			}

			if (requestData.data.last_seen !== "hidden") {
				await dmChannel.send("Your last-seen location is not hidden. Please make sure __no one__ can see your last-seen location.");
				canReact = true;
				return;
			}

			let nameHistory: INameHistory[] | IAPIError;
			try {
				nameHistory = await VerificationHandler.getRealmEyeNameHistory(requestData.data.name);
			} catch (e) {
				reactCollector.stop();
				await dmChannel.send(`An error occurred when trying to connect to your RealmEye profile.\n\tError: ${e}`);
				return;
			}

			if ("errorMessage" in nameHistory) {
				await dmChannel.send("Your Name History is not public! Set your name history to public first and then try again.");
				canReact = true;
				return;
			}

            let nameToReplaceWith: string = "";
            const allNames: string[] = [userDb.rotmgLowercaseName, ...userDb.otherAccountNames.map(x => x.lowercase)];
			for (const nameEntry of nameHistory) {
				for (const nameInDb of allNames) {
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
			if (resolvedUserDbDiscord !== null && resolvedUserDbIGN !== null) {
				VerificationHandler.verifyMoreThanOneIGNProfile(msg.author, nameFromProfile);
			}
			else if (resolvedUserDbDiscord !== null && resolvedUserDbIGN === null) {
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
							let symbols: string = StringUtil.getSymbolsFromStartOfString(allNames[0]);
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
								.catch(() => { });
						}
					}
				}
			}
		});
    }

}