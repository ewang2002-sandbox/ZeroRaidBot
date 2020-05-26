import { Collection, VoiceChannel, Message, EmojiResolvable, GuildMember } from "discord.js";
import { Command } from "../Templates/Command/Command";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { ISection } from "../Templates/ISection";
import { GuildUtil } from "./GuildUtil";
import { RoleNames } from "../Definitions/Types";

export module OtherUtil {
    /**
     * Gets all the voice channels numbers, sorted. 
     * @param {Collection<string, VoiceChannel>} vcs The voice channels. 
     * @returns {number[]} An array containing all the VC numbers. 
     */
    export function getAllVoiceChannelNumbers(vcs: Collection<string, VoiceChannel>): number[] {
        const nums: number[] = [];
        for (const [, vc] of vcs) {
            // last split arg
            const vcNum: number = Number.parseInt(vc.name.split(" ")[vc.name.split(" ").length - 1]);
            if (Number.isNaN(vcNum)) {
                continue;
            }
            nums.push(vcNum);
        }
        return nums.sort();
    }

    /**
	 * Reacts to a message fast.
	 * @param msg The message to react to.
	 * @param reactions The set of reactions to use.
	 */
    export function reactFaster(msg: Message, reactions: EmojiResolvable[]): void {
        let i: number = 0;
        const interval: NodeJS.Timeout = setInterval(() => {
            // think of this as a for loop
            // for (let i = 0; i < reactions.length; i++)
            if (i < reactions.length) {
                msg.react(reactions[i]).catch(e => { });
            }
            else {
                clearInterval(interval);
            }
            i++;
        }, 500);
    }

    /**
     * Waits a certain amount of time before resolving the promise.
     * @param {number} ms The time to wait, in milliseconds. 
     */
    export async function waitFor(ms: number): Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, ms);
        });
    }

    /**
     * Checks to see if you have permission to run a command.
     * @param {Message} msg The message that is supposed to execute the command. THIS MESSAGE MUST BE SENT IN A GUILD.
     * @param {Command} command The command to check.
     * @param {IRaidGuild} guildHandler The guild document.
     */
    export function checkCommandPerms(msg: Message, command: Command, guildHandler: IRaidGuild): [boolean, boolean] {
        const member: GuildMember = msg.member as GuildMember;
        let hasServerPerms: boolean = member.permissions.has("ADMINISTRATOR")
            ? true
            : command.getGeneralPermissions().length === 0
                ? false
                : command.getGeneralPermissions().every(x => member.hasPermission(x));

        // check to see if the member has role perms
        let hasRolePerms: boolean = false;
        if (command.getRolePermissions().length !== 0 && !member.permissions.has("ADMINISTRATOR")) {
            const allSections: ISection[] = [GuildUtil.getDefaultSection(guildHandler), ...guildHandler.sections];

            // role define
            const raider: string = guildHandler.roles.raider;
            const universalAlmostRaidLeader: string = guildHandler.roles.universalAlmostRaidLeader;
            const universalRaidLeader: string = guildHandler.roles.universalRaidLeader;
            const officer: string = guildHandler.roles.officer;
            const headRaidLeader: string = guildHandler.roles.headRaidLeader;
            const moderator: string = guildHandler.roles.moderator;
            const support: string = guildHandler.roles.support;
            const verifier: string = guildHandler.roles.verifier;
            const suspended: string = guildHandler.roles.suspended;
            // rl
            const roleOrder: [string, RoleNames][] = [
                [moderator, "moderator"],
                [headRaidLeader, "headRaidLeader"],
                [officer, "officer"],
                [universalRaidLeader, "universalRaidLeader"],
            ];

            if (command.getSecRLAccountType().includes("ALL_RL_TYPE")
                || command.getSecRLAccountType().includes("SECTION_RL")) {
                // rl
                for (const sec of allSections) {
                    roleOrder.push([sec.roles.raidLeaderRole, "universalRaidLeader"]);
                }
            }

            roleOrder.push([universalAlmostRaidLeader, "universalAlmostRaidLeader"]);
            if (command.getSecRLAccountType().includes("ALL_RL_TYPE")
                || command.getSecRLAccountType().includes("SECTION_ARL")) {
                // arl
                for (const sec of allSections) {
                    roleOrder.push([sec.roles.almostLeaderRole, "universalAlmostRaidLeader"]);
                }
            }

            if (command.getSecRLAccountType().includes("ALL_RL_TYPE")
                || command.getSecRLAccountType().includes("SECTION_TRL")) {
                // trl
                for (const sec of allSections) {
                    roleOrder.push([sec.roles.trialLeaderRole, "universalAlmostRaidLeader"]); // for now
                }
            }

            // add the rest of the roles.
            roleOrder.push(
                [support, "support"],
                [verifier, "verifier"],
                [raider, "raider"],
                [suspended, "suspended"]
            );

            if (command.isRoleInclusive()) {
                for (let [roleID, roleName] of roleOrder) {
                    if (member.roles.cache.has(roleID)) {
                        hasRolePerms = true;
                        // break out of THIS loop 
                        break;
                    }

                    // we reached the minimum role
                    // break out since we no longer need to check 
                    if (roleName === command.getRolePermissions()[0]) {
                        break;
                    }
                }
            }
            else {
                main: for (let i = 0; i < command.getRolePermissions().length; i++) {
                    for (let [roleID, roleName] of roleOrder) {
                        if (command.getRolePermissions()[i] === roleName
                            && member.roles.cache.has(roleID)) {
                            hasRolePerms = true;
                            break main;
                        }
                    }
                }
            }
        }

        return [hasServerPerms, hasRolePerms];
    }
}