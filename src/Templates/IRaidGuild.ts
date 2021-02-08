import { IRaidInfo } from "../Definitions/IRaidInfo";
import { IBlacklistedUser, ISubBlacklistedUser } from "../Definitions/IBlacklistedUser";
import { IModmailThread } from "../Definitions/IModmailThread";
import { ISection } from "./ISection";
import { IMutedData, ISuspendedData } from "../Definitions/IPunishmentObject";
import { IManualVerification } from "../Definitions/IManualVerification";
import { IQuotaDbInfo } from "../Definitions/IQuotaDbInfo";
import { IApplication } from "../Definitions/IApplication";
import { IVerification } from "./IVerification";

/**
 * Everything here (excluding "sections") represents ESSENTIALS needed for the core bot functions to work properly.
 */
export interface IRaidGuild {
	/**
	 * The guild ID.
	 */
	guildID: string;

	/**
	 * Verification management.
	 */
	verification: IVerification;

	/**
	 * The roles Zero will use.
	 */
	roles: {
		/**
		 * The team role. This role is given to people who has a general staff role. 
		 */
		teamRole: string;

		/**
		 * The moderator role. This role is the most powerful role.
		 * 
		 * Names for this role may include, but are not limited to: Moderator, Mod. 
		 */
		moderator: string;

		/**
		 * The head raid leader role. Head raid leaders are usually in charge of raid leader affairs. 
		 * 
		 * Names for this role may include, but are not limited to: Head Raid Leader.
		 */
		headRaidLeader: string;

		/**
		 * More perms, really. From owner: Members of the helper team who have proven themselves 
		 * to be efficient and active at moderating may be promoted to officer. Officers accomplish 
		 * a similar role to helper however they have more tools at their disposal to accomplish 
		 * their tasks. Officers are expected to be experienced and willing to help new members 
		 * of the moderation team.
		 */
		officer: string;

		/**
		 * The raid leader role. Raid leaders are in charge of leading runs on a continuous basis.
		 * 
		 * Names for this role may include, but are not limited to: Raid Leader. 
		 */
		universalRaidLeader: string;

		/**
		 * The almost raid leader role. 
		 * 
		 * Names for this role may include, but are not limited to: Trial Raid Leader.
		 */
		universalAlmostRaidLeader: string;

		/**
		 * The support role. Support is in charge of server management (think, a "lesser" version of moderators). 
		 * 
		 * Names for this role may include, but are not limited to: Security/Verifier (combined), Security, Helper.
		 */
		support: string;

		/**
		 * The verifier role. Verifiers will have access to the find and manualverify command.
		 */
		verifier: string;

		/**
		 * The pardoned raid leader role. Pardoned raid leaders are on break from leading.
		 * 
		 * Names for this role may include, but are not limited to: Pardoned Raid Leader, Leader on Leave.
		 */
		pardonedRaidLeader: string;

		/**
		 * The member role. Members are able to join raids. 
		 * 
		 * Names for this role may include, but are not limited to: Raider, Member, Verified Raider, Verified Member.
		 */
		raider: string;

		/**
		 * The suspended role. Suspended users are members of a server but cannot partake in raids.
		 * 
		 * Names for this role may include, but are not limited to: Suspended, Suspended but Verified.
		 */
		suspended: string;

		/**
		 * People with these roles will be able to talk during raids. Do note that Support/TRL/RL/HRL/Moderator will already be able to talk in raids. 
		 */
		talkingRoles: string[];

		/**
		 * People with these roles will be able to get location early.
		 */
		earlyLocationRoles: string[];

		/**
		 * Optional roles, not necessarily needed.
		 */
		optRoles: {
			/**
			 * Muted role. Will automatically be defined if not defined initially.
			 */
			mutedRole: string;

			/**
			 * The first key tier.
			 */
			keyTier1: {
				role: string;
				min: number;
			}

			/**
			 * The second key tier.
			 */
			keyTier2: {
				role: string;
				min: number;
			}

			/**
			 * The third key tier. 
			 */
			keyTier3: {
				role: string;
				min: number;
			}
		};

		/**
		 * Section leader roles.
		 */
		mainSectionLeaderRole: {
			sectionLeaderRole: string;
			sectionAlmostLeaderRole: string; 
			sectionTrialLeaderRole: string;
			sectionHeadLeaderRole: string; 
		}
	};

