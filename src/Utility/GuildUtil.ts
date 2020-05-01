import { GuildMember, RoleResolvable, Role, Guild } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { ISection } from "../Definitions/ISection";

export namespace GuildUtil { 
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
			}
		}
	}
}