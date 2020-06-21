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
import { InsertOneWriteOpResult, WithId } from "mongodb";

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
			true
		);
	}

	public async executeCommand(
		msg: Message,
		args: string[],
		guildDb: IRaidGuild
	): Promise<void> {
		const introEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("**Administrator: Profile Manager**")
			.setDescription("Use this command to make changes, such as creating a new profile, editing someone's profile, and more.\n\n⚠️ You are accessing an owner-only command as this command has the potential to harm the integrity of the user profile check. As such, usage of this command may be monitored. Any form of abuse will result in consequences.")
			.addField("Force-Sync Members/DB", "React with 🔄 to force-sync the database with all current __verified__ (Suspended & Verified) members. The bot will give anyone that doesn't have an entry in the database but is verified in the server a new entry in the database. Note that the bot will first show you the changes that will be made and then ask you to confirm those changes.")
			.addField("Add Profile to Database", "React with 🔼 to add a profile to the database. You will be asked to mention a person. Then, you will be asked to provide an in-game name.")
			.addField("Remove Profile from Database", "React with 🔽 to remove a profile from the database. The profile will be completely wiped from the database. Bear in mind that the person will NOT be unverified but will not be able to access numerous commands.")
			.addField("Edit User Profile", "React with 📩 to edit a user's profile. This will allow you to add, remove, or edit a person's main IGN and/or alternative IGN(s) and make changes to the current Discord ID that is logged.")
			.addField("Exit Process", "React with ❌ to exit the process. The menu will be closed and will not be accessible unless the command is used again.")
			.setColor("RED")
			.setFooter("Administrator: Profile Updater");
		const botMsg: Message = await msg.channel.send(introEmbed);
		const reactions: EmojiResolvable[] = ["🔄", "🔼", "🔽", "📩", "❌"];
		const selectedReaction: GuildEmoji | ReactionEmoji | "TIME" = await new FastReactionMenuManager(
			botMsg,
			msg.author,
			reactions,
			5,
			TimeUnit.MINUTE
		).react();

		if (selectedReaction === "TIME") {
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
			// TODO
			return;
		}
		else if (selectedReaction.name === "🔽") {
			// TODO
			return;
		}
		else if (selectedReaction.name === "📩") {
			// TODO
			return;
		}
	}

	private async forceSyncCmd(msg: Message, botMsg: Message, guildData: IRaidGuild): Promise<void> {
		const guild: Guild = msg.guild as Guild;
		const verifiedRole: Role | undefined = guild.roles.cache.get(guildData.roles.raider);
		const suspendedRole: Role | undefined = guild.roles.cache.get(guildData.roles.suspended);

		if (typeof verifiedRole === "undefined") {
			const editedMsg: Message = await botMsg.edit(this.getNoVerifiedRoleEmbed(msg));
			await editedMsg.delete({ timeout: 5000 });
			return;
		}

		const rolesToHave: string[] = [verifiedRole.id];
		if (typeof suspendedRole !== "undefined") {
			rolesToHave.push(suspendedRole.id);
		}

		// check which members do not have a db entry 
		const allUsersInDb: IRaidUser[] = await MongoDbHelper.MongoDbUserManager.MongoUserClient.find({}).toArray();
		const allMembers: Collection<string, GuildMember> = (await guild.members.fetch())
			.filter(member => rolesToHave.some(role => member.roles.cache.has(role)));
		const membersWithNoDbEntry: [GuildMember, string[]][] = [];

		for (const [id, member] of allMembers) {
			const indexInDbArr: number = allUsersInDb.findIndex(x => x.discordUserId === id);
			if (indexInDbArr === -1) {
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

			// TODO use the format here for other list-based embeds
			let str: string = "";
			let altAdded: boolean = false;
			for (let i = 0; i < membersWithNoDbEntry.length; i++) {
				const tempStr: string = `**\`[${i + 1}]\`** ${membersWithNoDbEntry[i][0]}\n⇒ IGN(s): ${membersWithNoDbEntry[i][1].join(", ")}\n\n`
				if (str.length + tempStr.length > 1020) {
					memberToGiveProfileEmbed.addField("No Profile", tempStr);
					str = tempStr;
					altAdded = true;
				}
				else {
					altAdded = false;
					str += tempStr;
				}
			}

			if (!altAdded) {
				memberToGiveProfileEmbed.addField("No Profile", str);
			}

			await botMsg.edit(memberToGiveProfileEmbed).catch(e => { });

			const response: number | Emoji | "CANCEL" | "TIME" = await new GenericMessageCollector<number>(
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
				if (response === "CANCEL" || response === "TIME") {
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

		// now create entries
		let amtAdded: number = 0;
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

			try {
				await MongoDbHelper.MongoDbUserManager.MongoUserClient.insertOne({
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
				amtAdded++;
			}
			catch (e) { }
		}

		const finalEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setColor("GREEN")
			.setTitle("Sync Completed")
			.setDescription(`${amtAdded}/${membersWithNoDbEntry.length} accounts were successfully synced.`)
			.setFooter("Process Completed.")
			.setTimestamp();
		await botMsg.edit(finalEmbed);
		await botMsg.delete({ timeout: 5000 }).catch(e => { });
	}

	private async addProfileCmd(msg: Message, botMsg: Message, guildData: IRaidGuild): Promise<void> {

	}

	private getNoVerifiedRoleEmbed(msg: Message): MessageEmbed {
		return new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("No Verified Role")
			.setDescription("Your server does not have a Member role. As such, this command cannot be used.")
			.setFooter("Process Canceled")
			.setColor("RED");
	}
}