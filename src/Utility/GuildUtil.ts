import { IRaidGuild } from "../Templates/IRaidGuild";
import { ISection } from "../Templates/ISection";
import { GuildMember, Message, DMChannel, Guild, MessageEmbed, Role } from "discord.js";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { StringUtil } from "./StringUtil";
import { GenericMessageCollector } from "../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../Definitions/TimeUnit";
import { ArrayUtil } from "./ArrayUtil";

export namespace GuildUtil {
	export type RaidLeaderRole = null | "TRL" | "ARL" | "RL" | "HRL";
	export type RaidLeaderStatus = {
		isUniversal: boolean; // this will override any other setting
		sectionVerifiedRole: string;
		highestLeaderRole: string;
		roleType: RaidLeaderRole;
	};

	/**
	 * Gets basic details about a leader. Only use this function to determine whether a RL can start AFK checks, needs approval, etc. 
	 * @param {GuildMember} member The member. THE MEMBER MUST HAVE A LEADER ROLE OF SOME SORT FIRST!
	 * @param {IRaidGuild} guildData The guild doc
	 * @param {ISection} section The section where the command was executed
	 * @returns {boolean} True if the leader can start AFK check without approval.
	 */
	export function getRaidLeaderStatus(
		member: GuildMember,
		guildData: IRaidGuild,
		section: ISection
	): RaidLeaderStatus {
		const allowedRoles: string[] = [
			guildData.roles.headRaidLeader,
			guildData.roles.universalRaidLeader,
			guildData.roles.universalAlmostRaidLeader
		];

		if (allowedRoles.some(x => member.roles.cache.has(x)) || member.hasPermission("ADMINISTRATOR")) {
			return {
				isUniversal: true,
				sectionVerifiedRole: "",
				highestLeaderRole: "",
				roleType: null
			};
		}

		const returnVal: RaidLeaderStatus = {
			isUniversal: false,
			sectionVerifiedRole: section.verifiedRole,
			highestLeaderRole: "",
			roleType: null
		};

		if (member.roles.cache.has(section.roles.headLeaderRole)) {
			returnVal.highestLeaderRole = section.roles.headLeaderRole;
			returnVal.roleType = "HRL";
		}
		else if (member.roles.cache.has(section.roles.raidLeaderRole)) {
			returnVal.highestLeaderRole = section.roles.raidLeaderRole;
			returnVal.roleType = "RL";
		}
		else if (member.roles.cache.has(section.roles.almostLeaderRole)) {
			returnVal.highestLeaderRole = section.roles.almostLeaderRole;
			returnVal.roleType = "ARL";
		}
		else if (member.roles.cache.has(section.roles.trialLeaderRole)) {
			returnVal.highestLeaderRole = section.roles.trialLeaderRole;
			returnVal.roleType = "TRL";
		}
		return returnVal;
	}

	/**
	 * Gets the highest RL role type, if any.
	 * @param {GuildMember} member The member
	 * @param {IRaidGuild} guildData The guild doc
	 * @param {ISection} section The section where the command was executed
	 */
	export function getHighestRaidLeaderRole(
		member: GuildMember,
		guildData: IRaidGuild,
		section: ISection
	): RaidLeaderRole {
		if (member.roles.cache.has(guildData.roles.headRaidLeader)) {
			return "HRL";
		}
		else if (member.roles.cache.has(guildData.roles.universalRaidLeader)) {
			return "RL";
		}
		else if (member.roles.cache.has(guildData.roles.universalAlmostRaidLeader)) {
			return "ARL";
		}

		// check section
		if (member.roles.cache.has(section.roles.headLeaderRole)) {
			return "HRL";
		}
		if (member.roles.cache.has(section.roles.raidLeaderRole)) {
			return "RL";
		}
		else if (member.roles.cache.has(section.roles.almostLeaderRole)) {
			return "ARL";
		}
		else if (member.roles.cache.has(section.roles.trialLeaderRole)) {
			return "TRL";
		}

		return null;
	}

    /**
	 * Returns the default server section.
	 * @param {IRaidGuild} guildData The guild data.
	 * @returns {ISection} The default section. 
	 */
	export function getDefaultSection(guildData: IRaidGuild): ISection {
		return {
			nameOfSection: "Main",
			isMain: true,
			verifiedRole: guildData.roles.raider,
			roles: {
				trialLeaderRole: guildData.roles.mainSectionLeaderRole.sectionTrialLeaderRole,
				almostLeaderRole: guildData.roles.mainSectionLeaderRole.sectionAlmostLeaderRole,
				raidLeaderRole: guildData.roles.mainSectionLeaderRole.sectionLeaderRole,
				headLeaderRole: guildData.roles.mainSectionLeaderRole.sectionHeadLeaderRole
			},
			channels: {
				verificationChannel: guildData.generalChannels.verificationChan,
				afkCheckChannel: guildData.generalChannels.generalRaidAfkCheckChannel,
				controlPanelChannel: guildData.generalChannels.controlPanelChannel,
				manualVerification: guildData.generalChannels.manualVerification,
				logging: {
					verificationAttemptsChannel: guildData.generalChannels.logging.verificationAttemptsChannel,
					verificationSuccessChannel: guildData.generalChannels.logging.verificationSuccessChannel,
					reactionLoggingChannel: guildData.generalChannels.logging.reactionLoggingChannel
				}
			},
			verification: {
				stars: {
					required: guildData.verification.stars.required,
					minimum: guildData.verification.stars.minimum
				},
				aliveFame: {
					required: guildData.verification.aliveFame.required,
					minimum: guildData.verification.aliveFame.minimum
				},
				maxedStats: {
					required: guildData.verification.maxedStats.required,
					statsReq: guildData.verification.maxedStats.statsReq
				}
			},
			properties: {
				dungeons: guildData.properties.dungeons,
				manualVerificationEntries: guildData.properties.manualVerificationEntries,
				showVerificationRequirements: guildData.properties.showVerificationRequirements
			}
		}
	}

