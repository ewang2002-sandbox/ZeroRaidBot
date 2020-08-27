import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildMember, Guild, MessageEmbed, Role, TextChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { UserHandler } from "../../Helpers/UserHandler";

export class SuspendCommand extends Command {
	public static currentTimeout: { timeout: NodeJS.Timeout, id: string }[] = [];

	public constructor() {
		super(
			new CommandDetail(
				"Suspend",
				"suspend",
				[],
				"Suspends a user for a specified duration or for an indefinite period of time. This will prevent them from joining raids.",
				["suspend <@Mention | ID | IGN> <X = Time; Xs | Xm | Xh | Xd | perma> <Reason: STRING>"],
				["suspension @Test#1234 30m Read the rules.", "suspend 23131231233123 7d Crashing + intentionally trying to ruin the raid", "suspend Test perma Only here to troll."],
				1
			),
			new CommandPermission(
				["KICK_MEMBERS"],
				["MANAGE_ROLES", "EMBED_LINKS"],
				["universalRaidLeader", "headRaidLeader", "officer", "moderator", "support"],
				["SECTION_RL", "SECTION_HRL"],
				false
			),
			true,
			false,
			false,
			5
		);
	}

	public async executeCommand(
		msg: Message,
		args: string[],
		guildDb: IRaidGuild
	): Promise<void> {
		const guild: Guild = msg.guild as Guild;

		let memberToSuspend: GuildMember | null = await UserHandler.resolveMember(msg, guildDb);

		if (memberToSuspend === null) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_MEMBER_FOUND", null), msg.channel);
			return;
		}