	/**
	 * The channels that the bot will use for various purposes. These represent channels that are MANDATORY for the BOT TO WORK PROPERLY. 
	 */
	generalChannels: {
		/**
		 * Channels for logging purposes.
		 */
		logging: {
			/**
			 * The moderation logging channel, where the bot will log mutes and blacklists.
			 */
			moderationLogs: string;

			/**
			 * Suspension command, where the bot will log all suspensions and unsuspensions.
			 */
			suspensionLogs: string;

			/**
			 * Verification attempts channel.
			 */
			verificationAttemptsChannel: string;

			/**
			 * Verification success channel.
			 */
			verificationSuccessChannel: string;

			/**
			 * Join leave channel.
			 */
			joinLeaveChannel: string;

			/**
			 * Updates channel for the bot.
			 */
			botUpdatesChannel: string;

			/**
			 * For logging reactions.
			 */
			reactionLoggingChannel: string;
		};

		/**
		 * Moderation mail category.
		 */
		modMailChannel: string;

		/**
		 * Modmail storage channel.
		 */
		modMailStorage: string; 

		/**
		 * The general AFK check channel, where raid checks will be posted.
		 */
		generalRaidAfkCheckChannel: string;

		/**
		 * The verification channel, where people will be able to verify. 
		 */
		verificationChan: string;

		/**
		 * The control panel channel.
		 */
		controlPanelChannel: string;

		/**
		 * Manual verification channel.
		 */
		manualVerification: string;

		/**
		 * Raid requests
		 */
		raidRequestChannel: string;

		/**
		 * Any messages from Network Admins will be sent to this channel.
		 */
		networkAnnouncementsChannel: string;

		/**
		 * Quota channel.
		 */
		quotaChannel: string;
	},

	/**
	 * General information relating to the server.
	 */
	properties: {
		/**
		 * Whether to use the priority queue system or not. 
		 */
		priorityQueue: boolean;

		/**
		 * Quota details.
		 */
		quotas: {
			quotaDetails: IQuotaDbInfo[];
			quotaMessage: string;
			lastReset: number;
		};
		
		/**
		 * The message that users will receive after they are verified.
		 */
		successfulVerificationMessage: string;

		/**
		 * Shows verification requirements.
		 */
		showVerificationRequirements: boolean;

		/**
		 * An array of current modmail threads. 
		 */
		modMail: IModmailThread[];

		/**
		 * The dungeons to allow. 
		 */
		dungeons: number[];

		/**
		 * All ongoing manual verification.
		 */
		manualVerificationEntries: IManualVerification[];

		/**
		 * Application for section.
		 */
		application: IApplication[];

		/**
		 * Blocked commands
		 */
		blockedCommands: string[];

		/**
		 * Remove early location + key reactions from AFK checks.
		 */
		removeEarlyLocKeyReacts: boolean; 
	};

	/**
	 * Active raids.
	 */
	activeRaidsAndHeadcounts: {
		/**
		 * An array of active raids.
		 */
		raidChannels: IRaidInfo[];
	};

	/**
	 * The prefix users can use to invoke bot commands.
	 */
	prefix: string;

	/**
	 * These are mini-sections of a server, where AFK checks and verification will be separate from the main process. Some "sections" could be, for example, "Veteran Raids," "Event Raids," etc.
	 */
	sections: ISection[];

	/**
	 * The moderation stuff.
	 */
	moderation: {
		blacklistedApplicants: ISubBlacklistedUser[]; 
		/**
		 * Amount of suspensions that has occurred in the server.
		 */
		amtSuspensions: number;

		/**
		 * An array of blacklisted users.
		 */
		blacklistedUsers: IBlacklistedUser[];

		/**
		 * IDs of accounts that will not be able to use modmail.
		 */
		blacklistedModMailUsers: ISubBlacklistedUser[];

		/**
		 * People that are muted.
		 */
		mutedUsers: IMutedData[];

		/**
		 * People that are suspended.
		 */
		suspended: ISuspendedData[];
	}
}

