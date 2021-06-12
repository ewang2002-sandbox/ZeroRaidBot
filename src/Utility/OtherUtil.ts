import { Collection, VoiceChannel, Message, GuildMember } from "discord.js";
import { Command } from "../Templates/Command/Command";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { ISection } from "../Templates/ISection";
import { GuildUtil } from "./GuildUtil";
import { RoleNames } from "../Definitions/Types";
import { ArrayUtil } from "./ArrayUtil";

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
     * Waits a certain amount of time before resolving the promise.
     * @param {number} ms The time to wait, in milliseconds. 
     */
    export async function waitFor(ms: number): Promise<void> {
        return new Promise((resolve) => {
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
     * @returns Whether you can run the command.
     */
    export function checkCommandPerms(msg: Message, command: Command, guildHandler: IRaidGuild): boolean {
        const member: GuildMember = msg.member as GuildMember;
        let hasServerPerms: boolean = true;

        for (const perm of command.getGeneralPermissions()) {
            if (!member.hasPermission(perm)) {
                hasServerPerms = false;
            }
        }

        // check to see if the member has role perms
        let hasRolePerms: boolean = true;
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
                [headRaidLeader, "headRaidLeader"]
            ];

            if (command.getSecRLAccountType().includes("ALL_RLS")
                || command.getSecRLAccountType().includes("SECTION_HRL")) {
                // head leader
                for (const sec of allSections) {
                    roleOrder.push([sec.roles.headLeaderRole, "headRaidLeader"]); // for now
                }
            }

            roleOrder.push([officer, "officer"], [universalRaidLeader, "universalRaidLeader"]);

            if (command.getSecRLAccountType().includes("ALL_RLS")
                || command.getSecRLAccountType().includes("SECTION_RL")) {
                // rl
                for (const sec of allSections) {
                    roleOrder.push([sec.roles.raidLeaderRole, "universalRaidLeader"]);
                }
            }

            roleOrder.push([universalAlmostRaidLeader, "universalAlmostRaidLeader"]);
            if (command.getSecRLAccountType().includes("ALL_RLS")
                || command.getSecRLAccountType().includes("SECTION_ARL")) {
                // arl
                for (const sec of allSections) {
                    roleOrder.push([sec.roles.almostLeaderRole, "universalAlmostRaidLeader"]);
                }
            }

            if (command.getSecRLAccountType().includes("ALL_RLS")
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
                [guildHandler.roles.teamRole, "team"],
                [raider, "raider"],
                [suspended, "suspended"]
            );

            let hasPermArr: boolean[] = [];
            if (command.isRoleInclusive()) {
                // Get last possible index to check.
                let lastIdx = -1;
                for (let i = roleOrder.length - 1; i >= 0; i--) {
                    if (roleOrder[i][1] === command.getRolePermissions()[0]) {
                        lastIdx = i;
                        break;
                    }
                }

                // Evaluate perms
                let idx = 0;
                for (let [roleID, _] of roleOrder) {
                    hasPermArr.push(member.roles.cache.has(roleID));
                    // we reached the minimum role
                    // break out since we no longer need to check 
                    if (idx === lastIdx) {
                        break;
                    }

                    idx++;
                }
            }
            // not inclusive
            // you either have it or you dont 
            else {
                for (let i = 0; i < command.getRolePermissions().length; i++) {
                    for (let [roleID, roleName] of roleOrder) {
                        if (command.getRolePermissions()[i] === roleName) {
                            hasPermArr.push(member.roles.cache.has(roleID));
                        }
                    }
                }
            }

            hasRolePerms = hasPermArr.some(x => x);
        }

        if (member.hasPermission("ADMINISTRATOR") || member.permissions.has("ADMINISTRATOR")) {
            return true; 
        }

        if (command.getRolePermissions().length !== 0 && hasRolePerms) {
            return true; 
        }

        if (command.getGeneralPermissions().length !== 0 && hasServerPerms) {
            return true; 
        }

        if (command.getRolePermissions().length === 0 && command.getGeneralPermissions().length === 0) {
            return true;
        }

        return false; 
    }
}