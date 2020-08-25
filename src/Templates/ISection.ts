import { IVerification } from "../Definitions/IVerification";
import { IManualVerification } from "../Definitions/IManualVerification";

/**
 * The name of the section will be the name of the category that the channels are under.
 */
export interface ISection {
	/**
	 * Name of section.
	 */
	nameOfSection: string;

	/**
	 * Whether the section is a main one or not.
	 */
	isMain: boolean;

	/**
	 * The role needed for access to this section.
	 * Also the way to search for this section.
	 */
	verifiedRole: string;

	/**
	 * Other roles
	 */
	roles: {
		/**
		 * Head leader role.
		 */
		headLeaderRole: string; 
		
		/**
		 * Raid leader role.
		 */
		raidLeaderRole: string;

		/**
		 * Almost leader role.
		 */
		almostLeaderRole: string;

		/**
		 * Trial leader role.
		 */
		trialLeaderRole: string;
	}

	/**
	 * Channels for the group.
	 */
	channels: {
		/**
		 * The Afk check channel.
		 */
		afkCheckChannel: string;

		/**
		 * The verification channel. May not be needed.
		 */
		verificationChannel: string;

		/**
		 * The control panel for Afk checks & headcounts.
		 */
		controlPanelChannel: string;

		/**
		 * Manual verification channel for the section.
		 */
		manualVerification: string;

		/**
		 * Logging channels.
		 */
		logging: {
			/**
			 * Verification attempts channel.
			 */
			verificationAttemptsChannel: string;

			/**
			 * Verification success channel.
			 */
			verificationSuccessChannel: string;

			/**
			 * Reaction logging channel. Reactions such as key reactions will be logged in this channel.
			 */
			reactionLoggingChannel: string;
		}
	}

	/**
	 * Verification requirements for this group. 
	 */
	verification: IVerification;

	/**
	 * Specific properties for this group.
	 */
	properties: {
		/**
		 * The dungeons to allow or exclude.
		 */
		dungeons: number[];

		/**
		 * All ongoing manual verification.
		 */
		manualVerificationEntries: IManualVerification[];

		/**
		 * Shows verification requirements.
		 */
		showVerificationRequirements: boolean;
	}
}