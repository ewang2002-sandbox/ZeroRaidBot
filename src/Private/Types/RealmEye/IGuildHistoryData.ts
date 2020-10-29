import { IBaseRealmEyeResponse } from "./IBaseRealmEyeResponse";

export interface IGuildHistoryData extends IBaseRealmEyeResponse {
    guildHistory: string[];
}

export interface IGuildHistoryEntry {
    guildName: string;
    guildRank: string;
    from: string;
    to: string;
}