		if (memberToSuspend.id === msg.author.id) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "SAME_PERSON_AS_AUTHOR", null), msg.channel);
			return;
		}

		if (msg.author.id !== guild.ownerID
			&& (msg.member as GuildMember).roles.highest.comparePositionTo(memberToSuspend.roles.highest) <= 0) {
			MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("Role Hierarchy Error").setDescription("The person you are trying to suspend is equal to or has higher role permissions than you."), msg.channel);
			return;
		}

		args.shift();
		// get other arguments
		const timeArgument: string = (args.shift() as string).toLowerCase();
		const reason: string = args.join(" ");

		let time: [number, string] = timeArgument.toLowerCase() === "perma"
			? [-1, "Indefinite"]
			: this.getMillisecondTime(timeArgument);

		if (time[0] > 2147483647) {
			MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("Suspension Duration Too Long!").setDescription("The maximum duration you can use is 24.8 days."), msg.channel);
			return;
		}

		SuspendCommand.suspendUser(msg, guildDb, memberToSuspend, msg.member as GuildMember, reason, time);
	}

    /**
     * Suspends the user.
     * @param {Message} msg The guild. 
     * @param {IRaidGuild} guildDb The guild document.
     * @param {GuildMember} memberToSuspend The member that got a suspension.
     * @param {GuildMember} moderator The moderator.
     * @param {string} reason The reason. 
     * @param {[number, string]} suspensionTime The amount of time to suspend the user. 
     */
	private static async suspendUser(
		msg: Message,
		guildDb: IRaidGuild,
		memberToSuspend: GuildMember,
		moderator: GuildMember,
		reason: string,
		suspensionTime: [number, string]
	): Promise<void> {
		const guild: Guild = msg.guild as Guild;
		const suspendedRole: Role | void = guild.roles.cache.get(guildDb.roles.suspended);
		const memberRole: Role | void = guild.roles.cache.get(guildDb.roles.raider);
		if (typeof memberRole === "undefined") {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("No Member Role Set").setDescription("There is no member role configured for this server. Contact your server administrator for assistance."), msg.channel);
			return;
		}

		if (!memberToSuspend.roles.cache.has(memberRole.id)) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("Member Not Verified").setDescription("The member you are trying to suspend is not verified. The member may already be suspended."), msg.channel);
			return;
		}

		if (typeof suspendedRole === "undefined") {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("No Suspension Role Set").setDescription("There is no suspension role configured for this server. Contact your server administrator for assistance."), msg.channel);
			return;
		}

		const suspensionChannel: TextChannel | undefined = guild.channels.cache.get(guildDb.generalChannels.logging.suspensionLogs) as TextChannel | undefined;

		const oldRoles: Role[] = memberToSuspend.roles.cache.array();

		try {
			if (msg.author.id !== guild.ownerID
				&& guild.me !== null
				// TODO make sure this is the correct use of method
				&& guild.me.roles.highest.comparePositionTo(memberToSuspend.roles.highest) <= 0) {
				// bot is lower than the person to suspend
				for (const role of memberToSuspend.roles.cache) {
					await memberToSuspend.roles.remove(role).catch(() => { });
				}
			}
			else {
				await memberToSuspend.roles.set([]);
			}
			await memberToSuspend.roles.add(suspendedRole);
		}
		catch (e) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("Discord API Error").setDescription(e), msg.channel);
			return;
		}
		await MessageUtil.send({ content: `${memberToSuspend} has been suspended successfully.` }, msg.channel).catch(() => { });
		
		// send to member 
		await memberToSuspend.send(`**\`[${guild.name}]\`** You have been suspended from \`${guild.name}\`.\n\t⇒ Reason: ${reason}\n\tDuration: ${suspensionTime[1]}`).catch(() => { });

		const embed: MessageEmbed = new MessageEmbed()
			.setAuthor(memberToSuspend.user.tag, memberToSuspend.user.displayAvatarURL())
			.setTitle("🚩 Member Suspended")
			.setDescription(`⇒ Suspended Member: ${memberToSuspend} (${memberToSuspend.displayName})\n⇒ Moderator: ${moderator} (${moderator.displayName})\n⇒ Reason: ${reason}\n⇒ Duration: ${suspensionTime[1]}`)
			.setColor("RED")
			.setTimestamp()
			.setFooter("Suspension Command Executed At");
		if (typeof suspensionChannel !== "undefined") {
			await suspensionChannel.send(embed).catch(() => { });
		}

		await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
			$push: {
				"moderation.suspended": {
					userId: memberToSuspend.id,
					modId: moderator.id,
					reason: reason,
					duration: suspensionTime[0],
					endsAt: suspensionTime[0] === -1 ? -1 : (new Date().getTime() + suspensionTime[0]),
					roles: oldRoles.map(x => x.id)
				}
			}
		});

		if (suspensionTime[0] !== -1) {
			SuspendCommand.timeSuspend(guild, memberToSuspend, suspensionTime[0], oldRoles.map(x => x.id), suspensionChannel);
		}
	}

    /**
     * Sets a timeout that will automatically remove the Suspended role. The guild must already have a role called "Suspended" defined.
     * @param {Guild} guild The guild. 
     * @param {GuildMember} memberToSuspend The member to suspend. 
     * @param {number} timeTosuspend The duration to suspend the user for. 
	 * @param {TextChannel} [suspensionChannel] The suspension channel.
     */
	public static async timeSuspend(
		guild: Guild,
		memberToSuspend: GuildMember,
		timeTosuspend: number,
		oldRoles: string[],
		suspensionChannel?: TextChannel
	): Promise<void> {
		const db: IRaidGuild = await new MongoDbHelper.MongoDbGuildManager(guild.id).findOrCreateGuildDb();
		const suspendedRole: Role | void = guild.roles.cache.find(x => x.id === db.roles.suspended);
		if (typeof suspendedRole === "undefined") {
			return;
		}

		const to: NodeJS.Timeout = setTimeout(async () => {
			if (memberToSuspend.roles.cache.has(suspendedRole.id)) {
				await memberToSuspend.roles.remove(suspendedRole).catch(() => { });
				await memberToSuspend.roles.set(oldRoles).catch(() => { });

				const embed: MessageEmbed = new MessageEmbed()
					.setAuthor(memberToSuspend.user.tag, memberToSuspend.user.displayAvatarURL())
					.setTitle("🏁 Member Unsuspended")
					.setDescription(`⇒ Unsuspended Member: ${memberToSuspend} (${memberToSuspend.displayName})\n⇒ Moderator: Automatic\n⇒ Reason: The member has served his or her time fully.`)
					.setColor("GREEN")
					.setTimestamp()
					.setFooter("Unsuspended At");
				if (typeof suspensionChannel !== "undefined") {
					await suspensionChannel.send(embed).catch(() => { });
				}

				await memberToSuspend.send(`**\`[${guild.name}]\`** You have been unsuspended from \`${guild.name}\` for serving your suspension time. Thank you for your cooperation and please make sure you read the rules again.`).catch(() => { });
			}

			await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
				$pull: {
					"moderation.suspended": {
						userId: memberToSuspend.id,
					}
				}
			});
		}, timeTosuspend);
		SuspendCommand.currentTimeout.push({ timeout: to, id: memberToSuspend.id });
	}

    /**
     * Converts the string input (e.g. 6h, 12m, 32s) into milliseconds.
     * @param {string} rawTime The raw input.
     * @returns {number} The time, in ms; -1 if unable to convert. 
     */
	private getMillisecondTime(rawTime: string): [number, string] {
		rawTime = rawTime.toLowerCase();
		let timeType: string = rawTime.substring(rawTime.length - 1, rawTime.length);
		let correspTime: string = rawTime.substring(0, rawTime.length - 1);
		const parsedNum: number = Number.parseInt(correspTime);
		if (Number.isNaN(parsedNum)) {
			return [-1, "Indefinite."];
		}
		switch (timeType) {
			case ("s"): {
				return [parsedNum * 1000, `${parsedNum} Seconds.`];
			}
			case ("m"): {
				return [parsedNum * 60000, `${parsedNum} Minutes.`];
			}
			case ("h"): {
				return [parsedNum * 3.6e+6, `${parsedNum} Hours.`];
			}
			case ("d"): {
				return [parsedNum * 8.64e+7, `${parsedNum} Days.`];
			}
			default: {
				return [-1, "Indefinite."];
			}
		}
	}
}