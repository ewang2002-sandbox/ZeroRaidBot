/**
 * Represents the possible role types for a guild.
 */
export type RoleNames = "suspended"
    | "raider"
    | "pardonedRaidLeader"
    | "team"
    | "verifier" // lowest "legit" staff role
    | "support"
    | "trialLeader"
    | "universalAlmostRaidLeader"
    | "universalRaidLeader"
    | "officer"
    | "headRaidLeader"
    | "moderator";

export type LeaderPermType = "SECTION_RL"
    | "SECTION_ARL"
    | "SECTION_TRL"
    | "SECTION_RL"
    | "SECTION_HRL"
    | "ALL_RLS";