	/**
	 * Returns all raid leader roles from a SPECIFIC section.
	 * 
	 * INDEX of `getSectionRaidLeaderRoles(ISection);`
	 * - 0 => TRL
	 * - 1 => ARL
	 * - 2 => RL
	 * 
	 * @param section The section.
	 */
	export function getSectionRaidLeaderRoles(section: ISection): string[] {
		return [section.roles.trialLeaderRole, section.roles.almostLeaderRole, section.roles.raidLeaderRole, section.roles.headLeaderRole];
	}

	/**
     * Gets a guild.
     * @param msg The message object.
     */
	export async function getGuild(msg: Message, dmChannel: DMChannel): Promise<Guild | null | "CANCEL_CMD"> {
		const allGuilds: IRaidGuild[] = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.find({}).toArray();
		const embed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setDescription("Please select the server that you want to configure your server profile for.")
			.setColor("RANDOM")
			.setFooter("Server Profile Management");

		let str: string = "";
		let index: number = 0;
		const validGuilds: Guild[] = [];
		for (const guildEntry of allGuilds) {
			for (const [id, guild] of msg.client.guilds.cache) {
				if (guild.id !== guildEntry.guildID) {
					continue; // guild associated with db not right
				}

				if (!guild.roles.cache.has(guildEntry.roles.raider)
					|| !guild.members.cache.has(msg.author.id)) {
					break; // found guild but no verified role OR not a member of the server
				}

				const resolvedMember: GuildMember = guild.member(msg.author) as GuildMember;

				if (!resolvedMember.roles.cache.has(guildEntry.roles.raider)) {
					break; // not verified
				}

				validGuilds.push(guild);
				const tempStr: string = `[${++index}] ${guild.name}`;
				if (str.length + tempStr.length > 1000) {
					embed.addField("Guild Selection", StringUtil.applyCodeBlocks(str));
					str = tempStr;
				}
				else {
					str += tempStr;
				}
			}
		} // end major loop

		if (validGuilds.length === 0) {
			return null;
		}

		if (str.length !== 0) {
			embed.addField("Guild Selection", StringUtil.applyCodeBlocks(str));
		}

		const num: number | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<number>(
			msg.author,
			{ embed: embed },
			2,
			TimeUnit.MINUTE,
			dmChannel
		).send(GenericMessageCollector.getNumber(dmChannel, 1, validGuilds.length));

		if (num === "CANCEL_CMD" || num === "TIME_CMD") {
			return "CANCEL_CMD";
		}

		return validGuilds[num - 1];
	}

	/**
	 * Gets the total number of leaders in the server.
	 * @param guild The guild object.
	 * @param guildDb The guild db.
	 */
	export function getAllLeaders(guild: Guild, guildDb: IRaidGuild): GuildMember[] {
		// get leader count
		const universalARL: Role | undefined = guild.roles.cache.get(guildDb.roles.universalAlmostRaidLeader);
		const universalRL: Role | undefined = guild.roles.cache.get(guildDb.roles.universalRaidLeader);
		const hrl: Role | undefined = guild.roles.cache.get(guildDb.roles.headRaidLeader);
		let allLeaders: GuildMember[] = [];

		if (typeof universalARL !== "undefined") {
			allLeaders.push(...universalARL.members.array());
		}

		if (typeof universalRL !== "undefined") {
			allLeaders.push(...universalRL.members.array());
		}

		if (typeof hrl !== "undefined") {
			allLeaders.push(...hrl.members.array());
		}

		for (const section of [GuildUtil.getDefaultSection(guildDb), ...guildDb.sections]) {
			const leaderRoles: (Role | undefined)[] = [
				guild.roles.cache.get(section.roles.headLeaderRole),
				guild.roles.cache.get(section.roles.almostLeaderRole),
				guild.roles.cache.get(section.roles.raidLeaderRole),
				guild.roles.cache.get(section.roles.trialLeaderRole)
			];

			for (const leaderRole of leaderRoles) {
				if (typeof leaderRole === "undefined") {
					continue;
				}

				const membersOfRole: GuildMember[] = leaderRole.members.array();
				for (const member of membersOfRole) {
					const index: number = allLeaders.findIndex(x => x.id === member.id);
					if (index === -1) {
						allLeaders.push(member);
					}
				}
			}
		}

		// remove any extra duplicates
		allLeaders = ArrayUtil.removeDuplicate<GuildMember>(allLeaders);

		// Make sure this doesn't return a duplicate
		return allLeaders;
	}
}