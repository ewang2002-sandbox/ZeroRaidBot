import { IRaidGuild } from "../Templates/IRaidGuild";
import { ISection } from "../Templates/ISection";
import { GuildMember } from "discord.js";

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

		if (member.roles.cache.has(section.roles.raidLeaderRole)) {
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
				raidLeaderRole: guildData.roles.mainSectionLeaderRole.sectionLeaderRole
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
		return [section.roles.trialLeaderRole, section.roles.almostLeaderRole, section.roles.raidLeaderRole];
	}
}