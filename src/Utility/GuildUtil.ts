import { GuildMember, RoleResolvable, Role, Guild } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { ISection } from "../Definitions/ISection";

export namespace GuildUtil { 
    /**
     * Checks to see if a member can get the "staff" role. The "staff" role is a role that all staff members will have.
     * @param {GuildMember} member The member.  
     * @param {IRaidGuild} guildData The guild data.
     * @returns {Promise<boolean>} Whether any changes were made. 
     */
    export async function manageStaffRole(member: GuildMember, guildData: IRaidGuild): Promise<boolean> { 
        if (!member.guild.roles.cache.has(guildData.roles.teamRole)) {
            return false; 
        }

        let staffRoles: string[] = [
            guildData.roles.moderator,
            guildData.roles.headRaidLeader,
			guildData.roles.raidLeader,
			guildData.roles.trialRaidLeader,
            guildData.roles.support,
			guildData.roles.trialRaidLeader,
			guildData.roles.officer
        ];

        for await (let role of staffRoles) {
            if (member.roles.cache.has(role)) {
                // they have the role, add and return 
                // ? operator used here because "role" has to be defined
                // or else it wouldn't run here. 
                await member.roles.add(guildData.roles.teamRole, `Has ${(member.roles.cache.get(role) as Role).name} role.`).catch(e => { });
                return true;
            }
        }

        await member.roles.remove(guildData.roles.teamRole, "No longer a staff member").catch(e => { });
        return true;
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