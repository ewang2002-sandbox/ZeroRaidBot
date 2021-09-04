import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, Guild, MessageEmbed, EmojiResolvable, GuildEmoji, ReactionEmoji, Collection, GuildMember, Role, Emoji } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { FastReactionMenuManager } from "../../Classes/Reaction/FastReactionMenuManager";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { IRaidUser } from "../../Templates/IRaidUser";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { UserHandler } from "../../Helpers/UserHandler";
import { OtherUtil } from "../../Utility/OtherUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { ArrayUtil } from "../../Utility/ArrayUtil";

export class AdminProfileUpdaterCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Administrator Profile Updater Command",
				"adminprofileupdater",
				[],
				"Allows administrators to check profiles, create new profiles, and more.",
				["adminprofileupdater"],
				["adminprofileupdater"],
				0
			),
			new CommandPermission(
				["ADMINISTRATOR"],
				["MANAGE_NICKNAMES", "MANAGE_GUILD"],
				[],
				[],
				false
			),
			true,
			false,
			true,
			0
		);
	}

	public async executeCommand(
		msg: Message,
		args: string[],
		guildDb: IRaidGuild
	): Promise<void> {
		this.commandMainMenu(msg, guildDb);
	}

	public async commandMainMenu(msg: Message, guildDb: IRaidGuild, botMsg?: Message): Promise<void> {
		if (typeof botMsg !== "undefined") {
			await botMsg.reactions.removeAll().catch(e => { });
		}
		const introEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("**Administrator: Profile Manager**")
			.setDescription("Use this command to make changes, such as creating a new profile, editing someone's profile, and more.\n\n⚠️ You are accessing an owner-only command as this command has the potential to harm the integrity of the user profile check. Furthermore, this command will completely bypass moderation checks (including blacklists). As such, usage of this command may be monitored. Any form of abuse will result in consequences.")
			.addField("Force-Sync Members/DB", "React with 🔄 to force-sync the database with all current __verified__ (Suspended & Verified) members. The bot will give anyone that doesn't have an entry in the database but is verified in the server a new entry in the database. Note that the bot will first show you the changes that will be made and then ask you to confirm those changes.")
			.addField("Add Profile to Database", "React with 🔼 to add a profile to the database. You will be asked to mention a person. Then, you will be asked to provide an in-game name.")
			.addField("Remove Profile from Database", "React with 🔽 to remove a profile from the database. The profile will be completely wiped from the database. Bear in mind that the person will NOT be unverified but will not be able to access numerous commands.")
			.addField("Edit User Profile", "React with 📩 to edit a user's profile. This will allow you to add, remove, or edit a person's main IGN and/or alternative IGN(s). At this time, you are not able to change the Discord ID of a profile.")
			.addField("Exit Process", "React with ❌ to exit the process. The menu will be closed and will not be accessible unless the command is used again.")
			.setColor("RED")
			.setFooter("Administrator: Profile Updater");
		botMsg = typeof botMsg === "undefined"
			? await msg.channel.send(introEmbed)
			: await botMsg.edit(introEmbed);

		const reactions: EmojiResolvable[] = ["🔄", "🔼", "🔽", "📩", "❌"];
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

		if (selectedReaction.name === "❌") {
			await botMsg.delete().catch(e => { });
			return;
		}

		if (selectedReaction.name === "🔄") {
			this.forceSyncCmd(msg, botMsg, guildDb);
			return;
		}
		else if (selectedReaction.name === "🔼") {
			this.addProfileCmd(msg, botMsg, guildDb);
			return;
		}
		else if (selectedReaction.name === "🔽") {
			this.removeProfileCmd(msg, botMsg, guildDb);
			return;
		}
		else if (selectedReaction.name === "📩") {
			this.editProfileCmd(msg, botMsg, guildDb);
			return;
		}
	}

	private async forceSyncCmd(msg: Message, botMsg: Message, guildData: IRaidGuild): Promise<void> {
		await botMsg.reactions.removeAll().catch(e => { });

		const guild: Guild = msg.guild as Guild;
		const verifiedRole: Role | undefined = guild.roles.cache.get(guildData.roles.raider);
		const suspendedRole: Role | undefined = guild.roles.cache.get(guildData.roles.suspended);

		if (typeof verifiedRole === "undefined") {
			const editedMsg: Message = await botMsg.edit(this.getNoVerifiedRoleEmbed(msg));
			await editedMsg.delete({ timeout: 5000 });
			return;
		}

		// check which members do not have a db entry 
		const [allUsersInDb, members] = await Promise.all([
			MongoDbHelper.MongoDbUserManager.MongoUserClient.find({}).toArray(),
			guild.members.fetch()
		]);
		const userDbSet = new Set(allUsersInDb.map(x => x.discordUserId));

		const allMembers: Collection<string, GuildMember> = members
			.filter(member => (member.roles.cache.has(verifiedRole.id) || Boolean(suspendedRole && member.roles.cache.has(suspendedRole.id))) && !member.user.bot);
		const membersWithNoDbEntry: [GuildMember, string[]][] = [];

		for (const [id, member] of allMembers) {
			if (!userDbSet.has(id)) {
				const ign: string[] = member.displayName
					.split("|")
					.map(x => x.trim().replace(/[^A-Za-z]/g, ""));

				membersWithNoDbEntry.push([member, ign]);
			}
		}

		// now make sure we actually have members
		const noOneToAddEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("All Synced")
			.setDescription("All verified members in this server have a profile. You don't need to do anything!")
			.setFooter(`${allMembers.size} Total Verified Members Checked`)
			.setColor("GREEN");

		if (membersWithNoDbEntry.length === 0) {
			const editedMsg: Message = await botMsg.edit(noOneToAddEmbed);
			await editedMsg.delete({ timeout: 5000 });
			return;
		}

		// we have members
		let reactToMsg: boolean = true;
		// see who to remove
		while (true) {
			const memberToGiveProfileEmbed: MessageEmbed = new MessageEmbed()
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.setTitle("Members With No Profile")
				.setDescription("The members below are verified in this server but do not have a profile logged with the bot. The mention is shown first, along with any corresponding IGNs. The first IGN is the main IGN, and any other IGNs will be the alternative IGN.\n\n**DIRECTIONS:** The members shown below will have a profile created for them. Type the number corresponding to the member(s) that you do NOT want to have a profile created for.\n\n**FINISHED?** React with the ✅ to begin the syncing process. React with the ❌ to cancel this process completely.");

			const fieldsForEmbed: string[] = ArrayUtil.arrayToStringFields<[GuildMember, string[]]>(
				membersWithNoDbEntry,
				(i, element) => `**\`[${i + 1}]\`** ${element[0]}\n⇒ IGN(s): ${element[1].join(", ")}\n\n`,
				1020
			);

			let iterated = 0;
			for (let i = 0; i < fieldsForEmbed.length; i++) {
				if (memberToGiveProfileEmbed.length + fieldsForEmbed[i].length + "No Profile".length > 5900) 
					break; 
				memberToGiveProfileEmbed.addField("No Profile", fieldsForEmbed[i]);
				iterated++
			}

			if (fieldsForEmbed.length - iterated > 0) {
				memberToGiveProfileEmbed.addField("No Profile", "And more profiles that cannot be displayed.");
			}

			await botMsg.edit(memberToGiveProfileEmbed).catch(console.error);

			const response: number | Emoji | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<number>(
				msg,
				{ embed: memberToGiveProfileEmbed },
				2,
				TimeUnit.MINUTE
			).sendWithReactCollector(GenericMessageCollector.getNumber(msg.channel, 1), {
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
					return;
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

				const index: number = response - 1;
				if (0 <= index && index < membersWithNoDbEntry.length) {
					membersWithNoDbEntry.splice(index, 1);
					if (membersWithNoDbEntry.length === 0) {
						const editedMsg: Message = await botMsg.edit(noOneToAddEmbed);
						await editedMsg.delete({ timeout: 5000 });
						return;
					}
				}
			}
		}
		await botMsg.reactions.removeAll().catch(e => { });

		// now create entries
		const docs: IRaidUser[] = [];
		for await (const [member, igns] of membersWithNoDbEntry) {
			const mainIgn: string = igns[0];
			igns.splice(0, 1);
			const altIgns: {
				displayName: string;
				lowercase: string;
			}[] = [];
			for (const ign of igns) {
				altIgns.push({
					displayName: ign,
					lowercase: ign.toLowerCase()
				});
			}

			docs.push({
				discordUserId: member.id,
				rotmgDisplayName: mainIgn,
				rotmgLowercaseName: mainIgn.toLowerCase(),
				otherAccountNames: altIgns,
				lastModified: new Date().getTime(),
				general: {
					keyPops: [],
					voidVials: [],
					wcOryx: [],
					completedRuns: [],
					leaderRuns: [],
					moderationHistory: []
				}
			});
		}

		const res = await MongoDbHelper.MongoDbUserManager.MongoUserClient.insertMany(docs);

		const finalEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setColor("GREEN")
			.setTitle("Sync Completed")
			.setDescription(`${res.insertedCount}/${membersWithNoDbEntry.length} accounts were successfully synced.`)
			.setFooter("Process Completed.")
			.setTimestamp();
		await botMsg.edit(finalEmbed);
		await botMsg.delete({ timeout: 5000 }).catch(e => { });
	}

	private async addProfileCmd(msg: Message, botMsg: Message, guildData: IRaidGuild): Promise<void> {
		await botMsg.reactions.removeAll().catch(e => { });

		const guild: Guild = msg.guild as Guild;
		const verifiedRole: Role | undefined = guild.roles.cache.get(guildData.roles.raider);

		if (typeof verifiedRole === "undefined") {
			const editedMsg: Message = await botMsg.edit(this.getNoVerifiedRoleEmbed(msg));
			await editedMsg.delete({ timeout: 5000 });
			return;
		}

		const memberForProfile: GuildMember | "CANCEL_CMD" | "GO_BACK_CMD" = await this.getMember(msg, botMsg, guildData);
		if (memberForProfile === "CANCEL_CMD") {
			await botMsg.delete().catch(e => { });
			return;
		}

		if (memberForProfile === "GO_BACK_CMD") {
			this.commandMainMenu(msg, guildData, botMsg);
			return;
		}

		await botMsg.reactions.removeAll().catch(e => { });

		// maybe check for ign as well?
		const dbProfile: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.MongoUserClient
			.findOne({ discordUserId: memberForProfile.id });

		const responseEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setFooter("Administrator: Add Profile");

		if (dbProfile !== null) {
			responseEmbed.setTitle("Profile Already Exists!")
				.setColor("GREEN")
				.setDescription(`${memberForProfile} already has a profile!`);
			await botMsg.edit(responseEmbed).catch(e => { });
			await botMsg.delete({ timeout: 5000 }).catch(e => { });
			return;
		}

		let ignToUse: string = await this.getIGN(
			msg,
			botMsg,
			`Please type an in-game name that you want to associate with ${memberForProfile}'s profile. The in-game name must be at least one letter long and no longer than ten letters. There must not be any symbols. Furthermore, the name should appear exactly as seen in-game (in other words, take capitalization into account).`
		);

		if (ignToUse === "CANCEL_CMD") {
			await botMsg.delete().catch(e => { });
			return;
		}

		if (ignToUse === "GO_BACK_CMD") {
			this.commandMainMenu(msg, guildData, botMsg);
			return;
		}

		await new MongoDbHelper.MongoDbUserManager(ignToUse)
			.createNewUserDB(memberForProfile.id);

		responseEmbed
			.setTitle("Profile Creation Successful!")
			.setDescription(`A profile has been created for ${memberForProfile}.\nIGN: \`${ignToUse}\`.`);
		await botMsg.edit(responseEmbed).catch(e => { });
		await botMsg.delete({ timeout: 5000 }).catch(e => { });
	}

	private async removeProfileCmd(msg: Message, botMsg: Message, guildData: IRaidGuild): Promise<void> {
		await botMsg.reactions.removeAll().catch(e => { });

		const guild: Guild = msg.guild as Guild;
		const verifiedRole: Role | undefined = guild.roles.cache.get(guildData.roles.raider);

		if (typeof verifiedRole === "undefined") {
			const editedMsg: Message = await botMsg.edit(this.getNoVerifiedRoleEmbed(msg));
			await editedMsg.delete({ timeout: 5000 });
			return;
		}

		const memberForProfileDeletion: GuildMember | "CANCEL_CMD" | "GO_BACK_CMD" = await this.getMember(msg, botMsg, guildData);
		if (memberForProfileDeletion === "CANCEL_CMD") {
			await botMsg.delete().catch(e => { });
			return;
		}

		if (memberForProfileDeletion === "GO_BACK_CMD") {
			await this.commandMainMenu(msg, guildData, botMsg);
			return;
		}

		await botMsg.reactions.removeAll().catch(e => { });

		const dbProfile: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.MongoUserClient
			.findOne({ discordUserId: memberForProfileDeletion.id });

		const responseEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setFooter("Administrator: Remove Profile");

		if (dbProfile === null) {
			responseEmbed.setColor("RED")
				.setTitle("Profile Not Found")
				.setDescription(`The person, ${memberForProfileDeletion}, does not appear to have a profile with the bot. You do not have to do anything!`);
			await botMsg.edit(responseEmbed).catch(e => { });
			await OtherUtil.waitFor(5 * 1000);
			this.commandMainMenu(msg, guildData, botMsg);
			return;
		}

		const confirmEmbed: MessageEmbed = new MessageEmbed(responseEmbed);
		confirmEmbed.setTitle("Delete Profile?")
			.setDescription(`Are you sure you want to delete ${memberForProfileDeletion}'s profile? __All__ data corresponding to this profile will be lost, and you will not be able to recover anything. Furthermore, the person will not be unverified from any servers and will not be able to access several important commands.`)
			.addField("Names Registered", `⇒ **Main:** ${dbProfile.rotmgDisplayName}\n⇒ **Alt:** ${dbProfile.otherAccountNames.length === 0 ? "N/A" : dbProfile.otherAccountNames.map(x => x.displayName).join(", ")}`)
			.addField("Stats", `⇒ **Completed Runs Entries:** ${dbProfile.general.completedRuns.length}\n⇒ **Key Pops Entries:** ${dbProfile.general.keyPops.length}\n⇒ **Leader Runs Entries:** ${dbProfile.general.leaderRuns.length}\n⇒ **Vial Entries:** ${dbProfile.general.voidVials.length}\n⇒ **O3 Entries:** ${dbProfile.general.wcOryx.length}`)
			.setColor("RED");
		await botMsg.edit(confirmEmbed);
		const emojiReacted: GuildEmoji | ReactionEmoji | "TIME_CMD" = await new FastReactionMenuManager(
			botMsg,
			msg.author,
			["✅", "❌"],
			2,
			TimeUnit.MINUTE
		).react();

		if (emojiReacted === "TIME_CMD") {
			await botMsg.delete().catch(e => { });
			return;
		}

		if (emojiReacted.name === "❌") {
			responseEmbed.setTitle("Profile Deletion Canceled")
				.setDescription(`${memberForProfileDeletion}'s profile has not been deleted.`)
				.setColor("GREEN");
			await botMsg.edit(responseEmbed).catch(e => { });
			await botMsg.delete({ timeout: 5000 }).catch(e => { });
			return;
		}

		// delete profile :(
		await MongoDbHelper.MongoDbUserManager.MongoUserClient
			.deleteOne({ discordUserId: memberForProfileDeletion.id });

		responseEmbed.setTitle("Profile Deleted Successfully")
			.setDescription(`${memberForProfileDeletion}'s profile has been deleted. He or she will either have to reverify in the server in order to get a new profile OR ask the bot owner to generate a new profile.`)
			.setColor("GREEN");
		await botMsg.edit(responseEmbed).catch(e => { });
		await botMsg.delete({ timeout: 5000 }).catch(e => { });
		return;
	}

	private async editProfileCmd(msg: Message, botMsg: Message, guildData: IRaidGuild): Promise<void> {
		await botMsg.reactions.removeAll().catch(e => { });

		const guild: Guild = msg.guild as Guild;
		const verifiedRole: Role | undefined = guild.roles.cache.get(guildData.roles.raider);

		if (typeof verifiedRole === "undefined") {
			const editedMsg: Message = await botMsg.edit(this.getNoVerifiedRoleEmbed(msg));
			await editedMsg.delete({ timeout: 5000 });
			return;
		}

		const memberForProfileEdit: GuildMember | "CANCEL_CMD" | "GO_BACK_CMD" = await this.getMember(msg, botMsg, guildData);
		if (memberForProfileEdit === "CANCEL_CMD") {
			await botMsg.delete().catch(e => { });
			return;
		}

		if (memberForProfileEdit === "GO_BACK_CMD") {
			this.commandMainMenu(msg, guildData, botMsg);
			return;
		}

		await botMsg.reactions.removeAll().catch(e => { });

		const dbProfile: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.MongoUserClient
			.findOne({ discordUserId: memberForProfileEdit.id });

		const responseEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setFooter("Administrator: Edit Profile");

		if (dbProfile === null) {
			responseEmbed.setColor("RED")
				.setTitle("Profile Not Found")
				.setDescription(`The person, ${memberForProfileEdit}, does not appear to have a profile with the bot. You are unable to make changes.`);
			await botMsg.edit(responseEmbed).catch(e => { });
			await OtherUtil.waitFor(5 * 1000);
			this.commandMainMenu(msg, guildData, botMsg);
			return;
		}

		this.profileEditingMenu(msg, botMsg, memberForProfileEdit, dbProfile, guildData);
	}


	// EDITING PROFILE METHODS


	private async profileEditingMenu(
		msg: Message,
		botMsg: Message,
		targetMember: GuildMember,
		memberData: IRaidUser,
		guildDb: IRaidGuild
	): Promise<void> {
		const mainMenuEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(targetMember.user.tag, targetMember.user.displayAvatarURL())
			.setTitle(`Editing Profile: ${targetMember.user.tag}`)
			.setColor("RANDOM")
			.setTimestamp()
			.setFooter("Administrator: Profile Editing")
			.setDescription(`You are currently editing ${targetMember}'s profile. You will only be able to edit the person's in-game name and alternative accounts. You are not able to edit user stats at this time.\n\n⇒ **Main IGN:** ${memberData.rotmgDisplayName}\n⇒ **Alternative IGN(s):** ${memberData.otherAccountNames.length === 0 ? "N/A" : memberData.otherAccountNames.map(x => x.displayName).join(", ")}\n⇒ **Discord ID:** ${memberData.discordUserId}`);

		const reactions: EmojiResolvable[] = ["⬅️", "🅰️", "🅱️"];
		mainMenuEmbed.addField("Go Back", "React with ⬅️ to go back to the previous menu.")
			.addField("Edit Main IGN", "React with 🅰️ to edit this person's main in-game name.")
			.addField("Edit Alternative IGNs", "React with 🅱️ to edit this person's alternative IGNs. You will be able to add, remove, or edit the IGNs.");

		mainMenuEmbed
			.addField("Cancel Process", "React with ❌ to cancel this process entirely. This will automatically occur after 5 minutes.");
		reactions.push("❌");

		await botMsg.edit(mainMenuEmbed).catch(e => { });
		const reaction: Emoji | "TIME_CMD" = await new FastReactionMenuManager(
			botMsg,
			msg.author,
			reactions,
			5,
			TimeUnit.MINUTE
		).react();

		if (reaction === "TIME_CMD" || reaction.name === "❌") {
			await botMsg.delete().catch(e => { });
			return;
		}

		await botMsg.reactions.removeAll().catch(e => { });

		// edit main ign
		if (reaction.name === "⬅️") {
			this.commandMainMenu(msg, guildDb, botMsg);
			return;
		}
		else if (reaction.name === "🅰️") {
			let ignToUse: string = await this.getIGN(
				msg,
				botMsg,
				`You are currently replacing the old main in-game name, ${memberData.rotmgDisplayName}. Please type in the in-game name that you want to use to replace the old in-game name. The new in-game name must be at least one letter long and no longer than ten letters. There must not be any symbols. Furthermore, the name should appear exactly as seen in-game (in other words, take capitalization into account).`
			);

			if (ignToUse === "CANCEL_CMD") {
				await botMsg.delete().catch(e => { });
				return;
			}

			if (ignToUse === "GO_BACK_CMD") {
				this.profileEditingMenu(msg, botMsg, targetMember, memberData, guildDb);
				return;
			}

			await botMsg.reactions.removeAll().catch(e => { });

			return this.profileEditingMenu(msg, botMsg, targetMember, (await MongoDbHelper.MongoDbUserManager.MongoUserClient.findOneAndUpdate({ discordUserId: targetMember.id }, {
				$set: {
					rotmgDisplayName: ignToUse,
					rotmgLowercaseName: ignToUse.toLowerCase()
				}
			}, { returnOriginal: false })).value as IRaidUser, guildDb);
		}
		// alt acc
		else if (reaction.name === "🅱️") {
			this.altIgnMenu(msg, botMsg, targetMember, memberData, guildDb);
			return;
		}
		else {
			this.commandMainMenu(msg, guildDb, botMsg);
			return;
		}
	}

	private async altIgnMenu(
		msg: Message,
		botMsg: Message,
		targetMember: GuildMember,
		memberData: IRaidUser,
		guildDb: IRaidGuild
	): Promise<void> {
		await botMsg.reactions.removeAll().catch(e => { });

		const mainMenuEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(targetMember.user.tag, targetMember.user.displayAvatarURL())
			.setTitle(`Editing Profile: ${targetMember.user.tag} ⇒ Alternative Accounts`)
			.setColor("RANDOM")
			.setTimestamp()
			.setFooter("Administrator: Profile Editing")
			.setDescription(`**Alternative IGN(s):**\n${memberData.otherAccountNames.length === 0 ? "N/A" : memberData.otherAccountNames.map(x => x.displayName).join(", ")}`)
			.addField("Go Back", "React with ⬅️ to go back to the previous menu.")
			.addField("Add Alternative Account", "React with 🅰️ to add an alternative account.")
			.addField("Remove Alternative Account", "React with 🅱️ to remove an alternative account.");
		const reactions: EmojiResolvable[] = ["⬅️", "🅰️", "🅱️"];
		await botMsg.edit(mainMenuEmbed).catch(e => { });

		const chosenReactions: Emoji | "TIME_CMD" = await new FastReactionMenuManager(
			botMsg,
			msg.author,
			reactions,
			2,
			TimeUnit.MINUTE
		).react();

		if (chosenReactions === "TIME_CMD") {
			await botMsg.delete().catch(e => { });
			return;
		}

		await botMsg.reactions.removeAll().catch(e => { });

		const responseEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setFooter("Administrator: Edit Profile");

		if (chosenReactions.name === "⬅️") {
			this.profileEditingMenu(msg, botMsg, targetMember, memberData, guildDb);
			return;
		}
		// add alt
		else if (chosenReactions.name === "🅰️") {
			if (memberData.otherAccountNames.length + 1 > 50) {
				responseEmbed.setTitle("Too Many Alternative Accounts")
					.setDescription("A profile can only have up to 50 alternative accounts.")
					.setColor("RED");
				await botMsg.edit(responseEmbed).catch(e => { });
				await OtherUtil.waitFor(5 * 1000);
				this.altIgnMenu(msg, botMsg, targetMember, memberData, guildDb);
				return;
			}

			let ignToUse: string = await this.getIGN(
				msg,
				botMsg,
				`Please type an in-game name that you want to add as an alternative account for ${targetMember}. The in-game name must be at least one letter long and no longer than ten letters. There must not be any symbols. Furthermore, the name should appear exactly as seen in-game (in other words, take capitalization into account).`
			);

			if (ignToUse === "CANCEL_CMD") {
				await botMsg.delete().catch(e => { });
				return;
			}

			if (ignToUse === "GO_BACK_CMD") {
				await this.profileEditingMenu(msg, botMsg, targetMember, memberData, guildDb);
				return;
			}

			await botMsg.reactions.removeAll().catch(e => { });

			await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne({ discordUserId: targetMember.id }, {
				$push: {
					otherAccountNames: {
						displayName: ignToUse,
						lowercase: ignToUse.toLowerCase()
					}
				}
			});

			responseEmbed.setColor("GREEN")
				.setTitle("Alternative IGN Added")
				.setDescription(`The alternative in-game name, ${ignToUse}, has been added to ${targetMember}'s profile.`);
			await botMsg.edit(responseEmbed).catch(e => { });
			await botMsg.delete({ timeout: 5000 }).catch(e => { });
			return;
		}
		// remove alt
		else if (chosenReactions.name === "🅱️") {
			if (memberData.otherAccountNames.length <= 0) {
				responseEmbed.setTitle("No Alternative Accounts")
					.setDescription("This profile does not have any alternative accounts linked to it. Please try again later.")
					.setColor("RED");
				await botMsg.edit(responseEmbed).catch(e => { });
				await OtherUtil.waitFor(5 * 1000);
				this.altIgnMenu(msg, botMsg, targetMember, memberData, guildDb);
				return;
			}

			let indexToRemove: number = -1;
			let hasReactedToMessage: boolean = false;
			while (true) {
				const embed: MessageEmbed = new MessageEmbed()
					.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
					.setTitle("Select Alternative Account")
					.setDescription(`Selected Alternative IGN: ${indexToRemove === -1 ? "`N/A`" : `\`${memberData.otherAccountNames[indexToRemove].displayName}\``}\n\n**DIRECTIONS:** Please select an alternative account that you want to remove. Simply type the number corresponding to the name that you want to remove.\n\n**REACTIONS**\n⇒ React with ⬅️ to go back to the previous menu.\n⇒ React with the ✅ to confirm the removal of the selected alternative account above.\n⇒ React with the ❌ to cancel this process completely.`);

				const arrFieldsContent: string[] = ArrayUtil.arrayToStringFields<{
					displayName: string;
					lowercase: string;
				}>(memberData.otherAccountNames, (i, elem) => `[${i + 1}] ${elem.displayName}\n`);

				for (const elem of arrFieldsContent) {
					embed.addField("Alternative Accounts", StringUtil.applyCodeBlocks(elem));
				}

				await botMsg.edit(embed).catch(e => { });

				const response: number | Emoji | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<number>(
					msg,
					{ embed: embed },
					2,
					TimeUnit.MINUTE
				).sendWithReactCollector(GenericMessageCollector.getNumber(msg.channel, 1), {
					reactions: ["⬅️", "✅", "❌"],
					cancelFlag: "-cancel",
					reactToMsg: !hasReactedToMessage,
					deleteMsg: false,
					removeAllReactionAfterReact: false,
					oldMsg: botMsg
				});

				if (hasReactedToMessage) {
					hasReactedToMessage = !hasReactedToMessage;
				}

				if (response instanceof Emoji) {
					if (response.name === "⬅️") {
						this.altIgnMenu(msg, botMsg, targetMember, memberData, guildDb);
						return;
					}
					else if (response.name === "❌") {
						await botMsg.delete().catch(e => { });
						return;
					}
					else {
						if (indexToRemove !== -1) {
							break;
						}
					}
				}
				else {
					if (response === "CANCEL_CMD" || response === "TIME_CMD") {
						await botMsg.delete().catch(e => { });
						return;
					}

					if (0 <= (response - 1) && (response - 1) < memberData.otherAccountNames.length) {
						indexToRemove = response - 1;
					}
				}
			}

			await botMsg.reactions.removeAll().catch(e => { });

			await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne({ discordUserId: targetMember.id }, {
				$pull: {
					otherAccountNames: {
						lowercase: memberData.otherAccountNames[indexToRemove].lowercase
					}
				}
			});

			responseEmbed.setColor("GREEN")
				.setTitle("Alternative IGN Removed")
				.setDescription(`The alternative in-game name, ${memberData.otherAccountNames[indexToRemove].displayName}, has been removed from ${targetMember}'s profile.`);
			await botMsg.edit(responseEmbed).catch(e => { });
			await botMsg.delete({ timeout: 5000 }).catch(e => { });
			return;
		}
	}


	// HELPER METHODS

	private async getIGN(
		msg: Message,
		botMsg: Message,
		directions: string
	): Promise<string | "CANCEL_CMD" | "GO_BACK_CMD"> {
		let ignToUse: string = "";
		let reactToMsg: boolean = true;
		// get ign
		while (true) {
			const responseEmbed: MessageEmbed = new MessageEmbed()
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.setFooter("Administrator: Profile Updater");

			const sb: StringBuilder = new StringBuilder()
				.append(`Selected In-Game Name: **\`${ignToUse === "" ? "N/A" : ignToUse}\`**`)
				.appendLine()
				.appendLine()
				.append(`**DIRECTIONS:** ${directions}`)
				.appendLine()
				.appendLine()
				.append("**REACTIONS** \n⇒ React with ⬅️ to go back to the previous menu.\n⇒ React with the ✅ to use the IGN specified above for the member.\n⇒ React with the ❌ to cancel this process completely.");

			const ignEmbed: MessageEmbed = new MessageEmbed()
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.setColor("GREEN")
				.setTitle("Provide In-Game Name")
				.setDescription(sb.toString())
				.setFooter("Administrator: Profile Updater");

			await botMsg.edit(ignEmbed).catch(e => { });

			const response: string | Emoji | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<string>(
				msg,
				{ embed: ignEmbed },
				2,
				TimeUnit.MINUTE
			).sendWithReactCollector(GenericMessageCollector.getStringPrompt(msg.channel), {
				reactions: ["⬅️", "✅", "❌"],
				cancelFlag: "-cancel",
				reactToMsg: reactToMsg,
				deleteMsg: false,
				removeAllReactionAfterReact: false,
				oldMsg: botMsg
			});

			if (reactToMsg) {
				reactToMsg = !reactToMsg;
			}

			if (response instanceof Emoji) {
				if (response.name === "✅" && ignToUse !== "") {
					break;
				}

				if (response.name === "❌") {
					return "CANCEL_CMD";
				}

				if (response.name === "⬅️") {
					return "GO_BACK_CMD";
				}
			}
			else {
				if (response === "TIME_CMD" || response === "CANCEL_CMD") {
					return "CANCEL_CMD";
				}

				if (!/^[a-zA-Z]+$/.test(response) || response.length > 14) {
					const copyEmbed: MessageEmbed = new MessageEmbed(responseEmbed);
					copyEmbed.setTitle("Invalid Name")
						.setColor("RED")
						.setDescription(`The name you provided, \`${response}\`, can only have letters. Furthermore, the name can only be 14 letters long or less.`);
					await botMsg.edit(copyEmbed).catch(e => { });
					await OtherUtil.waitFor(3 * 1000);
				}
				else {
					const amtRepeat: number = await this.getAmtRepeatEntries(response);
					if (amtRepeat !== 0) {
						const responseEmbed: MessageEmbed = new MessageEmbed()
							.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
							.setColor("RED")
							.setFooter("Administrator: Profile Updater")
							.setTitle("Conflicting Name Detected")
							.setDescription(`The name you provided, \`${response}\`, is registered with ${amtRepeat} other profiles. Please try with a different name.`);
						await botMsg.edit(responseEmbed).catch(e => { });
						await OtherUtil.waitFor(3 * 1000);
					}
					else {
						ignToUse = response;
					}
				}
			}
		}

		return ignToUse;
	}

	private async getAmtRepeatEntries(
		ign: string
	): Promise<number> {
		const searchResults: IRaidUser[] = await MongoDbHelper.MongoDbUserManager.MongoUserClient.find({
			$or: [
				{
					rotmgLowercaseName: ign.toLowerCase()
				},
				{
					"otherAccountNames.lowercase": ign.toLowerCase()
				}
			]
		}).toArray();

		return searchResults.length;
	}

	private getNoVerifiedRoleEmbed(msg: Message): MessageEmbed {
		return new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("No Verified Role")
			.setDescription("Your server does not have a Member role. As such, this command cannot be used.")
			.setFooter("Process Canceled")
			.setColor("RED");
	}

	private async getMember(msg: Message, botMsg: Message, guildData: IRaidGuild): Promise<GuildMember | "CANCEL_CMD" | "GO_BACK_CMD"> {
		const guild: Guild = msg.guild as Guild;
		let memberToGenerateProfileFor: GuildMember | undefined;

		let reactToMsg: boolean = true;
		while (true) {
			const sb: StringBuilder = new StringBuilder()
				.append(`Selected Member: ${typeof memberToGenerateProfileFor === "undefined" ? "N/A" : memberToGenerateProfileFor}`)
				.appendLine()
				.appendLine()
				.append("**DIRECTIONS:** To select a person, either mention him or her, type his or her ID, or type his or her in-game name. The person must be verified (either with the Suspended role or Verified Member role) in order for this to work.")
				.appendLine()
				.appendLine()
				.append("**REACTIONS** \n⇒ React with ⬅️ to go back to the previous menu.\n⇒ React with the ✅ to select the member above and proceed to the next step.\n⇒ React with the ❌ to cancel this process completely.");

			const embed: MessageEmbed = new MessageEmbed()
				.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
				.setTitle("**Select Member**")
				.setFooter("Administrator: Profile Updater")
				.setDescription(sb.toString())

			await botMsg.edit(embed).catch(e => { });

			const response: string | Emoji | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<string>(
				msg,
				{ embed: embed },
				2,
				TimeUnit.MINUTE
			).sendWithReactCollector(GenericMessageCollector.getStringPrompt(msg.channel), {
				reactions: ["⬅️", "✅", "❌"],
				cancelFlag: "-cancel",
				reactToMsg: reactToMsg,
				deleteMsg: false,
				removeAllReactionAfterReact: false,
				oldMsg: botMsg
			});

			if (reactToMsg) {
				reactToMsg = !reactToMsg;
			}

			if (response instanceof Emoji) {
				if (response.name === "✅" && typeof memberToGenerateProfileFor !== "undefined") {
					return memberToGenerateProfileFor;
				}

				if (response.name === "❌") {
					return "CANCEL_CMD";
				}

				if (response.name === "⬅️") {
					return "GO_BACK_CMD";
				}
			}
			else {
				if (response === "TIME_CMD" || response === "CANCEL_CMD") {
					return "CANCEL_CMD";
				}

				const resolvedMember: GuildMember | null = await UserHandler
					.resolveMemberWithStr(response, guild, guildData);

				if (resolvedMember !== null) {
					memberToGenerateProfileFor = resolvedMember;
				}
			}
		}
	}
}