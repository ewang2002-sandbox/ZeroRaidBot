import { Role, Guild } from "discord.js";

export namespace RoleUtil { 
    /**
     * Resolves a role. 
     * @param {Guild} guild The guild. 
     * @param {string} role The role ID.
     * @returns {Role | null} The role, if found. Otherwise, null. :) 
     */
    export function resolveRole(guild: Guild, role: string): Role | null {
        if (guild.roles.cache.has(role)) {
            return guild.roles.cache.get(role) as Role;
        }
        return null;
    }
}